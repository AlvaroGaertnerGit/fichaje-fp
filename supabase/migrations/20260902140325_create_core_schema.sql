-- Fichaje FP — esquema base
--
-- Nota importante (Next.js 16 / Supabase, 2026): los esquemas `auth`, `storage`
-- y `realtime` están restringidos desde el 21-04-2025 (no se pueden crear ni
-- eliminar tablas/funciones en ellos). Por eso NO usamos el patrón clásico de
-- "trigger en auth.users que crea la fila en profiles": la fila de `profiles`
-- se crea explícitamente desde el servidor (Fase 7, con la Admin API) en el
-- mismo flujo que crea el usuario en `auth.users`, nunca mediante un trigger.

-- ============================================================================
-- ENUMS
-- ============================================================================

create type public.user_role as enum ('student', 'teacher', 'admin');

create type public.punch_type as enum ('IN', 'OUT');

-- ============================================================================
-- PROFILES
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.user_role not null default 'student',
  class_group text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Datos de perfil de cada usuario (alumno, profesor o admin). id = auth.users.id. '
  'email se mantiene sincronizado por la aplicacion (no por trigger) al crear el usuario.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ============================================================================
-- PUNCHES
-- ============================================================================

create table public.punches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  type public.punch_type not null,
  "timestamp" timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.punches is
  'Registros de fichaje (entrada/salida). El estado actual de un alumno se '
  'deriva siempre consultando el ultimo punch, nunca se almacena en profiles.';

-- Consulta más frecuente: historial de un usuario ordenado por fecha, y
-- "último punch de un usuario" para calcular el estado actual.
create index punches_user_id_timestamp_idx
  on public.punches (user_id, "timestamp" desc);

-- ----------------------------------------------------------------------------
-- Integridad de secuencia (evita IN,IN u OUT,OUT por doble click o peticiones
-- simultáneas). Ver decisión documentada en el informe de la Fase 1: se
-- resuelve en base de datos, no solo en el cliente/Server Action.
--
-- pg_advisory_xact_lock serializa, por user_id, las transacciones que insertan
-- un punch para ese usuario: la segunda petición concurrente espera a que la
-- primera confirme (o revierta) antes de leer "cuál fue el último punch",
-- por lo que no puede colarse una secuencia inválida.
-- ----------------------------------------------------------------------------

create or replace function public.check_punch_sequence()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  last_type public.punch_type;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  select p.type into last_type
  from public.punches p
  where p.user_id = new.user_id
  order by p.created_at desc
  limit 1;

  if last_type is null and new.type <> 'IN' then
    raise exception 'invalid_punch_sequence: el primer fichaje debe ser IN'
      using errcode = '23514';
  elsif last_type = 'IN' and new.type <> 'OUT' then
    raise exception 'invalid_punch_sequence: el usuario ya está dentro (WORKING), el siguiente fichaje debe ser OUT'
      using errcode = '23514';
  elsif last_type = 'OUT' and new.type <> 'IN' then
    raise exception 'invalid_punch_sequence: el usuario ya está fuera (OUTSIDE), el siguiente fichaje debe ser IN'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger punches_check_sequence
  before insert on public.punches
  for each row
  execute function public.check_punch_sequence();

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  action text not null,
  target_user_id uuid references public.profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_check check (
    action in (
      'punch_corrected',
      'user_created',
      'user_deactivated',
      'user_reactivated',
      'role_changed'
    )
  )
);

comment on table public.audit_logs is
  'Auditoria de acciones administrativas (profesor/admin). user_id = quien '
  'ejecuta la accion, target_user_id = usuario afectado (si aplica). '
  'La lista de valores permitidos en action se amplia via migracion cuando '
  'una fase futura la necesite.';

create index audit_logs_user_id_created_at_idx
  on public.audit_logs (user_id, created_at desc);

create index audit_logs_target_user_id_created_at_idx
  on public.audit_logs (target_user_id, created_at desc);
