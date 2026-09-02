# FASE 6.0 — Diseño técnico de Admin

> Documento de diseño. No implementa código, no ejecuta migraciones, no cambia RLS, no crea usuarios. Sirve como base para aprobar la arquitectura antes de la Fase 6.1.

## 0. Resumen de la inspección

Estado actual relevante (código y BD ya existentes, no propuesto):

- **Roles**: `public.user_role` enum (`student`, `teacher`, `admin`). `private.user_role()` es `SECURITY DEFINER`, `search_path=''`, usa `auth.uid()` embebido (no recibe parámetro), y es la única función que las RLS policies consultan para saber el rol del usuario actual.
- **RLS actual**:
  - `profiles_select`: `id = auth.uid() OR private.user_role() IN ('teacher','admin')`. **No comprueba `active`** en ninguna de las dos ramas.
  - `punches_select`: mismo patrón (propio dueño o staff), tampoco comprueba `active`.
  - `punches_insert_own`: `user_id = auth.uid() AND private.user_role() = 'student'`. Tampoco comprueba `active`.
  - `audit_logs_select_staff`: solo SELECT para teacher/admin.
  - **No existe ninguna policy de INSERT/UPDATE/DELETE en `profiles`** ni de INSERT en `audit_logs`. Es intencional: esas tablas solo se escriben desde servidor con la Secret Key (ver comentarios de `20260902140326_rls_policies.sql`).
  - Grants a `authenticated` ya fueron endurecidos explícitamente en `20260902154513_harden_authenticated_grants.sql` tras detectar que Supabase concede por defecto CRUD completo a nivel de tabla a `authenticated` al crear una tabla nueva. **Esta lección es directamente relevante para las funciones nuevas que propone este diseño** (§17).
- **`auth.users` / `storage` / `realtime` están restringidos**: no se pueden crear triggers ni funciones en esos esquemas en este proyecto (comentario explícito en `20260902140325_create_core_schema.sql`). Descarta estructuralmente la estrategia de "trigger en `auth.users`".
- **Creación de usuario ya resuelta una vez**: `src/app/(auth)/registro/actions.ts` ya implementa el patrón "Admin API / signUp → insert profile → si falla, `deleteUser()` de compensación", con `role`/`active` fijados en el tipo de `buildStudentProfileInsert` (no se leen del payload). Es el precedente directo a reutilizar para Admin.
- **`src/lib/supabase/admin.ts`**: cliente con `SUPABASE_SECRET_KEY`, `server-only`, usado hoy en exactamente un sitio (`registro/actions.ts`) para el insert de `profiles` tras el `signUp`.
- **`requireRole()`** (`src/lib/auth/session.ts`): única puerta de autorización de servidor para renderizar rutas. Ya contempla: sin sesión → `/login`; sesión sin profile → cierra sesión + `/login`; `inactive` → `/cuenta-desactivada`; rol no permitido → destino propio. Lee el perfil fresco de BD en cada llamada (no cachea `active`).
- **`punch()`** (`src/lib/punches/actions.ts`) ya comprueba `session.status === "inactive"` en cada invocación, no solo al iniciar sesión — es el patrón correcto a replicar para cualquier acción sensible.
- **`audit_logs.action` CHECK** ya incluye: `punch_corrected`, `user_created`, `user_deactivated`, `user_reactivated`, `role_changed`. **Cubre ya todo lo que pide la Fase 6** salvo, opcionalmente, un reseteo de contraseña por admin.
- **Roster de teacher** (`getStudentRoster`) filtra `.eq("active", true)`: los alumnos desactivados desaparecen de la vista de profesor. Admin necesitará lo contrario (ver inactivos, con distinción visual).
- El registro público (`/registro`) construye `role`/`active` en un tipo literal (`NewStudentProfileInsert`) que estructuralmente no admite otro valor: ese es el patrón de seguridad a copiar para "crear staff", no un `if (role === 'admin') reject`.

---

## 1. Arquitectura propuesta

```
Browser (Admin)
   │  (sin Secret Key nunca)
   ▼
Server Action ("use server")
   │
   ├─ requireRole(['admin'])          ← sesión, active, rol — SIEMPRE primero
   │
   ├─ Lecturas (listar, buscar, auditoría, dashboard)
   │     → createClient() normal (publishable key, RLS)
   │       Admin ya tiene SELECT vía RLS existente (private.user_role()).
   │       No hace falta Secret Key para leer NADA.
   │
   └─ Escrituras (crear, cambiar rol, activar, desactivar)
         ├─ auth.users  → createAdminClient().auth.admin.*  (Admin API,
         │                 obligatorio: es el único cliente que puede crear
         │                 o modificar auth.users)
         └─ profiles + audit_logs → createAdminClient().rpc('admin_xxx', …)
               función SECURITY DEFINER en `public`, EXECUTE revocado a
               anon/authenticated, concedido solo a service_role. Un único
               statement de función = una única transacción = atómico.
```

Principio rector (ya presente en el código actual, se mantiene): **la existencia de un cliente con Secret Key no es autorización**. Cada Server Action administrativa repite siempre la misma secuencia, sin excepción:

```
authenticated → active → role = admin → (guardas específicas) → cliente admin
```

---

## 2. Matriz de permisos

