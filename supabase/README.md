# Supabase — Fichaje FP

## Conectarse a un proyecto

1. Crear un proyecto en [supabase.com](https://supabase.com) (o usar uno existente).
2. Copiar `.env.example` a `.env.local` y rellenar con **Settings → API Keys**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clave pública, empieza por `sb_publishable_`)
   - `SUPABASE_SECRET_KEY` (clave secreta, **solo servidor**; usada en `src/lib/supabase/admin.ts` para crear el `profile` tras el registro público de alumnos)
3. Enlazar el proyecto para poder aplicar migraciones y regenerar tipos:
   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   ```

## Reproducir el esquema

El esquema completo vive en `supabase/migrations/` (SQL versionado, no hay
cambios hechos a mano en el dashboard). Para aplicarlo:

```bash
# Contra un proyecto remoto ya enlazado:
supabase db push

# O en local (requiere Docker):
supabase start
supabase db reset
```

Tras aplicar cambios, ejecutar `supabase db advisors` (o el equivalente MCP
`get_advisors`) para detectar problemas de seguridad/rendimiento antes de dar
la migración por buena.

## Regenerar los tipos TypeScript

`src/types/database.ts` está mantenido a mano mientras no hay proyecto
enlazado. En cuanto exista uno, regenerar y sustituir el archivo entero:

```bash
supabase gen types typescript --linked > src/types/database.ts
# o, trabajando en local:
supabase gen types typescript --local  > src/types/database.ts
```

`src/types/index.ts` reexporta alias de conveniencia (`Profile`, `Punch`,
`AuditLog`, `UserRole`, `PunchType`) derivados de `Database`, así que no hace
falta tocarlo al regenerar.

## Nota operativa: envío de email (confirmación de cuenta)

El proyecto tiene activada la confirmación de email en Supabase Auth. Con el
proveedor de email por defecto de Supabase (compartido, sin SMTP propio
configurado), el límite de envío es muy bajo — se ha observado
`over_email_send_rate_limit` con solo un puñado de altas en poco tiempo. Esto
es una limitación de la configuración del proyecto, no del código: antes de
manejar registros reales de alumnos hace falta configurar un proveedor SMTP
propio en **Authentication → Settings → SMTP Settings** en el dashboard de
Supabase.

## Decisiones de esquema a tener en cuenta

- **Sin trigger en `auth.users`**: desde el 21-04-2025 Supabase restringe la
  creación de triggers/funciones en los esquemas `auth`, `storage` y
  `realtime`. La fila de `profiles` se crea explícitamente desde el servidor
  (Admin API / Secret Key, `src/lib/supabase/admin.ts`) en el mismo flujo
  que crea el usuario en `auth.users`, nunca mediante un trigger. Implementado
  en Fase 5.5 para el registro público de alumnos (`src/app/(auth)/registro`):
  `profiles` no tiene policy de INSERT para `authenticated` a propósito — la
  única vía de escritura es este flujo de servidor, con `role`/`active`
  fijados en código (`src/lib/auth/register.ts`), nunca leídos del cliente.
- **`degree`/`course` estructurados (Fase 5.5)**: dos enums (`public.degree`:
  SMR/ASIR; `public.course`: '1'/'2') en vez de un `class_group` de texto
  libre — permite filtrar/agrupar por grado y curso sin parsear una cadena
  combinada. `src/lib/academic.ts` es la fuente única de verdad de los
  valores permitidos (usada tanto por el `<select>` de /registro como por la
  validación de servidor).
- **Rol del usuario actual**: `private.user_role()` (`SECURITY DEFINER`,
  esquema `private` no expuesto a la Data API) evita la recursión de RLS al
  consultar `profiles` desde sus propias políticas.
- **Secuencia de fichajes**: el trigger `punches_check_sequence` usa
  `pg_advisory_xact_lock` para serializar inserciones concurrentes del mismo
  `user_id` y así impedir `IN,IN` u `OUT,OUT` por doble click o peticiones
  simultáneas — no se resuelve solo en el cliente.
- **Exposición a la Data API**: `auto_expose_new_tables = false` en
  `config.toml` + `GRANT` explícito a `authenticated` en la migración de RLS,
  anticipando el cambio de Supabase que deja de auto-exponer tablas nuevas.
- **Vista `latest_punches` (Fase 5, Teacher)**: `DISTINCT ON (user_id) ORDER
  BY user_id, created_at DESC` sobre `punches`, con índice de apoyo
  `punches_user_id_created_at_idx`. Da "el último punch de cada alumno" en
  una sola consulta (sin N+1 para el roster del dashboard de profesor).
  Creada con `WITH (security_invoker = true)`: hereda el RLS de `punches` tal
  cual (un alumno solo vería su propia fila; teacher/admin las ven todas) en
  vez de saltárselo con los privilegios de quien creó la vista. `GRANT SELECT
  ... TO authenticated` explícito, mismo motivo que el punto anterior.
