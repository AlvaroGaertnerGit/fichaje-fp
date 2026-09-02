-- Fichaje FP — vista del último punch por usuario (Fase 5, Teacher)
--
-- El dashboard de profesor necesita "el estado actual de cada alumno" sin
-- caer en N+1 queries (una por alumno). Esto es exactamente el patrón
-- "última fila por grupo" de Postgres: DISTINCT ON + ORDER BY, indexado.
--
-- security_invoker = true (obligatorio, Postgres 15+): sin esto la vista se
-- ejecutaria con los privilegios de quien la creo (postgres) y se saltaria
-- RLS por completo para cualquiera que la consulte. Con invoker=true hereda
-- el RLS de `punches` tal cual: un alumno que la consultase solo veria su
-- propia fila (policy punches_select), un teacher/admin las ve todas —
-- ninguna via nueva de acceso, mismo modelo de siempre.

create index punches_user_id_created_at_idx
  on public.punches (user_id, created_at desc);

create view public.latest_punches
with (security_invoker = true)
as
select distinct on (user_id)
  id,
  user_id,
  type,
  "timestamp",
  created_at
from public.punches
order by user_id, created_at desc;

comment on view public.latest_punches is
  'Último punch de cada usuario (por created_at, igual criterio que check_punch_sequence). '
  'security_invoker = true: hereda el RLS de punches, no lo bypassa. '
  'Usada por el dashboard de profesor para derivar WORKING/OUTSIDE sin N+1 queries.';

grant select on public.latest_punches to authenticated;
