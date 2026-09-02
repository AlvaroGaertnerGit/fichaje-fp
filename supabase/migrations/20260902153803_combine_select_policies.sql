-- Fichaje FP — consolidar policies de SELECT
--
-- El advisor de rendimiento de Supabase marca "multiple_permissive_policies"
-- en profiles y punches: tener dos policies permisivas ("select_own" +
-- "select_staff") para el mismo rol/accion obliga a Postgres a evaluar
-- ambas en cada consulta. Se combinan en una sola policy por tabla con OR,
-- mismo acceso efectivo, sin el coste doble. audit_logs no lo necesita:
-- solo tiene una policy de SELECT.

drop policy profiles_select_own on public.profiles;
drop policy profiles_select_staff on public.profiles;

create policy profiles_select
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select private.user_role()) in ('teacher', 'admin')
  );

drop policy punches_select_own on public.punches;
drop policy punches_select_staff on public.punches;

create policy punches_select
  on public.punches
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.user_role()) in ('teacher', 'admin')
  );
