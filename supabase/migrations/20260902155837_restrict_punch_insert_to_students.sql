-- Fichaje FP — restringir INSERT de punches a alumnos (Fase 3)
--
-- Hasta ahora `punches_insert_own` solo comprobaba `user_id = auth.uid()`:
-- cualquier usuario autenticado (incluido teacher/admin) podia crear un
-- punch para si mismo via la Data API directamente, sin pasar por la
-- Server Action de fichaje. En esta fase solo el alumno puede fichar
-- (CLAUDE.md §4), y esa restriccion debe existir en mas de una capa (la
-- Server Action la comprueba, pero RLS es quien realmente decide que se
-- escribe en la base de datos pase lo que pase en la capa de aplicacion).
--
-- Si en el futuro decidimos que teacher/admin tambien fichan, este es el
-- unico sitio que hay que tocar (una migracion nueva), no un cambio de
-- arquitectura.

drop policy punches_insert_own on public.punches;

create policy punches_insert_own
  on public.punches
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.user_role()) = 'student'
  );
