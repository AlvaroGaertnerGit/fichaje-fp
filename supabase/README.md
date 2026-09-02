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

## Nota operativa: Auth (estado actual del proyecto)

- **Confirm Email = OFF.** El registro público (`src/app/(auth)/registro`)
  está adaptado a esta configuración: `signUp()` deja sesión activa de
  inmediato y el flujo redirige directamente a `/`, sin ningún paso de
  "revisa tu correo" (Fase 5.5.1). Si se reactivara la confirmación de email
  desde el dashboard, `register()` ya no dejaría pasar ese caso silenciosamente
  — lo trata como error y no crea una cuenta a medias (ver el comentario junto
  a `if (!signUpData.session)` en `src/app/(auth)/registro/actions.ts`); haría
  falta reintroducir el mensaje de "revisa tu correo" a propósito.
- **Proveedor Email/Password.** Debe estar habilitado (Authentication →
  Sign In / Providers → Email) tanto para registro como para login — se
  confirmó en vivo que, si está desactivado, `signUp()` y
  `signInWithPassword()` fallan con `email_provider_disabled` /
  "Email logins are disabled" para **toda** la aplicación, no solo para el
  registro.
- **Límites de contraseña reales de Supabase Auth** (comprobados en vivo
  contra el proyecto, no de memoria): mínimo 6 caracteres, máximo 72
  (impuesto por bcrypt, no configurable). La aplicación usa
  `MIN_PASSWORD_LENGTH = 8` (más estricto que el mínimo real, a propósito) y
  `MAX_PASSWORD_LENGTH = 72` (igual al máximo real) en
  `src/lib/auth/register.ts` — así nunca se acepta en el formulario/servidor
  algo que Supabase fuera a rechazar.
- **Envío de email compartido de Supabase.** Con la confirmación de email
  desactivada, el registro ya no depende del envío de correo. Si en el
  futuro se activa cualquier flujo que sí lo necesite (confirmación,
  recuperación de contraseña), el proveedor de email por defecto de
  Supabase (compartido, sin SMTP propio) tiene un límite de envío muy bajo
  — se observó `over_email_send_rate_limit` con solo un puñado de intentos.
  Configurar un SMTP propio en **Authentication → Settings → SMTP
  Settings** antes de depender de esos flujos en producción.

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

## Fase 6.1 — Admin: gestión de usuarios

Diseño completo (matriz de permisos, threat model, alternativas
descartadas) en `docs/fase-6.0-diseno-admin.md`. Aquí solo el resumen
operativo de lo que quedó implementado.

### `private.user_role()` endurecida (activo obligatorio)

Migración `20260902200000_harden_staff_active_check.sql`. Antes,
`private.user_role()` devolvía el rol de `auth.uid()` sin comprobar
`active` — un teacher/admin desactivado con un access token todavía válido
(no caducado) seguía obteniendo privilegios de staff vía RLS, aunque
`requireRole()` ya le bloqueara el renderizado de cualquier página. Ahora
la función añade `and active = true`; como `profiles_select`,
`punches_select` y `punches_insert_own` ya la usaban, las tres heredan el
nuevo comportamiento sin tocar ninguna policy. Efecto adicional (no
buscado, pero correcto): un alumno desactivado tampoco puede insertar
punches vía RLS aunque llame directo a la Data API, no solo vía la Server
Action `punch()`. Verificado en vivo contra el proyecto real: sesión de un
teacher de prueba, antes de desactivar veía perfiles ajenos (RLS
`count > 0`), con el MISMO access token tras la desactivación deja de
verlos (`count = 0`).

### Funciones `SECURITY DEFINER` (`admin_*`)

Migración `20260902200500_admin_functions.sql`. Tres funciones en
`public` (no en `private`: `.rpc()` de supabase-js solo alcanza esquemas
expuestos a PostgREST), cada una con `EXECUTE` revocado explícitamente de
`PUBLIC`/`anon`/`authenticated` y concedido solo a `service_role` — la
misma lección que ya dejó `20260902154513_harden_authenticated_grants.sql`
sobre no confiar en los grants por defecto de Supabase, aplicada aquí a
funciones nuevas en vez de a tablas:

- `admin_create_profile(actor, target, name, email, role, degree, course, ip)`
  — INSERT `profiles` + INSERT `audit_logs` (`user_created`) en una
  transacción. `role` solo acepta `student`/`teacher` — estructuralmente no
  puede crear un `admin`.