| Operación | Student | Teacher | Admin |
|---|---:|---:|---:|
| Ver propio perfil | ✅ | ✅ | ✅ |
| Ver alumnos | ❌ | ✅ | ✅ |
| Ver fichajes globales | ❌ | ✅ | ✅ |
| Ver usuarios inactivos | ❌ | ❌ | ✅ |
| Crear alumno | ❌ | ❌ | ✅ |
| Crear profesor | ❌ | ❌ | ✅ |
| Crear admin | ❌ | ❌ | ⚠️ **no desde la UI** (§3) |
| Cambiar rol | ❌ | ❌ | ✅ (con guardas, §6) |
| Activar usuario | ❌ | ❌ | ✅ |
| Desactivar usuario | ❌ | ❌ | ✅ (nunca a sí mismo) |
| Resetear contraseña (genera una nueva temporal) | ❌ | ❌ | ✅ |
| Modificar fichajes | ❌ | ❌ | ❌ inicialmente (queda para el diseño de "corrección de fichajes" de teacher, que ya se apunta en RLS como pendiente) |
| Eliminar fichajes | ❌ | ❌ | ❌ |
| Eliminar usuario físicamente | ❌ | ❌ | ❌ |
| Ver auditoría | ❌ | ❌ | ✅ |

Diferencia respecto a la matriz propuesta por el usuario: se añade **"ver usuarios inactivos"** como fila explícita porque la RLS actual de `profiles_select` ya lo permite a cualquier staff (no filtra por `active`), pero el **roster de teacher sí lo filtra en la query** (`getStudentRoster`). Es decir: hoy mismo un teacher *podría* ver perfiles inactivos si tuviera una vista que no filtrara — conviene que la UI de Admin lo haga explícito y a propósito, y que quede documentado que teacher se apoya en filtrado de aplicación, no en RLS, para no listarlos.

**Modificar fichajes** se mantiene en ❌ para admin en esta fase, igual que pide CLAUDE.md — es una funcionalidad de *teacher* pendiente de diseño propio (la corrección de fichajes es una operación de profesor sobre su seguimiento diario, no de administración de cuentas). No añadir esa capacidad "de paso" en Fase 6 sería sobreingeniería fuera de alcance.

---

## 3. Creación de usuarios — ¿permitir "admin" desde la UI?

**Recomendación: NO.** El formulario de creación/cambio de rol solo debe aceptar `'student' | 'teacher'` como valor de entrada — un tipo cerrado, exactamente como `NewStudentProfileInsert` ya hace hoy con `role: "student"` literal. No es una validación de "si viene admin, rechazar": es que el tipo de entrada **no tiene ese valor posible**, igual que el registro público no tiene forma de que un payload manipulado cambie el rol.

Justificación:
- Cada admin nuevo es una ampliación permanente y sensible de superficie de ataque (más credenciales con acceso total). No debería poder crearse con el mismo flujo de "alta rápida" que un profesor.
- Si en algún momento se necesitan varios admins, esa es una decisión operativa poco frecuente que merece un procedimiento explícito y fuera de la aplicación normal: ejecutado directamente por quien tiene acceso a las credenciales de infraestructura (SQL/Admin API manual, documentado, no un botón). Esto es coherente con "no implementar funcionalidades innecesarias" — construir una UI seria para un evento que ocurre una o dos veces en la vida del proyecto no se justifica, y cada línea de esa UI sería superficie de escalada de privilegios que auditar.
- Precedente ya existente en el propio proyecto: el registro público estructuralmente no puede crear staff. Se extiende el mismo principio un nivel más arriba (Admin estructuralmente no puede crear admin desde la interfaz normal).

---

## 4. Auth ↔ Profile: estrategia de creación

### Comparativa

**A. Admin API desde servidor + insert profile + rollback explícito (compensación)**
Ya es el patrón probado en `registro/actions.ts` (con `signUp` en vez de `admin.createUser`, pero mismo esqueleto: crear en Auth → insertar profile → si falla, `admin.auth.admin.deleteUser(user.id)`).
- Seguridad: alta — todo ocurre en servidor, Secret Key nunca sale de ahí.
- Atomicidad: **no es una transacción real** (dos sistemas distintos: GoTrue y Postgres), pero sí hay una compensación explícita y ya verificada en producción-simulada por el flujo de registro.
- Rollback: probado — si el insert de `profiles` falla, se borra el `auth.users` recién creado.
- Mantenimiento: bajo — es el mismo patrón que ya existe, mismo vocabulario mental para quien lea el código.
- Riesgo de huérfanos: solo si el propio `deleteUser()` de compensación falla (caso raro: caída de red entre el insert-fail y el delete). Mitigación razonable para el volumen esperado (pocas altas de staff): loguear fuerte (`console.error` con el `user.id`) si la compensación falla, para que sea detectable manualmente. No se justifica un job de reconciliación automática para este volumen.

**B. Trigger PostgreSQL en `auth.users`**
- **Descartada, no es una opción viable**: el propio esquema de este proyecto documenta que `auth`, `storage` y `realtime` están restringidos desde el 21-04-2025 — no se pueden crear triggers ni funciones ahí. No es una preferencia de diseño, es una restricción de la plataforma en este proyecto.

**C. Alternativa considerada y descartada: función RPC única que orqueste ambos pasos**
Se podría envolver "crear en Auth + insertar profile" en una única función de servidor (no en SQL, en TypeScript) para que quede en un solo sitio. Esto ya es, en la práctica, lo que propone A — la única diferencia real sería empaquetarlo como `src/lib/admin/create-user.ts` con una función `createStaffUser()` reutilizable en vez de código suelto en la Server Action. Se adopta esa idea como parte de A (organización de código), no como una estrategia distinta.

### Recomendación

