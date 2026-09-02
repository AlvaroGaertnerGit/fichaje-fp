-- Fichaje FP — degree/course estructurados en profiles (Fase 5.5)
--
-- Reconstrucción del archivo local para esta migración, que ya estaba
-- aplicada en el proyecto remoto (detectado durante la inspección de la
-- Fase 6.0: `supabase/migrations/` no la tenía, pero
-- `supabase migration list` sí — desviación entre repo y proyecto real).
-- El DDL de abajo reproduce fielmente el estado ya presente en la base de
-- datos (columnas, tipos y valores de enum verificados en vivo contra el
-- proyecto), para que el historial de migraciones vuelva a ser la única
-- fuente de verdad reproducible que documenta supabase/README.md.
--
-- Sustituye el `class_group` de texto libre que contemplaba el diseño
-- inicial por dos enums (grado, curso): permite filtrar/agrupar sin
-- parsear una cadena combinada. Nulos para teacher/admin (no tienen grado
-- ni curso académico). `src/lib/academic.ts` es la fuente única de verdad
-- de los valores permitidos y de qué combinaciones existen realmente
-- (p.ej. ASIR solo tiene 1º) — no se duplica esa regla aquí como CHECK.

create type public.degree as enum ('SMR', 'ASIR');

create type public.course as enum ('1', '2');

alter table public.profiles
  add column degree public.degree,
  add column course public.course;