- `admin_change_role(actor, target, new_role, ip, reason?)` — UPDATE
  `profiles.role` + INSERT `audit_logs` (`role_changed`), atómico.
- `admin_set_active(actor, target, active, ip, reason?)` — UPDATE
  `profiles.active` + INSERT `audit_logs` (`user_deactivated` /
  `user_reactivated`), atómico.

Cada función revalida por sí misma que el actor es un admin activo
(`role='admin' and active=true`), independientemente de que quien la llame
ya lo haya comprobado en la Server Action — nunca confía solo en el
llamante. `admin_change_role`/`admin_set_active` comparten dos guardas:

1. **Auto-modificación**: `target = actor` rechazado (`self_role_change_forbidden`
   / `self_deactivation_forbidden`).
2. **Último admin activo**: si el objetivo es admin y la operación lo
   dejaría inactivo o sin ese rol, se cuenta cuántos otros admins activos
   quedarían; si son 0, se rechaza (`last_admin_guard`). La cuenta va
   protegida con `pg_advisory_xact_lock(hashtext('fichaje_admin_count_guard'))`
   — mismo patrón que ya usa `check_punch_sequence` para la secuencia de
   punches — para que dos desactivaciones/degradaciones concurrentes no
   puedan dejar el sistema en 0 admins por una carrera. Verificado en vivo:
   dos admins de prueba desactivándose mutuamente en paralelo
   (`Promise.allSettled`) — exactamente una operación tiene éxito, la otra
   es rechazada, el sistema nunca llega a 0 admins activos.

No se añadió ninguna policy de RLS de escritura en `profiles`/`audit_logs`
para `authenticated`: siguen completamente cerradas, igual que antes de
esta fase. La única vía de escritura son estas tres funciones, invocadas
solo por el cliente `service_role` (`createAdminClient()`) desde
`src/lib/admin/actions.ts`, y cada Server Action de ese archivo comprueba
`requireRole(['admin'])` antes de tocar ese cliente.

### Creación de usuario (`src/lib/admin/actions.ts`)

`admin.auth.admin.createUser({ email, password, email_confirm: true })` —
nunca `signUp()`, el admin no se autentica en nombre del nuevo usuario.
`email_confirm: true` porque Confirm Email está desactivado en este
proyecto (ver más abajo) y no se quiere depender de correo transaccional
para dar de alta a un profesor. Si el segundo paso (`admin_create_profile`)
falla, se compensa con `admin.auth.admin.deleteUser()` — mismo patrón ya
probado en `src/app/(auth)/registro/actions.ts`, verificado en vivo con un
fallo forzado (actor inválido): el usuario de Auth recién creado queda
borrado, sin profile huérfano.

La contraseña temporal (`src/lib/admin/password.ts`) se genera con
`node:crypto.randomInt` (criptográficamente seguro, nunca `Math.random` ni
un valor derivado de timestamp), 20 caracteres, charset sin ambigüedades
visuales (`0/O`, `1/l/I`). No se persiste en ningún sitio — se devuelve una
única vez en la respuesta de la Server Action y se muestra una sola vez en
la UI (oculta por defecto, con opción de mostrar/copiar solo en cliente).

Desactivar un usuario también llama a
`admin.auth.admin.updateUserById(id, { ban_duration })` (baneo de login,
`"876000h"` al desactivar / `"none"` al reactivar) como higiene adicional
best-effort: impide que vuelva a iniciar sesión o a refrescar su token,
pero **no** invalida un access token ya emitido y todavía no caducado —
eso es exactamente lo que resuelve el endurecimiento de
`private.user_role()` de arriba, que es la barrera real.

### Reglas que no están en ninguna policy ni función (decisión de producto)

- **No se puede crear un admin desde la UI**, bajo ningún supuesto. Si se
  necesitan más admins, es una operación manual fuera de la app (igual que
  se hizo para las pruebas de esta fase: `auth.admin.createUser()` +
  `insert` directo en `profiles` con la Secret Key, nunca a través de
  `admin_create_profile`).
- **`ALLOWED_NETWORK_IPS` no se aplica a las operaciones de Admin** — solo
  al fichaje de alumnos. Se prioriza la capacidad de responder a un
  incidente (p. ej. desactivar una cuenta comprometida) desde cualquier
  red, compensando con auditoría (actor + IP quedan siempre registrados).
- **Reset de contraseña administrativo** queda fuera de esta fase — no se
  añadió ningún valor nuevo al `CHECK` de `audit_logs.action` para eso.