**Estrategia A**, reutilizando el patrón ya probado de `registro/actions.ts`, extraído a un helper común (`src/lib/admin/create-user.ts`) para no duplicar la lógica de "crear + compensar" entre el registro público y la creación por admin — con una diferencia importante: el registro público usa `signUp` (el propio usuario se autentica), la creación por admin debe usar `admin.auth.admin.createUser({ email, password, email_confirm: true })` (el admin nunca "inicia sesión como" el nuevo usuario).

---

## 5. Uso de `SUPABASE_SECRET_KEY`

Legítimo:
- `admin.auth.admin.createUser()` / `deleteUser()` (compensación) / `updateUserById()` (reset de contraseña) — son operaciones que **solo** la Admin API puede hacer; ninguna policy de RLS puede sustituirlas porque `auth.users` no es una tabla de `public`.
- `.rpc()` a las funciones `admin_change_role` / `admin_set_active` / (la mitad-BD de) `admin_create_profile` — funciones `SECURITY DEFINER` cuyo `EXECUTE` se concede *solo* a `service_role` (§12), así que necesitan el cliente admin para poder invocarse en absoluto.

Ilegítimo / innecesario:
- Listar usuarios, buscar, ver auditoría, ver dashboard: admin ya tiene SELECT vía RLS (`private.user_role() = 'admin'`). Usar el cliente admin ahí sería redundante y, peor, normalizaría "admin = bypass total" como reflejo, que es exactamente lo que CLAUDE.md pide evitar.
- Nunca en Browser/Client Component — ya está garantizado hoy por `server-only` en `src/lib/supabase/admin.ts` (error de build si se importa desde un bundle de cliente).

Regla de código para la Fase 6.1 (a aplicar, no a implementar ahora): **ninguna función de `src/lib/admin/actions.ts` debe llamar a `createAdminClient()` sin que la línea anterior sea `await requireRole(['admin'])`** en la misma función. No es solo una convención — se puede comprobar en revisión de código línea a línea porque cada Server Action administrativa es corta y sigue siempre el mismo orden.

---

## 6. Cambios de rol

Transiciones válidas: todas las indicadas por el usuario (`student↔teacher`, `student|teacher→admin` excluida por §3, `admin→teacher|student` sí permitida — un admin puede *degradarse* a sí mismo... salvo por la regla siguiente).

Reglas de seguridad (todas ya solicitadas por el usuario; se adoptan sin cambios, con una añadida):

1. **Un admin no puede cambiar su propio rol.** Guarda: `target_id != actor_id`, comprobada tanto en el Server Action (JS) como dentro de la función SQL (`RAISE EXCEPTION` si coinciden) — defensa duplicada, no una sola capa.
2. **Un admin no puede desactivar su propia cuenta.** Misma guarda duplicada.
3. **No se puede crear un admin desde la UI normal** (§3).
4. **Modificar a otro admin requiere salvaguarda explícita** — se propone concretamente: **nunca permitir que una operación deje 0 admins activos.** Antes de degradar el rol de un admin o desactivarlo, la función SQL comprueba `count(*) FROM profiles WHERE role='admin' AND active=true` (con lock, ver §14); si el resultado tras la operación sería 0, la función rechaza con una excepción clara ("no se puede dejar el sistema sin ningún administrador activo"). Esta regla no la pidió explícitamente el usuario pero se deriva directamente de "cualquier modificación de otro admin debe tener salvaguardas explícitas" — es la salvaguarda concreta que da contenido a esa frase, y sin ella "admin A puede desactivar a admin B" degenera en un vector de bloqueo total del sistema (nadie con acceso admin).

Admin A modificando a Admin B (rol o activación) más allá de la regla anterior: **se permite**, queda auditado con `actor = A`, `target = B` — no se añade un requisito de "doble aprobación" u otro flujo multi-persona: para un centro de FP con un admin o dos, eso sería sobreingeniería. La combinación de auditoría + la regla del último admin es la salvaguarda proporcional.

---

## 7. Desactivación (`active = false`)

Decisiones explícitas:

| Pregunta | Decisión |
|---|---|
| ¿Puede seguir accediendo (navegar la app)? | No. `requireRole()` ya redirige a `/cuenta-desactivada` en cada carga de página, sin cambios — funciona hoy para cualquier rol. |
| ¿Puede fichar? | No. `punch()` ya deniega `INACTIVE` en cada invocación (no solo al iniciar sesión) — funciona hoy. |
| ¿Qué pasa con la sesión (JWT) ya emitida? | **Gap identificado, ver más abajo.** El JWT sigue siendo válido por firma hasta que expira; ni `requireRole` ni `punch()` dependen de invalidar el JWT porque ambos re-consultan `profiles.active` en cada llamada — pero **RLS no hace lo mismo**. |
| ¿Puede consultar su propio histórico? | Sí, se conserva — `profiles_select`/`punches_select` no excluyen por `active` en la rama "es su propia fila", y no hay razón para cambiarlo: es su dato, no un privilegio. |
| ¿Aparece en Teacher? | No — `getStudentRoster()` ya filtra `.eq("active", true)`, sin cambios. |
| ¿Aparece en Admin? | Sí, con un indicador visual claro de "inactivo" — Admin necesita poder encontrarlo para reactivarlo. |

### El gap real: sesión anterior tras desactivar

`private.user_role()` (usada por `profiles_select`, `punches_select`, `punches_insert_own` vía staff) **no comprueba `active`**. Hoy esto no es explotable porque no existe ningún camino en la aplicación donde un cliente autenticado consulte Supabase directamente sin pasar por `requireRole()` primero — pero es una dependencia implícita, no una garantía estructural. Un teacher/admin desactivado con un access token todavía válido (no expirado) que hiciera una consulta PostgREST directa (fuera del flujo normal de la app) seguiría viendo todos los perfiles/fichajes, porque RLS solo mira el rol, no `active`.

