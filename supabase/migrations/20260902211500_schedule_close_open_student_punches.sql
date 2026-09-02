-- Fichaje FP — programa el cierre automático de jornadas (Fase 6.2)
--
-- pg_cron NO tiene una zona horaria por job: todas las expresiones cron
-- de esta instancia se interpretan en UTC (comprobado: la tabla `cron.job`
-- no tiene ninguna columna de timezone — es una GUC de servidor,
-- `cron.timezone`, compartida por todos los jobs, no algo que se pueda
-- fijar por-job desde una migración de este proyecto; y la propia guía de
-- Supabase para pg_cron anota sus ejemplos como horas "(GMT)"). Escribir
-- literalmente `0 15 * * *` fichiaría a las 15:00 UTC = 16:00 (CET) o
-- 17:00 (CEST) hora de Madrid — incorrecto en las dos estaciones.
--
-- La solución no es traducir "15:00 Madrid" a un único cron UTC fijo (se
-- rompería dos veces al año igualmente, y requeriría cambiarlo a mano en
-- cada cambio de hora): en su lugar, el job se ejecuta con frecuencia
-- (cada 5 minutos) dentro de una ventana amplia en UTC que cubre los dos
-- posibles instantes reales de "15:00 Madrid" durante todo el año:
--
--   CET (invierno, UTC+1): 15:00 Madrid = 14:00 UTC
--   CEST (verano,  UTC+2): 15:00 Madrid = 13:00 UTC
--
-- La ventana 12:00–16:59 UTC cubre ambos casos con más de una hora de
-- margen antes y casi 3 horas de margen después (para una ejecución
-- tardía, Fase 6.2 §14). La función `close_open_student_punches()` es
-- quien decide de verdad si "ya son las 15:00 Madrid" y qué timestamp usar
-- — el cron solo garantiza que se le da la oportunidad de comprobarlo con
-- suficiente frecuencia. Las invocaciones que caen antes de las 15:00
-- Madrid, o en un día donde ya no queda nada que cerrar, son no-op
-- baratos (una sola consulta contra `latest_punches`, normalmente sin
-- filas).
--
-- Se ejecuta como `postgres` (rol que crea el job en esta migración,
-- también verificado como el rol bajo el que corre por defecto un job de
-- pg_cron sin `username` explícito) — el mismo rol que ya tiene
-- `rolbypassrls = true`, así que ve y cierra las jornadas de todos los
-- alumnos sin depender de ningún grant adicional.

select cron.schedule(
  'close_open_student_punches',
  '*/5 12-16 * * *',
  $$select public.close_open_student_punches();$$
);
