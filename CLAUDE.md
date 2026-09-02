# Fichaje FP

## 1. Propósito del proyecto

Fichaje FP es una aplicación web para simular un sistema de control horario empresarial dentro de un centro de Formación Profesional.

Los alumnos utilizarán principalmente los ordenadores del centro para registrar su entrada y salida de la jornada.

Los profesores podrán supervisar los fichajes de todos los alumnos y los administradores podrán gestionar usuarios y permisos.

El objetivo es crear una aplicación pequeña pero profesional que sirva tanto como herramienta de simulación empresarial como recurso didáctico para trabajar conceptos reales de desarrollo web.

---

# 2. Principios del proyecto

Prioridades:

1. Funcionalidad.
2. Seguridad.
3. UX.
4. Diseño visual.
5. Mantenibilidad.
6. Escalabilidad razonable.

No implementar funcionalidades innecesarias.

No hacer sobreingeniería.

Antes de añadir una funcionalidad nueva, comprobar que pertenece al MVP o que es necesaria para soportar correctamente una funcionalidad existente.

---

# 3. Stack tecnológico

## Frontend

* Next.js.
* React.
* TypeScript.
* Tailwind CSS.
* App Router.

## Backend

* Next.js Server Actions y/o Route Handlers cuando corresponda.

## Base de datos

* Supabase PostgreSQL.

## Autenticación

* Supabase Auth.

## Autorización

* Roles.
* Server-side authorization.
* PostgreSQL Row Level Security (RLS).

## PWA

La aplicación debe poder instalarse como PWA.

El dispositivo principal de uso será el ordenador del centro.

La interfaz debe ser responsive, pero el diseño principal será desktop-first.

## Deployment

* Vercel.

---

# 4. Usuarios y roles

Existen tres roles:

## student

Alumno.

Puede:

* Iniciar sesión.
* Consultar su estado.
* Fichar entrada.
* Fichar salida.
* Consultar su propio historial.
* Cerrar sesión.

No puede:

* Consultar fichajes de otros usuarios.
* Modificar fichajes.
* Gestionar usuarios.
* Cambiar roles.
* Acceder a funciones administrativas.

---

## teacher

Profesor.

Puede:

* Iniciar sesión.
* Acceder al dashboard de profesor.
* Ver todos los alumnos.
* Ver quién está trabajando.
* Ver quién está fuera.
* Consultar el historial de todos los alumnos.
* Filtrar por alumno y fechas.
* Consultar el historial individual.
* Corregir fichajes.
* Registrar incidencias relacionadas con fichajes.
* Exportar información.

No puede modificar sus propios permisos ni convertirse en administrador.

---

## admin

Administrador.

Tiene todos los permisos de teacher y además puede:

* Crear usuarios.
* Desactivar usuarios.
* Reactivar usuarios.
* Cambiar roles.
* Consultar auditoría.
* Gestionar configuraciones administrativas.

---

# 5. Seguridad de roles

Nunca confiar únicamente en comprobaciones realizadas en el frontend.

Esto NO es suficiente:

```ts
if (user.role === "admin") {
  // mostrar interfaz
}
```

El frontend puede ocultar interfaces, pero los permisos reales deben comprobarse en servidor y en la base de datos.

Utilizar:

* Server-side authorization.
* Supabase RLS.
* Políticas de PostgreSQL.

Un alumno no debe poder consultar los fichajes de otro aunque manipule las peticiones desde DevTools.

---

# 6. Modelo de datos

El MVP utilizará inicialmente tres entidades principales.

## profiles

Información de los usuarios.

Campos previstos:

```text
id
name
email
role
class_group
active
created_at
updated_at
```

Roles:

```text
student
teacher
admin
```

---

## punches

Registros de fichaje.

Campos previstos:

```text
id
user_id
type
timestamp
ip_address
user_agent
created_at
```

Tipos:

```text
IN
OUT
```

---

## audit_logs

Registro de acciones administrativas relevantes.

Campos previstos:

```text
id
user_id
action
target_user_id
metadata
ip_address
created_at
```

Las modificaciones administrativas importantes deben quedar registradas.

---

# 7. Lógica de fichaje

Un usuario puede encontrarse en uno de estos estados:

```text
OUTSIDE
WORKING
```