**Recomendación (para aprobar explícitamente, no es solo "cosas de Admin", toca RLS existente — ver §20):** cambiar `private.user_role()` por una función equivalente que devuelva `NULL` (o un tipo que las policies traten como "sin privilegio") cuando `active = false`, de modo que la desactivación quite el acceso de staff **a nivel de base de datos**, no solo a nivel de renderizado de página. Esto convierte "sesión antigua tras desactivar" de una dependencia de disciplina de código a una garantía de RLS — el mismo nivel de robustez que ya tiene el resto del sistema.

Adicionalmente (buena higiene, no sustituye a lo anterior): al desactivar, invocar `admin.auth.admin.signOut(userId, 'global')` (o equivalente de revocación de refresh tokens) como *best effort* — reduce la ventana de sesión válida, aunque no es instantáneo a nivel de access token ya emitido (por eso el fix de RLS es el que de verdad cierra el hueco).

---

## 8. Reactivación

```
active=false → Admin → reactivar → active=true
```

- Conserva **todo** el histórico de `punches` — nunca se toca esa tabla.
- Conserva el registro en `auth.users` — nunca se llamó a `deleteUser()` en una desactivación (eso es exclusivo del rollback de creación fallida, §4).
- No necesita volver a verificar email ni ningún otro paso: la cuenta de Auth nunca dejó de existir, solo se le negó acceso a nivel de aplicación/BD.
- Puede volver a iniciar sesión con la misma contraseña de siempre.
- Queda auditado (`user_reactivated`, valor ya existente en el CHECK).

---

## 9. Contraseñas

### Creación de usuario por Admin

**Recomendación: contraseña temporal generada por el servidor, mostrada una única vez en pantalla al admin** (nunca elegida por el admin, nunca logueada, nunca guardada en ningún sitio salvo Supabase Auth internamente).

Se descarta `inviteUserByEmail()` (magic link) **como opción por defecto para el MVP**, no por ser peor en principio, sino porque depende de una pieza que este diseño no puede dar por garantizada todavía: entrega de correo SMTP configurada y verificada para el dominio real (`@gsd.coop`). El propio comentario de `registro/actions.ts` ya deja constancia de que "Confirm Email" está desactivado en este proyecto — no es evidencia de que el envío de correo transaccional (invitación/recuperación) esté configurado y probado. Construir el flujo de creación de usuario sobre una dependencia no verificada de entrega de email sería un riesgo de "funcionalidad que aparenta funcionar en desarrollo pero falla en producción" — se deja como mejora futura una vez se confirme la infraestructura de correo (§20, punto 3).

No se propone (para no sobredimensionar el MVP) un campo `must_change_password` nuevo en el esquema para forzar cambio en el primer login — el admin comunica la contraseña temporal fuera de banda y el propio usuario puede cambiarla desde `/cuenta` (ya existe esa pantalla). Si se quiere forzar el cambio, es una mejora incremental y explícita, no un requisito oculto de esta fase.

### Cambio/reset de contraseña

- Autoservicio (cualquier usuario, su propia contraseña): ya es competencia de la pantalla `/cuenta` existente vía `supabase.auth.updateUser({ password })` con la sesión propia — Admin no interviene, no se rediseña aquí.
- Reset por Admin (usuario que perdió acceso): Admin dispara "generar nueva contraseña temporal" → `admin.auth.admin.updateUserById(userId, { password: <random> })` → se muestra una vez al admin, igual que en creación. El admin **nunca** puede leer ni recuperar la contraseña anterior (Supabase no la expone en texto claro en ningún caso — ni con Secret Key: solo guarda el hash).
- **Nunca** se persiste una contraseña (temporal o no) en `profiles`, `audit_logs` ni ningún `metadata` — el evento de auditoría registra que ocurrió un reset, nunca el valor.

---

## 10. Auditoría

Acciones a registrar (usando los valores **ya existentes** en el CHECK de `audit_logs.action` — no requiere migración para estas cuatro):

- `user_created`
- `role_changed`
- `user_deactivated`
- `user_reactivated`

Si se implementa "reset de contraseña por admin" en esta misma fase, se necesita un valor nuevo (`password_reset_by_admin` o similar) — la única migración de `audit_logs` que este diseño anticipa (§19, y sujeto a §22 punto 7).

Campos por evento:

| Campo | Contenido | Fuente |
|---|---|---|
| `user_id` (actor) | quién ejecuta la acción | sesión de servidor verificada (`requireRole`), nunca del payload |
| `target_user_id` | sobre quién actúa | id validado contra BD, no el id crudo de la URL sin comprobar |
| `action` | uno de los valores del CHECK | fijo por la función que se invoca, no un string libre del cliente |
| `metadata` (jsonb) | `role_changed`: `{ from, to }`; `user_created`: `{ role, class_group/degree/course si aplica }`; `user_deactivated`/`user_reactivated`: `{ reason? }` opcional | construido en servidor |
| `ip_address` | IP pública del admin, reutilizando `getClientIp()` (ya existe en `src/lib/network/allowed-ip.ts`) | cabeceras de la petición |
| `created_at` | `now()` | default de BD |

Explícitamente **no** se registra: contraseñas (ni temporales ni hashes), user-agent (no está en el esquema de `audit_logs` — no añadirlo solo para esto, no aporta valor de auditoría de negocio), ni el cuerpo completo de la petición.

