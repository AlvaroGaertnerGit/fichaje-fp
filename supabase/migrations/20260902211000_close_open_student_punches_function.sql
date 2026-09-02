-- Fichaje FP — cierre automático de jornadas abiertas (Fase 6.2)
--
-- Regla de negocio: todos los días, a las 15:00 hora de Madrid, cualquier
-- alumno activo cuya última jornada siga abierta (último punch = IN,
-- abierto HOY) recibe un OUT automático con timestamp = 15:00 Madrid de
-- hoy — nunca la hora real en la que esta función llegó a ejecutarse.
--
-- ============================================================================
-- Por qué las 15:00 Madrid se calculan así (DST, Fase 6.2 §3/§8)
-- ============================================================================
-- La base de datos de este proyecto tiene `timezone = UTC` (comprobado en
-- vivo: `show timezone` -> UTC). "15:00 Madrid" NO es un offset fijo: en
-- CET (invierno) Madrid = UTC+1, en CEST (verano) Madrid = UTC+2. Usar un
-- offset fijo (p.ej. sumar/restar 1h o 2h a mano) rompería dos veces al
-- año, exactamente el error que esta fase pide evitar explícitamente.
--
-- La expresión correcta usa el nombre de zona IANA `Europe/Madrid`, que
-- Postgres resuelve contra tzdata (incluye las reglas de cambio de hora
-- reales, no un offset fijo):
--
--   (hoy_en_Madrid::timestamp + interval '15 hours') at time zone 'Europe/Madrid'
--
-- 1. `now() at time zone 'Europe/Madrid'` convierte el instante actual a
--    la hora de pared en Madrid (timestamp sin zona).
-- 2. Se trunca a la fecha de Madrid y se le suman 15 horas: "hoy a las
--    15:00", todavía como hora de pared sin zona.
-- 3. Volver a aplicar `at time zone 'Europe/Madrid'` a esa hora de pared
--    la reinterpreta como "esa hora, en Madrid" y la convierte al instante
--    UTC real — automáticamente +1h o +2h según corresponda ese día
--    concreto. Verificado en vivo contra el proyecto real para ambos
--    casos (ver informe de la fase).
--
-- ============================================================================
-- Por qué "jornada abierta" se limita a HOY (Fase 6.2 §15)
-- ============================================================================
-- Si esta función se ejecuta todos los días, cualquier IN abierto ya se
-- cierra en su propio día — por construcción nunca debería quedar un IN
-- abierto de hace varios días. Aun así, se filtra explícitamente
-- `(último_punch.timestamp at time zone 'Europe/Madrid')::date = hoy_en_Madrid`
-- para que una anomalía histórica (un IN antiguo que por lo que sea nunca
-- se cerró — p.ej. una caída prolongada del propio cron) nunca se
-- convierta en un OUT automático "de hoy". Si ese caso llega a darse, la
-- función simplemente no lo toca — queda como corrección manual, fuera de
-- alcance de esta fase (ver limitación documentada en supabase/README.md).
--
-- ============================================================================
-- Idempotencia y concurrencia (Fase 6.2 §11/§12/§13)
-- ============================================================================
-- No se reinventa ningún mecanismo nuevo: cada INSERT de esta función pasa
-- por el trigger `punches_check_sequence` ya existente, que:
--   1. Toma `pg_advisory_xact_lock` por user_id (serializa cualquier
--      inserción concurrente para ese mismo alumno, sea manual o
--      automática).
--   2. Rechaza (SQLSTATE 23514, check_violation) un OUT si el último punch
--      ya es OUT.
-- Por eso una ejecución repetida, una ejecución concurrente, o una carrera
-- contra un OUT manual (alumno ficha justo antes/después de las 15:00)
-- nunca puede producir dos OUT automáticos ni un OUT tras otro OUT — el
-- propio motor de punches ya lo garantiza. Esta función solo necesita
-- capturar esa excepción esperada por alumno, sin abortar el resto del
-- lote (cada alumno se procesa en su propio sub-bloque BEGIN/EXCEPTION).
--
-- ============================================================================
-- Permisos (Fase 6.2 §17)
-- ============================================================================
-- SECURITY INVOKER (el valor por defecto, no se fuerza DEFINER): esta
-- función siempre se invoca como `postgres` (el propio cron job corre con
-- ese rol — ver migración de scheduling), y `postgres` ya tiene
-- `rolbypassrls = true` (comprobado en vivo), así que no hace falta ceder
-- privilegios adicionales vía SECURITY DEFINER. Si, por lo que fuera, esta
-- función se invocara como un usuario normal (`authenticated`), sus
-- propias policies de RLS (incluida la restricción `source = 'manual'` de
-- la migración anterior) seguirían aplicando con normalidad — un alumno
-- no podría usar esta función para colarse un OUT automático ni para ver
-- las jornadas de otros alumnos. Aun así, `EXECUTE` se revoca
-- explícitamente de `PUBLIC`/`anon`/`authenticated` al final de este
-- archivo: nadie debe poder invocar el cierre global desde el cliente,
-- ni siquiera para intentarlo.

create or replace function public.close_open_student_punches()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_today date;
  v_business_close timestamptz;
  v_closed_count integer := 0;
  v_student record;
begin
  v_today := (now() at time zone 'Europe/Madrid')::date;
  v_business_close := (v_today::timestamp + interval '15 hours') at time zone 'Europe/Madrid';

  -- Todavía no ha llegado la hora de negocio de hoy: no hacer nada. Esto
  -- protege también una invocación manual/de prueba fuera de horario.
  if now() < v_business_close then
    return 0;
  end if;

  for v_student in
    select p.id
    from public.profiles p
    join public.latest_punches lp on lp.user_id = p.id
    where p.role = 'student'
      and p.active = true
      and lp.type = 'IN'
      and (lp.timestamp at time zone 'Europe/Madrid')::date = v_today
  loop
    begin
      insert into public.punches (user_id, type, "timestamp", source)
      values (v_student.id, 'OUT', v_business_close, 'automatic');
      v_closed_count := v_closed_count + 1;
    exception
      when check_violation then
        -- El trigger ya rechazó este OUT porque el alumno ya estaba
        -- cerrado (carrera con un OUT manual, o ejecución duplicada del
        -- propio job) — se ignora esta fila, se sigue con las demás.
        continue;
      when others then
        -- Un fallo aislado e inesperado en un alumno no debe impedir que
        -- se cierre el resto del lote.
        raise warning 'close_open_student_punches: fallo inesperado para user_id=%: %', v_student.id, sqlerrm;
        continue;
    end;
  end loop;

  return v_closed_count;
end;
$$;

comment on function public.close_open_student_punches() is
  'Cierra con un OUT (source=automatic, timestamp=15:00 Europe/Madrid de '
  'hoy) cualquier jornada de alumno activo que siga abierta desde hoy. '
  'Idempotente y segura frente a concurrencia via el trigger '
  'punches_check_sequence ya existente. Pensada para ser invocada por el '
  'job de pg_cron (ver migración de scheduling), nunca desde el cliente.';

revoke all on function public.close_open_student_punches()
  from public, anon, authenticated;
