-- Fichaje FP — funciones administrativas atómicas (Fase 6.1)
--
-- Tres funciones SECURITY DEFINER para las únicas escrituras que la Fase
-- 6.1 necesita sobre `profiles`/`audit_logs`: crear perfil, cambiar rol,
-- activar/desactivar. Cada una hace su UPDATE/INSERT de `profiles` y su
-- INSERT de `audit_logs` dentro del cuerpo de la función — una llamada a
-- función es una única transacción implícita, así que ambas escrituras son
-- atómicas por construcción (Fase 6.0 §11): si cualquiera falla, Postgres
-- revierte las dos, sin necesitar código de compensación en JS.
--
-- No se añade ninguna policy de RLS de escritura para `authenticated` en
-- `profiles`/`audit_logs` (decisión aprobada, Fase 6.0 §12): siguen
-- completamente cerradas. La única vía de escritura es esta función,
-- invocada vía `.rpc()` únicamente por el cliente con la Secret Key
-- (createAdminClient(), server-only) desde una Server Action que ya
-- comprobó `requireRole(['admin'])` antes de llamar — y cada función
-- vuelve a comprobar por sí misma que el actor es admin activo, como
-- segunda capa independiente de esa comprobación (nunca confía solo en
-- que quien la invoca ya lo verificó).
--
-- Igual que las funciones no pueden vivir en el esquema `private` (.rpc()
-- de supabase-js solo alcanza esquemas expuestos a PostgREST, típicamente
-- `public`), la barrera correcta no es esconderlas sino revocar EXECUTE
-- explícitamente de PUBLIC/anon/authenticated y concederlo solo a
-- service_role — exactamente la lección que ya dejó documentada
-- 20260902154513_harden_authenticated_grants.sql sobre no confiar en los
-- grants por defecto de Supabase.

-- ============================================================================
-- admin_create_profile — mitad-BD del alta de usuario por Admin
-- (la mitad Auth API, auth.users, no puede ser parte de esta transacción:
-- es un sistema distinto — ver Fase 6.0 §4/§11-B, se resuelve en la Server
-- Action con compensación explícita si esta función falla)
-- ============================================================================

