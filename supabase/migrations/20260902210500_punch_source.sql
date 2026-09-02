-- Fichaje FP — origen estructurado del punch (Fase 6.2 §9)
--
-- Necesitamos distinguir un OUT que pulsó el propio alumno de un OUT que
-- generó el cierre automático de las 15:00. Se añade un enum + columna
-- (`source`), nunca texto libre, nunca inferido de `user_agent`/`ip_address`
-- (ambos son nulos en un punch automático, ya que no hay petición HTTP de
-- por medio).
--
-- Los punches ya existentes quedan como `manual` mediante el propio
-- DEFAULT de la columna nueva — no hace falta ningún UPDATE explícito
-- (`ADD COLUMN ... DEFAULT` rellena las filas existentes con ese valor).
--
-- Se aprovecha para endurecer `punches_insert_own`: un alumno (o cualquier
-- petición directa a la Data API con su sesión) nunca puede insertar un
-- punch con `source = 'automatic'` — esa etiqueta solo puede llegar desde
-- la función de mantenimiento (`close_open_student_punches`, ver
-- siguiente migración), que corre como `postgres` y por tanto no está
-- sujeta a esta policy (`postgres` tiene `rolbypassrls = true`, verificado
-- en vivo). No es una comprobación redundante: sin ella, cualquier alumno
-- técnico podría maquillar un OUT manual como si fuera automático (o
-- viceversa) vía una petición directa a la Data API, sin pasar por la
-- Server Action `punch()`.

create type public.punch_source as enum ('manual', 'automatic');

alter table public.punches
  add column source public.punch_source not null default 'manual';

comment on column public.punches.source is
  'Origen del punch: manual (el propio alumno, vía la Server Action '
  'punch()) o automatic (cierre automático de jornada a las 15:00, Fase '
  '6.2). Estructurado a propósito — nunca se infiere de user_agent/ip_address.';

drop policy punches_insert_own on public.punches;

create policy punches_insert_own
  on public.punches
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.user_role()) = 'student'
    and source = 'manual'
  );