¿Motivo/`reason` de texto libre? Se propone como campo **opcional** dentro de `metadata`, no obligatorio — igual que el ejemplo de CLAUDE.md ("Olvidó fichar la salida") para corrección de fichajes. Obligarlo añadiría fricción sin garantía real de calidad del dato (un admin puede escribir cualquier cosa igualmente).

---

## 11. Atomicidad

Dos situaciones distintas, con respuestas distintas:

**A. `profiles` (update) + `audit_logs` (insert)** — ej. cambiar rol, activar, desactivar.
Estas dos escrituras **sí pueden y deben ser atómicas**, porque ambas viven en la misma base de datos Postgres. La forma correcta no es "hacer el update, luego el insert, y confiar" (dos llamadas HTTP separadas a PostgREST no son una transacción) ni "intentar deshacer el update en JS si el insert falla" (frágil, hay una ventana donde el estado es inconsistente y visible). La forma correcta es envolver ambas sentencias dentro de **una función SQL `SECURITY DEFINER`**: una llamada a función = una transacción implícita = si cualquier sentencia interna falla, Postgres revierte las dos. Cero código de compensación necesario en JS para este caso.

**B. `auth.users` (Admin API) + `profiles`/`audit_logs` (Postgres)** — creación de usuario.
Esto **no puede ser una transacción real**: son dos sistemas distintos (GoTrue vía HTTP, y Postgres). Aquí sí aplica compensación explícita (ya analizado en §4): si el paso de Postgres falla tras crear el usuario en Auth, se borra el usuario de Auth. No es "atomicidad" en sentido estricto, es un patrón saga de dos pasos con rollback del primero — el nivel de garantía correcto dado que la limitación es de la plataforma, no de diseño.

Aplicando esto a cada operación:
- `create_user`: paso 1 (Auth, no transaccional) → paso 2 (`profiles` insert + `audit_logs` insert, en una función, transaccional) → si paso 2 falla, compensar paso 1.
- `change_role` / `activate` / `deactivate`: una sola función transaccional (`profiles` update + `audit_logs` insert). No hay paso de Auth API involucrado, así que aquí sí hay atomicidad completa sin compensación.

---

## 12. RLS, funciones SQL, Server Actions y Admin API — qué resuelve cada capa

Decisión explícita para no caer en "admin = bypass total":

| Operación | Capa que la resuelve | Por qué |
|---|---|---|
| Leer usuarios/auditoría/dashboard (cualquier volumen) | RLS normal, cliente `authenticated` | Ya existe la policy (`private.user_role() in ('teacher','admin')`); Secret Key sería redundante y peor principio. |
| Crear/eliminar cuenta de Auth, resetear contraseña | Admin API (Secret Key), tras `requireRole` | Estructuralmente no hay otra vía: `auth.users` no es una tabla de `public`. |
| `profiles` update (rol, `active`) + `audit_logs` insert | Función SQL `SECURITY DEFINER` en `public`, `EXECUTE` solo a `service_role`, invocada vía `.rpc()` desde el cliente admin | Necesita ser atómica (§11) y necesita expresar guardas peligrosas (auto-modificación, último admin) de forma explícita y testeable — más seguro y más legible en una función revisable que repartido en predicados de RLS. **No se añade ninguna policy de UPDATE en `profiles` para `authenticated`**: sigue completamente cerrado a escritura directa, exactamente como hoy. |
| Todo lo demás (SELECT normal) | RLS existente, sin cambios | Ya correcto. |

Nota de nomenclatura importante (a diferencia de `private.user_role()`): estas funciones nuevas **no pueden vivir en el esquema `private`**, porque `.rpc()` de supabase-js solo alcanza esquemas expuestos a PostgREST (por defecto, `public`). La forma de mantenerlas fuera del alcance de `authenticated`/`anon` no es esconderlas en otro esquema (como sí se hizo con `private.user_role()`, que se llama *desde* políticas RLS, no desde `.rpc()`), sino **revocar `EXECUTE` de `anon`/`authenticated` explícitamente y concederlo solo a `service_role`** — exactamente la lección que la propia migración `20260902154513_harden_authenticated_grants.sql` ya dejó documentada sobre los grants por defecto de Supabase: no asumir que "no hay policy que lo permita" es suficiente, revocar explícitamente.

---

## 13. IDOR

Ningún `id` de ruta o parámetro implica autorización, en ningún punto:

```
/alumnos/[id]           (ya existe, teacher/admin)
/admin/usuarios/[id]    (nuevo)
activate(id) / deactivate(id) / changeRole(id, rol)   (nuevas Server Actions)
```

Patrón obligatorio para cada Server Action administrativa (mismo orden siempre):

1. `const actor = await requireRole(['admin'])` — identidad y rol del que llama, **nunca** del cliente.
2. Releer el perfil objetivo **fresco de BD** por `id` (nunca confiar en el rol/estado que la UI tenía renderizado — pudo cambiar entre el render y el submit).
3. Guardas de negocio sobre datos frescos: `target.id !== actor.id`, "no dejar 0 admins activos" si `target.role === 'admin'`, etc.
4. Solo entonces, invocar la función `SECURITY DEFINER` con `(actor.id, target.id, …)`.

`getStudentProfile()` ya modela este cuidado hoy (filtra explícitamente `role = 'student'` además del `id`, para que un id de profesor "no se encuentre" en una ruta pensada solo para alumnos) — se replica el mismo estilo para las rutas de admin.

---

## 14. Concurrencia

Dos escenarios pedidos:

