-- Fichaje FP — hace testeable el cierre automático (Fase 6.2 §23)
--
-- Revisión de la función creada en 20260902211000: se extrae el cálculo
-- DST-seguro de "15:00 Madrid de hoy" a una función pura y separada
-- (`today_business_close_at`), y `close_open_student_punches` pasa a
-- aceptar opcionalmente el instante de referencia (`p_now`), con
-- `default now()` — el job de pg_cron (`select
-- public.close_open_student_punches();`) sigue funcionando exactamente
-- igual, sin cambiar su llamada.
--
-- Motivo: Postgres no permite "viajar en el tiempo" dentro de una sesión
-- de test — no hay forma de comprobar de verdad los escenarios pedidos
-- (14:59 no cierra / 15:00 sí cierra / 18:00 cierra con timestamp 15:00 /
-- DST invierno / DST verano) sin poder decirle a la función "actúa como
-- si el instante actual fuera X". `p_now` es exactamente ese punto de
-- inyección — nunca se expone en ninguna UI, no es un "horario
-- configurable" (explícitamente prohibido en esta fase): es un parámetro
-- de prueba con un valor por defecto que en producción siempre es el
-- reloj real.

drop function if exists public.close_open_student_punches();

create or replace function public.today_business_close_at(p_now timestamptz default now())
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select
    ((p_now at time zone 'Europe/Madrid')::date::timestamp + interval '15 hours')
      at time zone 'Europe/Madrid';
$$;

comment on function public.today_business_close_at(timestamptz) is
  'Las 15:00 hora de Madrid del día de Madrid correspondiente a p_now '
  '(por defecto, ahora), como timestamptz — correcto en CET y en CEST '
  'porque usa el nombre de zona IANA Europe/Madrid, no un offset fijo. '
  'Función pura, sin efectos secundarios: existe también para poder '
  'testear el cálculo DST de forma aislada, pasando instantes concretos.';

revoke all on function public.today_business_close_at(timestamptz)
  from public, anon, authenticated;

create or replace function public.close_open_student_punches(p_now timestamptz default now())
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_business_close timestamptz := public.today_business_close_at(p_now);
  v_today date := (p_now at time zone 'Europe/Madrid')::date;
  v_closed_count integer := 0;
  v_student record;
begin
  if p_now < v_business_close then
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
        continue;
      when others then
        raise warning 'close_open_student_punches: fallo inesperado para user_id=%: %', v_student.id, sqlerrm;
        continue;
    end;
  end loop;

  return v_closed_count;
end;
$$;

comment on function public.close_open_student_punches(timestamptz) is
  'Cierra con un OUT (source=automatic, timestamp=15:00 Europe/Madrid del '
  'día de p_now) cualquier jornada de alumno activo que siga abierta '
  'desde ese mismo día. p_now por defecto es now() — el job de pg_cron lo '
  'invoca sin argumentos. Idempotente y segura frente a concurrencia via '
  'el trigger punches_check_sequence ya existente.';

revoke all on function public.close_open_student_punches(timestamptz)
  from public, anon, authenticated;