create or replace function public.admin_create_profile(
  p_actor_id uuid,
  p_target_id uuid,
  p_name text,
  p_email text,
  p_role public.user_role,
  p_degree public.degree,
  p_course public.course,
  p_ip inet
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role public.user_role;
  v_actor_active boolean;
  v_profile public.profiles;
begin
  select role, active into v_actor_role, v_actor_active
  from public.profiles
  where id = p_actor_id;

  if v_actor_role is distinct from 'admin' or v_actor_active is not true then
    raise exception 'not_authorized: el actor no es un admin activo'
      using errcode = '42501';
  end if;

  -- Nunca 'admin': esta función estructuralmente no puede crear otro
  -- admin, sea cual sea el valor que llegue como parámetro (Fase 6.0 §3).
  if p_role not in ('student', 'teacher') then
    raise exception 'invalid_role: solo se pueden crear usuarios student o teacher'
      using errcode = '22023';
  end if;

  insert into public.profiles (id, name, email, role, active, degree, course)
  values (p_target_id, p_name, p_email, p_role, true, p_degree, p_course)
  returning * into v_profile;

  insert into public.audit_logs (user_id, action, target_user_id, metadata, ip_address)
  values (
    p_actor_id,
    'user_created',
    p_target_id,
    jsonb_build_object('role', p_role, 'degree', p_degree, 'course', p_course),
    p_ip
  );

  return v_profile;
end;
$$;

comment on function public.admin_create_profile(uuid, uuid, text, text, public.user_role, public.degree, public.course, inet) is
  'Inserta profile + audit log (user_created) en una única transacción. '
  'p_role está restringido a student|teacher a nivel de código (no solo de '
  'tipo): no existe forma de crear un admin con esta función. Solo '
  'invocable por service_role — ver GRANT al final del archivo.';

revoke all on function public.admin_create_profile(uuid, uuid, text, text, public.user_role, public.degree, public.course, inet)
  from public, anon, authenticated;
grant execute on function public.admin_create_profile(uuid, uuid, text, text, public.user_role, public.degree, public.course, inet)
  to service_role;

-- ============================================================================
-- admin_change_role — cambio de rol (student<->teacher, o admin degradando
-- a otro admin/staff), con guardas de auto-modificación y último admin
-- ============================================================================

create or replace function public.admin_change_role(
  p_actor_id uuid,
  p_target_id uuid,
  p_new_role public.user_role,
  p_ip inet,
  p_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role public.user_role;
  v_actor_active boolean;
  v_old_role public.user_role;
  v_target_found boolean;
  v_other_active_admins int;
  v_result public.profiles;
begin
  select role, active into v_actor_role, v_actor_active
  from public.profiles
  where id = p_actor_id;

  if v_actor_role is distinct from 'admin' or v_actor_active is not true then
    raise exception 'not_authorized: el actor no es un admin activo'
      using errcode = '42501';
  end if;

  -- Un admin no puede cambiar su propio rol (Fase 6.0 §6, regla 1).
  if p_target_id = p_actor_id then
    raise exception 'self_role_change_forbidden: un admin no puede cambiar su propio rol'
      using errcode = '42501';
  end if;

  -- No se puede crear un admin desde esta función bajo ningún supuesto
  -- (Fase 6.0 §3) — ni siquiera "otro admin promoviendo a alguien".
  if p_new_role = 'admin' then
    raise exception 'admin_creation_forbidden: no se puede asignar el rol admin'
      using errcode = '42501';
  end if;

  -- Serializa, específicamente, las operaciones que puedan reducir el
  -- número de admins activos — no un lock global sobre todas las
  -- operaciones de usuarios (Fase 6.0 §14-B). Se libera solo al confirmar
  -- o revertir la transacción (pg_advisory_xact_lock).
  perform pg_advisory_xact_lock(hashtext('fichaje_admin_count_guard'));

  select role into v_old_role
  from public.profiles
  where id = p_target_id
  for update;
  v_target_found := found;

  if not v_target_found then
    raise exception 'target_not_found: el usuario objetivo no existe'
      using errcode = 'P0002';
  end if;

  -- Regla del último admin (Fase 6.0 §6, regla 4 / §15 aprobada): si el
  -- objetivo es admin y deja de serlo, tiene que quedar al menos otro
  -- admin activo aparte de él.
  if v_old_role = 'admin' then
    select count(*) into v_other_active_admins
    from public.profiles
    where role = 'admin' and active = true and id <> p_target_id;

    if v_other_active_admins < 1 then
      raise exception 'last_admin_guard: no se puede dejar el sistema sin ningun administrador activo'
        using errcode = '42501';
    end if;
  end if;

  update public.profiles
  set role = p_new_role
  where id = p_target_id
  returning * into v_result;

  insert into public.audit_logs (user_id, action, target_user_id, metadata, ip_address)
  values (
    p_actor_id,
    'role_changed',
    p_target_id,
    jsonb_strip_nulls(jsonb_build_object('from', v_old_role, 'to', p_new_role, 'reason', p_reason)),
    p_ip
  );

  return v_result;
end;
$$;

comment on function public.admin_change_role(uuid, uuid, public.user_role, inet, text) is
  'UPDATE profiles.role + INSERT audit_logs (role_changed) atómico. '
  'Guardas: actor debe ser admin activo, target != actor, new_role nunca '
  'admin, y nunca deja el sistema sin ningún admin activo (advisory lock '
  'fichaje_admin_count_guard). Solo invocable por service_role.';

revoke all on function public.admin_change_role(uuid, uuid, public.user_role, inet, text)
  from public, anon, authenticated;
grant execute on function public.admin_change_role(uuid, uuid, public.user_role, inet, text)
  to service_role;

-- ============================================================================
-- admin_set_active — activar/desactivar, con las mismas guardas
-- ============================================================================

create or replace function public.admin_set_active(
  p_actor_id uuid,
  p_target_id uuid,
  p_active boolean,
  p_ip inet,
  p_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role public.user_role;
  v_actor_active boolean;
  v_target_role public.user_role;
  v_target_found boolean;
  v_other_active_admins int;
  v_result public.profiles;
  v_action text;
begin
  select role, active into v_actor_role, v_actor_active
  from public.profiles
  where id = p_actor_id;

  if v_actor_role is distinct from 'admin' or v_actor_active is not true then
    raise exception 'not_authorized: el actor no es un admin activo'
      using errcode = '42501';
  end if;

  -- Un admin no puede desactivarse a sí mismo (Fase 6.0 §6, regla 2).
  if p_target_id = p_actor_id and p_active = false then
    raise exception 'self_deactivation_forbidden: un admin no puede desactivar su propia cuenta'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('fichaje_admin_count_guard'));

  select role into v_target_role
  from public.profiles
  where id = p_target_id
  for update;
  v_target_found := found;

  if not v_target_found then
    raise exception 'target_not_found: el usuario objetivo no existe'
      using errcode = 'P0002';
  end if;

  if v_target_role = 'admin' and p_active = false then
    select count(*) into v_other_active_admins
    from public.profiles
    where role = 'admin' and active = true and id <> p_target_id;

    if v_other_active_admins < 1 then
      raise exception 'last_admin_guard: no se puede dejar el sistema sin ningun administrador activo'
        using errcode = '42501';
    end if;
  end if;

  update public.profiles
  set active = p_active
  where id = p_target_id
  returning * into v_result;

  v_action := case when p_active then 'user_reactivated' else 'user_deactivated' end;

  insert into public.audit_logs (user_id, action, target_user_id, metadata, ip_address)
  values (
    p_actor_id,
    v_action,
    p_target_id,
    jsonb_strip_nulls(jsonb_build_object('reason', p_reason)),
    p_ip
  );

  return v_result;
end;
$$;

comment on function public.admin_set_active(uuid, uuid, boolean, inet, text) is
  'UPDATE profiles.active + INSERT audit_logs (user_deactivated/'
  'user_reactivated) atómico. Guardas: actor debe ser admin activo, no '
  'auto-desactivación, y nunca deja el sistema sin ningún admin activo. '
  'Solo invocable por service_role.';

revoke all on function public.admin_set_active(uuid, uuid, boolean, inet, text)
  from public, anon, authenticated;
grant execute on function public.admin_set_active(uuid, uuid, boolean, inet, text)
  to service_role;