**A. Admin A desactiva a un usuario mientras Admin B le cambia el rol, simultáneamente.**
Ambas operaciones son `UPDATE` de fila única dentro de su propia función transaccional. Postgres serializa a nivel de fila: la segunda transacción espera a que la primera confirme (o revierta) antes de aplicar su propio update sobre la fila ya actualizada. Resultado: "última escritura gana" para el campo que cada una tocó (no se pisan entre sí porque tocan campos distintos, `role` vs `active`), y **cada una genera su propia entrada de auditoría correcta** reflejando lo que realmente hizo. No hace falta ningún mecanismo adicional aquí — es el comportamiento normal de `READ COMMITTED` y es correcto para este caso.

**B. Dos admins intentan degradar simultáneamente a los dos únicos admins activos** (el caso donde si no se hace nada, ambas transacciones podrían leer "hay 2 admins activos" *antes* de que la otra confirme, y las dos pasarían la comprobación, dejando el sistema con 0 admins).
Este es el único punto donde light-locking está justificado. Se propone reutilizar exactamente el mismo patrón que el proyecto ya usa para el mismo tipo de problema (secuencia de punches): `pg_advisory_xact_lock` con una clave constante (p. ej. `hashtext('admin_count_guard')`) al principio de cualquier función que pueda reducir el número de admins activos (`admin_change_role` cuando `target.role = 'admin'` y `new_role != 'admin'`, `admin_set_active` cuando `target.role = 'admin'` y `active = false`). Esto serializa exactamente las operaciones que importan (las que tocan el conteo de admins) sin bloquear nada más — no se aplica un lock global a todas las operaciones de usuarios, sería sobreingeniería innecesaria para el resto de casos.

---

## 15. Registro público vs alta administrativa

`/registro` **no se toca**: sigue construyendo siempre `role='student', active=true` mediante el mismo tipo cerrado que ya existe.

Nueva ruta separada: `/admin/usuarios/nuevo`, exclusiva de admin, con su propio Server Action y su propio builder de entrada (`buildStaffOrStudentProfileInsert` o similar) cuyo tipo de `role` es `'student' | 'teacher'` — nunca `'admin'` (§3) y nunca el mismo builder que usa el registro público (evita que un cambio futuro en uno afecte accidentalmente al otro; son dos flujos con dueños y garantías distintas: uno es autoservicio sin auditoría porque el usuario se crea a sí mismo, el otro es una acción administrativa que sí queda auditada con `actor = admin`).

---

## 16. Dominio `@gsd.coop`

No se implementa en esta fase. Dónde debería aplicarse cuando se implemente:

- Capa de aplicación: dentro del validador de entrada (equivalente a `validateRegistrationInput` / el nuevo validador de alta de staff), como una comprobación de sufijo de email adicional a la de formato ya existente.
- Capa de base de datos (defensa en profundidad, coherente con el principio ya aplicado en este proyecto de "el frontend nunca es la única barrera"): un `CHECK` en `profiles.email` (p. ej. `email ~* '@gsd\.coop$'`). Añadirlo ahora sin la aprobación explícita del dominio real y sin entornos de prueba (localhost, cuentas de desarrollo con otros dominios) rompería el flujo de desarrollo actual — por eso se deja pendiente, no por duda sobre si es buena idea.

---

## 17. Restricción de red (`ALLOWED_NETWORK_IPS`) en operaciones de Admin

| Alcance | Recomendación | Razonamiento |
|---|---|---|
| Fichaje de alumno | Sí (ya implementado) | Es la garantía central de CLAUDE.md §8: presencia física. |
| Consultas de Teacher | No | Ya es la postura actual, no cambia. |
| Mutaciones de Admin (crear/activar/desactivar/cambiar rol) | **No, por defecto** | Ver razonamiento abajo. |

Pros de restringir: reduce el radio de impacto si una credencial de admin se filtra (el atacante también necesitaría estar en la red del centro); coherente con "solo confiar en quien está físicamente presente".

Contras, y por qué pesan más aquí: un admin real (dirección/IT del centro) puede necesitar desactivar una cuenta comprometida, corregir un rol equivocado, o resolver una incidencia **fuera del horario o de las instalaciones** — exigir red del centro para esa respuesta activamente empeora la seguridad en el caso que más importa (incidente en curso). Es una restricción de *prevención* que entra en conflicto directo con la *capacidad de respuesta*.

Se propone en su lugar **compensar con detección, no con bloqueo**: cada mutación de admin ya queda auditada con IP (§10); eso permite revisar a posteriori desde qué redes se han hecho cambios sensibles, sin impedir que se hagan cuando hace falta. Esta es una decisión de producto, no solo técnica — queda listada explícitamente para aprobación en §22.

---

## 18. Matriz de amenazas

