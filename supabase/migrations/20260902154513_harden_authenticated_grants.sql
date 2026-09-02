-- Fichaje FP — endurecer grants de `authenticated` (auditoria Fase 2.5)
--
-- Hallazgo: Supabase concede por defecto (ALTER DEFAULT PRIVILEGES,
-- configurado por el propio proyecto al aprovisionarse) TODOS los
-- privilegios de tabla (select/insert/update/delete/truncate/references/
-- trigger) a `anon` y `authenticated` en cuanto se crea una tabla nueva en
-- `public`. La migracion de RLS revoco esto de `anon`, pero para
-- `authenticated` solo añadio los grants que creiamos necesarios sin antes
-- revocar los que ya tenia por defecto: en la practica `authenticated` se
-- quedo con CRUD completo a nivel de tabla en las tres tablas, sin
-- ejercerse hoy solo porque RLS no define policy de UPDATE/DELETE en
-- profiles/audit_logs (ni de UPDATE/DELETE en punches). No es explotable
-- ahora mismo, pero rompe el principio de menor privilegio: si alguna vez
-- RLS se deshabilitara por error en una de estas tablas, este grant amplio
-- seria la unica barrera restante, y no bloquearia nada.

revoke all on public.profiles, public.punches, public.audit_logs from authenticated;

grant select on public.profiles to authenticated;
grant select, insert on public.punches to authenticated;
grant select on public.audit_logs to authenticated;

-- Evita que la proxima tabla que creemos (Fase 3+) herede el mismo grant
-- amplio por defecto: las tablas nuevas en `public` creadas por el rol que
-- ejecuta las migraciones ya no concederan nada a `anon`/`authenticated`
-- automaticamente; cada migracion futura debe conceder explicitamente lo
-- que necesite, igual que aqui.
alter default privileges for role postgres in schema public
  revoke all on tables from authenticated, anon;
