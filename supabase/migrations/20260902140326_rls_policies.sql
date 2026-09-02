-- Fichaje FP — Row Level Security
--
-- Principios (ver informe Fase 1, seccion C):
--   * Ninguna policy usa `using (true)`.
--   * Toda policy explícita usa `to authenticated` + un predicado de
--     propiedad/rol (nunca solo `to authenticated`, que es autenticación sin
--     autorización).
--   * El rol del usuario actual se obtiene mediante una función
--     SECURITY DEFINER en un esquema `private` NO expuesto a la Data API,
--     con `search_path` fijado a vacío y con `auth.uid()` embebido en su
--     propio cuerpo (no recibe el user_id como parámetro), para que no pueda
--     usarse para consultar el rol de otra persona.
--   * Las tablas solo tienen las policies que la aplicación necesita HOY.
--     Escritura de profiles/audit_logs y corrección de punches se hará en
--     fases futuras (7 y 6) con su propio diseño de policy — ver "Próximo
--     paso" en el informe.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.user_role()
returns public.user_role
language sql
security definer
stable
set search_path = ''
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

revoke all on function private.user_role() from public, anon;
grant execute on function private.user_role() to authenticated;

comment on function private.user_role() is
  'Devuelve el role del usuario autenticado actual (siempre auth.uid(), '
  'nunca un id arbitrario). SECURITY DEFINER para evitar recursion de RLS '
  'al consultar profiles desde sus propias policies. No exponer en public.';

-- ============================================================================
-- EXPOSICIÓN A LA DATA API
--
-- Desde 2026 los proyectos nuevos de Supabase ya no exponen automáticamente
-- las tablas de `public` a la Data API (ver changelog, exigencia total desde
-- 30-10-2026): hay que conceder GRANT explícito. No hay acceso anónimo en
-- esta app, así que solo se concede a `authenticated`; RLS sigue siendo la
-- barrera real fila a fila.
-- ============================================================================

revoke all on public.profiles, public.punches, public.audit_logs from anon;

grant select on public.profiles to authenticated;
grant select, insert on public.punches to authenticated;
grant select on public.audit_logs to authenticated;

-- ============================================================================
-- PROFILES
-- ============================================================================

alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_staff
  on public.profiles
  for select
  to authenticated
  using ((select private.user_role()) in ('teacher', 'admin'));

-- Sin policies de insert/update/delete: profiles se crea y modifica
-- exclusivamente desde servidor con la Secret Key (bypassa RLS), nunca desde
-- un cliente autenticado normal. Ver seccion E del informe.

-- ============================================================================
-- PUNCHES
-- ============================================================================

alter table public.punches enable row level security;

create policy punches_select_own
  on public.punches
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy punches_select_staff
  on public.punches
  for select
  to authenticated
  using ((select private.user_role()) in ('teacher', 'admin'));

create policy punches_insert_own
  on public.punches
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Sin policy de update/delete todavia: la correccion de fichajes (Fase 6)
-- necesita quedar auditada en la misma operacion, se diseñara junto con esa
-- fase para no abrir una via de escritura sin auditoria.

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

alter table public.audit_logs enable row level security;

create policy audit_logs_select_staff
  on public.audit_logs
  for select
  to authenticated
  using ((select private.user_role()) in ('teacher', 'admin'));

-- Sin policy de insert todavia: se diseñara en la Fase 6/7 junto a las
-- acciones que la generan (correccion de fichajes, gestion de usuarios).