| Amenaza | Defensa propuesta |
|---|---|
| `student → admin` | `role` nunca sale del cliente en ningún flujo de creación (tipo cerrado en `buildStudentProfileInsert` y en el nuevo builder de staff); sin policy de UPDATE en `profiles` para `authenticated`; `requireRole` en cada layout protegido. |
| `student → teacher` | Igual que arriba. |
| `teacher → admin` | Sin ruta de acción alguna: todas las Server Actions administrativas exigen `requireRole(['admin'])`, no `['teacher','admin']`. El layout `(staff)/admin` añade un segundo `requireRole(['admin'])` propio, encima del `requireRole(['teacher','admin'])` del layout `(staff)` general. |
| `teacher → modificar usuario` | Teacher no tiene ninguna policy de escritura sobre `profiles`/`punches` ajenos, ni acceso a ninguna función `admin_*` (el `EXECUTE` de esas funciones ni siquiera se concede a `authenticated`, solo a `service_role`). |
| `admin → auto-escalación` (crear otro admin) | No existe esa opción en el tipo de entrada de ningún formulario/acción (§3); si se manipula el payload igualmente, el validador de servidor solo acepta `'student'\|'teacher'`. |
| `admin → auto-desactivación` / auto-cambio de rol | Guarda `target.id != actor.id`, duplicada en JS y en la función SQL. |
| IDOR | El `id` de ruta nunca autoriza por sí solo; el objetivo se relee siempre de BD antes de actuar (§13). |
| Manipulación de rol (payload con `role: "admin"`) | Dominio de valores aceptados cerrado tanto en el tipo TypeScript como en el parámetro de la función SQL (no acepta `'admin'` como `new_role` en absoluto). |
| Manipulación de `active` | No existe un endpoint genérico "actualizar perfil"; `activate`/`deactivate` son dos acciones estrechas, cada una fija su propio valor booleano en servidor, nunca lo lee del cliente. |
| Desincronización Auth/profile (huérfanos) | Compensación explícita ya probada (`deleteUser()` si falla el insert); si la propia compensación falla, se loguea de forma visible para detección manual (§4). |
| Sesión tras desactivación | `requireRole`/`punch()` ya re-comprueban `active` en cada llamada (no solo login); gap identificado en RLS (§7) con recomendación concreta de endurecer `private.user_role()` para que también dependa de `active`; revocación best-effort de sesión vía Admin API al desactivar. |
| Exposición de Secret Key | `server-only` ya lo impide a nivel de build; nunca en `NEXT_PUBLIC_*`; nunca devuelta en la respuesta de ninguna Server Action; convención de código "siempre precedida de `requireRole`" (§5). |
| Exposición de contraseñas | Nunca persistidas fuera de Supabase Auth; mostradas una única vez en estado transitorio de React, nunca logueadas ni auditadas (§9). |
| Manipulación del log de auditoría | Sin policy de INSERT/UPDATE/DELETE para `authenticated`/`anon` en `audit_logs`; solo las funciones `SECURITY DEFINER` (vía `service_role`) insertan, y siempre como parte de la misma transacción que la mutación real — no se puede escribir una entrada de auditoría sin que el cambio correspondiente también ocurra, ni al revés. |
| Acciones administrativas concurrentes | Atomicidad por función/transacción (§11); `pg_advisory_xact_lock` reutilizado específicamente para el invariante "≥1 admin activo" (§14). |

---

## 19. Migraciones necesarias (para la Fase 6.1 — no ejecutar ahora)

1. **Ninguna nueva policy de RLS de escritura en `profiles`/`audit_logs`** — se mantienen cerradas a `authenticated` tal cual están hoy. Esto es menos migración de la que cabría esperar, y es deliberado (§12).
2. Funciones `SECURITY DEFINER` nuevas en `public` (nombre orientativo): `admin_create_profile`, `admin_change_role`, `admin_set_active`. Cada una: `REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role;` explícito (no confiar en el default).
3. Función/lock auxiliar para el invariante "último admin" (puede vivir dentro de `admin_change_role`/`admin_set_active` en vez de ser una función aparte — decidir en 6.1 según legibilidad).
4. **Opcional**, sujeto a §22.7: añadir `password_reset_by_admin` al `CHECK` de `audit_logs.action`.
5. **Propuesta separada, sujeta a aprobación explícita (§22.5)**: sustituir/complementar `private.user_role()` por una versión que devuelva "sin privilegio" cuando `active = false`, y actualizar las policies que la usan. Esto no es estrictamente "de Admin" — toca comportamiento de RLS ya en uso por teacher — por eso se aísla como punto de aprobación propio en vez de darlo por incluido.
6. No hace falta índice nuevo para búsqueda de usuarios en Admin a este volumen (el patrón `.ilike()` sin índice ya se usa hoy en `getStudentDirectory` sin problema) — no añadir `pg_trgm`/FTS por adelantado.

---

## 20. Archivos que habría que crear/modificar (Fase 6.1, solo nombres)

**Lógica de servidor**
- `src/lib/admin/create-user.ts` — validación + builder de alta de staff/alumno por admin (tipo cerrado, sin `'admin'`).
- `src/lib/admin/actions.ts` — Server Actions: `createUser`, `changeRole`, `activateUser`, `deactivateUser`, `resetPassword`. Cada una: `requireRole` → releer objetivo → guardas → `.rpc()`/Admin API.
- `src/lib/admin/queries.ts` — `listUsers` (incluye inactivos, con filtro), `searchUsers`, `getUserDetail`, `listAuditLog` (paginado, filtrable por actor/target/acción).
- `src/lib/admin/guards.ts` (opcional, o inline) — `assertNotSelf`, mensaje/errores compartidos.

**Rutas**
- `src/app/(staff)/admin/layout.tsx` — segundo `requireRole(['admin'])`, encima del layout `(staff)` general.
- `src/app/(staff)/admin/usuarios/page.tsx`
- `src/app/(staff)/admin/usuarios/nuevo/page.tsx` (+ `actions.ts` propio, en el mismo estilo que `registro/actions.ts`)
- `src/app/(staff)/admin/usuarios/[id]/page.tsx`
- `src/app/(staff)/admin/auditoria/page.tsx`
- `src/app/(staff)/admin/page.tsx` (dashboard admin)

**Componentes** (fase posterior de UI, solo previstos): `components/admin/UserTable.tsx`, `CreateUserForm.tsx`, `RoleChangeControl.tsx`, `DeactivateConfirm.tsx`, `AuditLogTable.tsx`.