Si está fuera:

```text
FICHAR ENTRADA
```

Si está trabajando:

```text
FICHAR SALIDA
```

La secuencia válida es:

```text
OUTSIDE
    ↓
IN
    ↓
WORKING
    ↓
OUT
    ↓
OUTSIDE
```

No permitir secuencias inválidas como:

```text
IN
IN
```

o:

```text
OUT
OUT
```

El servidor debe determinar el estado real consultando los datos almacenados.

Nunca confiar en un estado enviado por el cliente.

Las operaciones de fichaje deben ser seguras frente a doble click y peticiones duplicadas.

---

# 8. Restricción de red

Los alumnos solamente pueden registrar fichajes cuando están conectados a la red autorizada del centro.

La aplicación puede ser accesible desde Internet, pero la creación de fichajes debe estar restringida.

La comprobación debe hacerse en servidor.

Debe comprobarse la IP pública desde la que llega la petición.

No utilizar IPs privadas como:

```text
192.168.x.x
10.x.x.x
172.16.x.x
```

como mecanismo de autorización de red.

La configuración debe poder realizarse mediante variables de entorno.

Ejemplo:

```text
ALLOWED_NETWORK_IPS
```

La operación de fichaje debe seguir este flujo:

```text
Petición
    ↓
Servidor
    ↓
Obtener IP del cliente
    ↓
Comprobar red autorizada
    ↓
¿Permitida?
    ├── NO → rechazar
    └── SÍ → procesar fichaje
```

Si la red no está autorizada, mostrar un mensaje comprensible.

Ejemplo:

> No puedes fichar desde esta red. Conéctate a la red del centro para registrar tu jornada.

La IP utilizada debe almacenarse en el registro del fichaje.

---

# 9. Auditoría

Las modificaciones realizadas por profesores o administradores deben poder auditarse.

Especialmente:

* Corrección de fichajes.
* Creación de usuarios.
* Desactivación de usuarios.
* Cambio de roles.

Ejemplo:

```text
Profesor modificó el fichaje de Carlos López.

Antes:
08:03 → —

Después:
08:03 → 14:05

Motivo:
Olvidó fichar la salida.
```

---

# 10. Diseño

La aplicación debe tener apariencia de producto SaaS profesional.

Principios:

* Desktop-first.
* Responsive.
* Limpio.
* Moderno.
* Premium.
* Profesional.
* Excelente jerarquía visual.
* Tipografía cuidada.
* Espaciado consistente.
* Estados muy claros.
* Microinteracciones útiles.
* Animaciones sutiles.

Evitar:

* Apariencia de aplicación escolar genérica.
* Bootstrap visual por defecto.
* Interfaces anticuadas.
* Exceso de tarjetas.
* Decoración sin función.
* Gradientes utilizados indiscriminadamente.
* Componentes visualmente inconsistentes.

Las skills de diseño disponibles en `.claude/skills/` deben consultarse y utilizarse cuando sean relevantes.

---

# 11. Experiencia del alumno

La pantalla principal del alumno debe permitir entender inmediatamente:

* Quién está conectado.
* Si está dentro o fuera.
* Cuándo ha fichado.
* Qué acción puede realizar.

El botón principal debe ser muy evidente.

Si está fuera:

```text
FUERA DEL CENTRO

[FICHAR ENTRADA]
```

Si está trabajando:

```text
JORNADA ACTIVA

Entrada: 08:03

[FICHAR SALIDA]
```

El flujo debe poder realizarse rápidamente desde un ordenador.

---

# 12. Experiencia del profesor

El dashboard debe permitir consultar rápidamente:

* Número de alumnos presentes.
* Número de alumnos fuera.
* Estado individual.
* Hora de entrada.
* Hora de salida.
* Historial.

Debe poder buscar y filtrar alumnos.

---

# 13. Experiencia del administrador

El administrador tendrá acceso a:

* Gestión de usuarios.
* Roles.
* Activación/desactivación.
* Auditoría.

La gestión administrativa debe estar separada de la experiencia normal del alumno.

---

# 14. PWA

La aplicación debe estar preparada para instalarse como PWA.

El funcionamiento offline NO debe permitir realizar fichajes.

Los fichajes necesitan conexión para:

