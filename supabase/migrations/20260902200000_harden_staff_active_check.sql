-- Fichaje FP — private.user_role() deja de dar privilegios a staff inactivo
-- (Fase 6.0 §7/§19.5, decisión aprobada explícitamente para la Fase 6.1)
--
-- Hallazgo de la Fase 6.0: `private.user_role()` devolvía el rol de
-- auth.uid() sin comprobar `active`. Las policies de profiles_select,
-- punches_select y punches_insert_own la usan tal cual, así que un
-- teacher/admin desactivado con un access token todavía válido (no
-- expirado) seguiría obteniendo privilegios de staff vía RLS aunque
-- requireRole() ya le bloquee el renderizado de cualquier página — el
-- primero es un hueco real (nada impide una consulta directa fuera del
-- flujo normal de la app), el segundo es solo una redirección optimista.
--
-- Fix: añadir `and active = true` a la única fuente que consultan esas
-- tres policies. No hace falta tocar ninguna policy — CREATE OR REPLACE
-- FUNCTION conserva sus grants y las policies existentes heredan el nuevo
-- comportamiento automáticamente.
--
-- Efecto en cada policy que la usa:
--   profiles_select      -> id=auth.uid() sigue viendo su propia fila
--                            (rama independiente de esta función); la rama
--                            de staff deja de aplicar si active=false.
--   punches_select        -> mismo patrón.
--   punches_insert_own    -> user_id=auth.uid() AND user_role()='student':
--                            un alumno inactivo con NULL aquí nunca iguala
--                            'student', así que además cierra en RLS (no
--                            solo en la Server Action `punch()`) el caso de
--                            alumno desactivado que intenta fichar con un
--                            token todavío válido — refuerzo, no regresión.

create or replace function private.user_role()
returns public.user_role
language sql
security definer
stable
set search_path = ''
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and active = true;
$$;

comment on function private.user_role() is
  'Devuelve el role del usuario autenticado actual (siempre auth.uid(), '
  'nunca un id arbitrario), o NULL si no existe o está desactivado '
  '(active=false nunca da privilegios de staff vía RLS, Fase 6.0 §7). '
  'SECURITY DEFINER para evitar recursion de RLS al consultar profiles '
  'desde sus propias policies. No exponer en public.';