**Base de datos**
- `supabase/migrations/<ts>_admin_functions.sql`
- `supabase/migrations/<ts>_audit_logs_password_reset.sql` (solo si aplica, §22.7)
- `supabase/migrations/<ts>_harden_staff_active_check.sql` (solo si se aprueba §22.5)

---

## 21. Tests necesarios

- **Unitarios** (mismo estilo que `register.test.ts`/`state.test.ts`, sin mocks de Supabase): validador de alta de staff rechaza `role: "admin"` a nivel de tipo/runtime; guarda "no auto-modificación" como función pura; guarda "no dejar 0 admins" como función pura sobre una lista de perfiles en memoria.
- **Verificación manual/documentada de RLS y funciones** (checklist para ejecutar contra el proyecto real antes de dar la fase por cerrada):
  - Un `student` no puede invocar ninguna función `admin_*` vía `.rpc()` (permiso denegado).
  - Un `teacher` tampoco puede.
  - Un admin no puede cambiarse su propio rol ni desactivarse (la función rechaza).
  - No se puede degradar/desactivar al último admin activo.
  - Un admin desactivado deja de ver datos de staff (una vez aplicado §22.5) aunque su token siga sin expirar.
  - Fallo simulado del insert de `profiles` en creación de usuario → el `auth.users` creado se borra (rollback verificado, no solo revisado en código).
- **E2E** del flujo completo de CLAUDE.md §22 para admin: login → gestión de usuarios → gestionar roles → auditoría.

---

## 22. Decisiones que necesitan aprobación antes de la Fase 6.1

1. Confirmar: no crear admins desde la UI. Procedimiento alternativo para admins adicionales: operación manual fuera de la app (SQL/Admin API ejecutada directamente por quien tiene acceso a las credenciales de infraestructura), documentada pero no construida como feature.
2. Aprobar la regla nueva (no pedida explícitamente, derivada de "salvaguardas explícitas"): **ninguna operación puede dejar 0 admins activos**.
3. Contraseña de alta por admin: ¿temporal generada y mostrada una vez (recomendado para MVP), o `inviteUserByEmail()` una vez se confirme que el envío de correo transaccional a `@gsd.coop` está configurado y probado?
4. ¿Forzar cambio de contraseña en el primer login del usuario creado por admin? (requeriría un campo nuevo; se propone posponerlo, no incluirlo en el MVP de 6.1).
5. **Aprobar explícitamente** el endurecimiento de `private.user_role()` para que también dependa de `active` (§7/§19.5) — cambia comportamiento de RLS ya en uso hoy por teacher, no es exclusivo de Admin.
6. Confirmar: no aplicar `ALLOWED_NETWORK_IPS` a las mutaciones de admin, compensando con auditoría por IP en vez de bloqueo por red (§17).
7. ¿Se incluye "reset de contraseña por admin" en el alcance de la Fase 6.1, o se pospone? Determina si se añade ya el valor nuevo al `CHECK` de `audit_logs.action`.

---

## RECOMENDACIÓN

Implementar la Fase 6.1 con esta arquitectura concreta:

- **Creación de usuario**: Estrategia A — Admin API (`admin.auth.admin.createUser`) + insert de `profiles`/`audit_logs` en una función `SECURITY DEFINER` transaccional, con `deleteUser()` de compensación si ese segundo paso falla. Reutilizar/extraer el patrón ya probado en `registro/actions.ts`, no reinventarlo.
- **Mutaciones sobre usuarios existentes** (`role`, `active`): tres funciones `SECURITY DEFINER` en `public`, `EXECUTE` restringido a `service_role` únicamente, cada una atómica (update + audit log en la misma transacción), con las guardas de auto-modificación y "último admin activo" implementadas en SQL (no solo en la Server Action) y protegidas con `pg_advisory_xact_lock` reutilizando el patrón ya existente de `check_punch_sequence`.
- **RLS**: no se añade ninguna policy de escritura en `profiles`/`audit_logs` para `authenticated` — sigue completamente cerrado, todo pasa por las funciones anteriores vía `service_role`. Sí se recomienda (sujeto a aprobación §22.5) endurecer `private.user_role()` para que dependa de `active`, cerrando el único gap real encontrado en la inspección.
- **Creación de admins**: fuera de la UI, sin excepción, sin fecha de "quizá más adelante" — es una decisión de arquitectura, no una limitación temporal del MVP.
- **Contraseñas**: temporal generada por servidor, mostrada una vez, sin dependencia de email transaccional para el MVP.
- **Red**: no restringir operaciones de admin por `ALLOWED_NETWORK_IPS`; compensar con auditoría de IP.
- **Auditoría**: reutilizar los cuatro valores ya existentes en el CHECK de `audit_logs.action` sin necesidad de migración para ellos; añadir un quinto valor solo si se aprueba incluir reset de contraseña en esta fase.

Esta combinación resuelve las 20 secciones pedidas sin añadir infraestructura nueva más allá de tres funciones SQL y sus grants, reutiliza cada patrón que el proyecto ya validó (compensación de creación, advisory lock, tipos cerrados para campos sensibles, chequeo de `active` en cada llamada) y dedica la única complejidad nueva real (funciones `SECURITY DEFINER` con grants restringidos a `service_role`) al único lugar donde de verdad hace falta: las escrituras administrativas atómicas y auditadas.

**Fin del diseño. No se ha modificado código, ejecutado migraciones, cambiado RLS ni creado usuarios.**