* Validar autenticación.
* Validar permisos.
* Validar red.
* Registrar correctamente la operación.

La PWA puede proporcionar una experiencia de instalación y carga apropiada, pero el backend siempre debe validar las operaciones importantes.

---

# 15. MVP

El MVP debe incluir:

* Autenticación.
* Roles.
* Alumno.
* Entrada.
* Salida.
* Historial del alumno.
* Dashboard profesor.
* Historial global.
* Detalle de alumno.
* Corrección de fichajes.
* Gestión de usuarios.
* Gestión de roles.
* Auditoría.
* Restricción por IP.
* RLS.
* PWA.
* Responsive.
* Deployment en Vercel.

No implementar todavía:

* Nóminas.
* Vacaciones.
* Reconocimiento facial.
* Biometría.
* Geolocalización.
* QR.
* Turnos complejos.
* Integraciones externas.
* Multi-centro.
* Notificaciones avanzadas.

---

# 16. Metodología de desarrollo

El proyecto se desarrollará por fases.

No implementar todo el proyecto de golpe.

Cada fase debe:

1. Analizar el estado actual.
2. Implementar únicamente lo necesario.
3. Ejecutar lint/typecheck/build cuando corresponda.
4. Comprobar errores.
5. Corregirlos.
6. Verificar que las funcionalidades anteriores siguen funcionando.
7. Documentar decisiones importantes.
8. Continuar con la siguiente fase.

No avanzar dejando errores conocidos.

---

# 17. Calidad del código

Priorizar:

* TypeScript estricto.
* Componentes reutilizables.
* Nombres descriptivos.
* Separación clara de responsabilidades.
* Server Components cuando sean apropiados.
* Client Components únicamente cuando sean necesarios.
* Validación de datos.
* Manejo correcto de errores.
* Estados de loading.
* Estados vacíos.
* Estados de error.

Evitar:

* `any` salvo que exista una razón justificada.
* Código duplicado.
* Lógica de negocio crítica exclusivamente en componentes.
* Secretos en el frontend.
* Credenciales hardcodeadas.
* Bypass de RLS.
* Soluciones temporales que se mantengan en producción.

---

# 18. Variables de entorno

Los secretos y configuraciones sensibles deben utilizar variables de entorno.

Nunca introducir:

* claves privadas.
* service role keys.
* secretos.
* credenciales.

directamente en el código fuente.

Utilizar `.env.local` para desarrollo.

El archivo `.env.local` nunca debe entrar en Git.

---

# 19. Regla importante para Supabase

La `service_role` key nunca debe exponerse al cliente.

El código ejecutado en navegador solamente debe utilizar credenciales diseñadas para el cliente.

Las operaciones privilegiadas deben ejecutarse en servidor.

---

# 20. Regla importante sobre cambios de arquitectura

No cambiar el stack principal sin una razón técnica clara.

Stack establecido:

```text
Next.js
React
TypeScript
Tailwind
Supabase
Vercel
```

Si existe una decisión arquitectónica dudosa, analizar primero las alternativas y elegir la opción más sencilla que mantenga seguridad y mantenibilidad.

---

# 21. Criterio de terminado

Una funcionalidad no se considera terminada simplemente porque "funcione" visualmente.

Debe:

* Funcionar correctamente.
* Tener estados de loading/error.
* Respetar roles.
* Respetar RLS cuando corresponda.
* No exponer información privada.
* Funcionar en responsive.
* No romper funcionalidades existentes.
* Pasar las comprobaciones de TypeScript/lint/build correspondientes.

---

# 22. Objetivo final

El objetivo es terminar con una aplicación desplegada y funcional que permita realizar esta prueba:

Alumno:

```text
Login
 ↓
Ver estado
 ↓
Fichar entrada
 ↓
Jornada activa
 ↓
Fichar salida
 ↓
Consultar historial
```

Profesor:

```text
Login
 ↓
Dashboard
 ↓
Ver alumnos
 ↓
Consultar historial
 ↓
Filtrar
 ↓
Corregir fichajes
 ↓
Auditoría
 ↓
Exportar
```

Administrador:

```text
Login
 ↓
Gestión de usuarios
 ↓
Gestionar roles
 ↓
Auditoría
```

Y el sistema debe impedir que un alumno registre un fichaje desde una red no autorizada.
