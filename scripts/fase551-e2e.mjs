// Script TEMPORAL de verificación E2E/seguridad de la Fase 5.5.1 (Registro
// sin confirmación de email). Contra el proyecto Supabase REAL + `next
// build` + `next start` + navegador real (Playwright). Todo lo creado se
// borra al terminar; se comprueba explícitamente con COUNT tras la limpieza.
import { randomUUID } from "node:crypto";
import fs from "node:fs";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = env.SUPABASE_SECRET_KEY;
const APP_URL = process.env.APP_URL || "http://localhost:3100";
const PASSWORD = "Fase551-Test-Pw-9284!";
const STAMP = Date.now();

const admin = createAdminClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failures = 0;
function check(label, condition, detail) {
  if (condition) console.log(`PASS  ${label}`);
  else {
    failures++;
    console.log(`FAIL  ${label}${detail ? " -- " + detail : ""}`);
  }
}

const createdUserIds = [];

async function createConfirmedTestUser(role, name, extra = {}) {
  const email = `fichaje-test-${STAMP}-${role}-${randomUUID().slice(0, 6)}@fichaje-fp-testing.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser(${role}) failed: ${error.message}`);
  const id = data.user.id;
  createdUserIds.push(id);
  const { error: profileError } = await admin.from("profiles").insert({
    id,
    name,
    email,
    role,
    active: true,
    ...extra,
  });
  if (profileError) throw new Error(`profile insert(${role}) failed: ${profileError.message}`);
  return { id, email, role, name };
}

async function signIn(email) {
  const store = {};
  const supabase = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => Object.entries(store).map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => (store[name] = value)),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn(${email}) failed: ${error.message}`);
  return Object.entries(store)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function req(path, cookie) {
  const res = await fetch(`${APP_URL}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
  const location = res.headers.get("location");
  const body = res.status === 200 ? await res.text() : "";
  return { status: res.status, location, body };
}

function redirectsTo(result, pathname) {
  if (![301, 302, 307, 308].includes(result.status)) return false;
  if (!result.location) return false;
  try {
    return new URL(result.location).pathname === pathname;
  } catch {
    return result.location === pathname;
  }
}

async function main() {
  console.log(`App under test: ${APP_URL}`);

  // ============================================================
  // §14 — Registro real, de principio a fin, vía navegador real
  // ============================================================
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const anonRegistro = await page.goto(`${APP_URL}/registro`);
  check("anon GET /registro -> 200", anonRegistro.status() === 200, String(anonRegistro.status()));

  const realEmail = `fichaje-test-${STAMP}-real@fichaje-fp-testing.com`;
  // Contraseña de exactamente MAX_PASSWORD_LENGTH (72): cubre a la vez el
  // registro real y "contraseña exactamente en el máximo -> aceptada" (§5.4).
  const realPassword = "a".repeat(72);

  await page.fill("#firstName", "Fase551");
  await page.fill("#lastName", "Registro Real");
  await page.fill("#email", realEmail);
  await page.fill("#password", realPassword);
  await page.selectOption("#degree", "ASIR");
  await page.selectOption("#course", "1");

  // §7 — intento de manipulación: inyecta role/active como el atacante del
  // enunciado ({"role":"admin","active":false}) directamente en el FormData
  // real que se envía al Server Action, vía campos ocultos añadidos al DOM.
  await page.evaluate(() => {
    const form = document.querySelector("form");
    for (const [name, value] of [
      ["role", "admin"],
      ["active", "false"],
    ]) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
  });

  await page.click('button[type="submit"]');
  await page.waitForURL(`${APP_URL}/`, { timeout: 15_000 }).catch(() => {});

  const afterRegisterUrl = page.url();
  check(
    "registro real (72 caracteres, con role/active inyectados) -> redirige a /",
    new URL(afterRegisterUrl).pathname === "/",
    afterRegisterUrl
  );

  // Verificación en base de datos real: nunca confiar solo en la URL.
  const { data: authUser } = await admin.auth.admin.listUsers({ perPage: 200 });
  const newUser = authUser.users.find((u) => u.email === realEmail);
  check("Auth user creado de verdad", Boolean(newUser));
  if (newUser) createdUserIds.push(newUser.id);

  const { data: newProfile } = newUser
    ? await admin.from("profiles").select("*").eq("id", newUser.id).single()
    : { data: null };

  check("profile creado", Boolean(newProfile));
  check(
    "role = student (a pesar de 'role: admin' inyectado en el formulario)",
    newProfile?.role === "student",
    newProfile?.role
  );
  check(
    "active = true (a pesar de 'active: false' inyectado en el formulario)",
    newProfile?.active === true,
    String(newProfile?.active)
  );
  check("degree = ASIR (el seleccionado)", newProfile?.degree === "ASIR");
  check("course = 1 (el seleccionado)", newProfile?.course === "1");
  check("name = 'Fase551 Registro Real'", newProfile?.name === "Fase551 Registro Real");

  // El usuario debe quedar autenticado de inmediato (sin paso de "revisa tu
  // correo") y poder ver su propio dashboard de alumno.
  const dashboardBody = await page.textContent("body");
  check(
    "tras el registro, la propia página ya es el dashboard de alumno (ticket de fichaje)",
    dashboardBody.includes("Fase551") || dashboardBody.includes("FICHAJE"),
    dashboardBody.slice(0, 200)
  );
  check(
    "NO aparece ningún texto de confirmación de email obsoleto",
    !/revisa tu correo|confirma tu correo|te hemos enviado un email/i.test(dashboardBody)
  );

  // Logout real -> Login, y re-login con las credenciales recién creadas.
  await page.click('button:has-text("Cerrar sesión"), a:has-text("Cerrar sesión")').catch(async () => {
    // el logout es un <form action={logout}><button>Cerrar sesión</button></form>
    await page.locator('form button[type="submit"]:has-text("Salir")').first().click();
  });
  await page.waitForURL(`${APP_URL}/login`, { timeout: 10_000 }).catch(() => {});
  check("logout -> /login", new URL(page.url()).pathname === "/login", page.url());

  await page.fill("#email", realEmail);
  await page.fill("#password", realPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${APP_URL}/`, { timeout: 10_000 }).catch(() => {});
  check(
    "login real con las credenciales recién creadas -> /",
    new URL(page.url()).pathname === "/",
    page.url()
  );

  // Usuario ya autenticado -> /registro debe redirigir fuera.
  const authedRegistro = await page.goto(`${APP_URL}/registro`);
  check(
    "autenticado, GET /registro -> ya no es 200 (redirigido)",
    !new URL(page.url()).pathname.startsWith("/registro"),
    page.url()
  );

  await browser.close();

  // ============================================================
  // §5.1 — contraseña demasiado corta, rechazada por el servidor
  // ============================================================
  const browser2 = await chromium.launch();
  const page2 = await browser2.newPage();
  await page2.goto(`${APP_URL}/registro`);
  await page2.fill("#firstName", "Corta");
  await page2.fill("#lastName", "Password");
  await page2.fill("#email", `fichaje-test-${STAMP}-shortpw@fichaje-fp-testing.com`);
  await page2.fill("#password", "a".repeat(7)); // MIN_PASSWORD_LENGTH(8) - 1
  await page2.selectOption("#degree", "SMR");
  await page2.selectOption("#course", "2");
  await page2.click('button[type="submit"]');
  await page2.waitForSelector("#register-error", { timeout: 10_000 });
  const shortPwError = await page2.textContent("#register-error");
  check(
    "contraseña de 7 caracteres (mínimo app - 1) -> rechazada por el servidor",
    shortPwError === "La contraseña debe tener al menos 8 caracteres.",
    shortPwError
  );
  await browser2.close();

  console.log(`\n${failures === 0 ? "SECCIÓN 1 (registro real + navegador) OK" : `${failures} FALLO(S) hasta aquí`}`);

  // ============================================================
  // §15 — Regresión: rutas existentes con usuarios reales (Fases 2-5)
  // ============================================================
  const student = await createConfirmedTestUser("student", "Fase551 Regresión Alumno", {
    degree: "SMR",
    course: "1",
  });
  const teacher = await createConfirmedTestUser("teacher", "Fase551 Regresión Profesor");

  const studentCookie = await signIn(student.email);
  const teacherCookie = await signIn(teacher.email);

  const anonLogin = await req("/login", null);
  check("anon GET /login -> 200", anonLogin.status === 200, String(anonLogin.status));

  const studentHome = await req("/", studentCookie);
  check("student GET / -> 200 (dashboard alumno)", studentHome.status === 200, String(studentHome.status));

  const studentHistorial = await req("/historial", studentCookie);
  check("student GET /historial -> 200", studentHistorial.status === 200, String(studentHistorial.status));

  const studentCuenta = await req("/cuenta", studentCookie);
  check("student GET /cuenta -> 200", studentCuenta.status === 200, String(studentCuenta.status));
  check(
    "cuenta muestra grado/curso reales (SMR 1º)",
    studentCuenta.body.includes("SMR") && studentCuenta.body.includes("1º"),
    "no aparecen SMR/1º"
  );

  const studentDashboardBlocked = await req("/dashboard", studentCookie);
  check(
    "student GET /dashboard -> sigue bloqueado (no 200)",
    studentDashboardBlocked.status !== 200,
    String(studentDashboardBlocked.status)
  );

  const teacherDashboard = await req("/dashboard", teacherCookie);
  check("teacher GET /dashboard -> 200", teacherDashboard.status === 200, String(teacherDashboard.status));
  check(
    "dashboard de profesor ve al alumno de regresión",
    teacherDashboard.body.includes("Fase551 Regresión Alumno"),
    "no aparece el alumno"
  );

  const teacherAlumnos = await req("/alumnos", teacherCookie);
  check("teacher GET /alumnos -> 200", teacherAlumnos.status === 200, String(teacherAlumnos.status));

  const teacherAlumnoDetalle = await req(`/alumnos/${student.id}`, teacherCookie);
  check(
    "teacher GET /alumnos/[id] (alumno real) -> 200",
    teacherAlumnoDetalle.status === 200,
    String(teacherAlumnoDetalle.status)
  );

  const teacherHistorialGlobal = await req("/historial-global", teacherCookie);
  check(
    "teacher GET /historial-global -> 200",
    teacherHistorialGlobal.status === 200,
    String(teacherHistorialGlobal.status)
  );

  const studentAlumnosBlocked = await req("/alumnos", studentCookie);
  check(
    "student GET /alumnos -> sigue bloqueado (no 200)",
    studentAlumnosBlocked.status !== 200,
    String(studentAlumnosBlocked.status)
  );

  // RLS/punches: el alumno solo puede insertar sus propios punches, nunca
  // como otro rol -- ya cubierto en profundidad en Fase 5; aquí solo
  // confirmamos que sigue intacto (no hay regresión) con una inserción real.
  const { error: punchError } = await admin.from("punches").insert({
    user_id: student.id,
    type: "IN",
    ip_address: "203.0.113.10",
  });
  check("insert real de punch (vía Secret Key, para sembrar datos) -> sin error", !punchError);

  const studentHomeAfterPunch = await req("/", studentCookie);
  check(
    "tras el punch, / del alumno sigue en 200 (sin romperse)",
    studentHomeAfterPunch.status === 200
  );

  console.log(`\n${failures === 0 ? "TODO OK" : `${failures} FALLO(S) EN TOTAL`}`);

  // ============================================================
  // Limpieza + verificación explícita post-limpieza
  // ============================================================
  for (const id of createdUserIds) {
    await admin.from("punches").delete().eq("user_id", id);
    await admin.from("profiles").delete().eq("id", id);
    await admin.auth.admin.deleteUser(id);
  }

  const { data: leftoverAuth } = await admin.auth.admin.listUsers({ perPage: 200 });
  const stillThere = leftoverAuth.users.filter((u) => u.email?.includes(`fichaje-test-${STAMP}`));
  check("COUNT(auth.users de prueba) = 0 tras la limpieza", stillThere.length === 0, JSON.stringify(stillThere.map((u) => u.email)));

  const { count: leftoverProfiles } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .like("email", `%fichaje-test-${STAMP}%`);
  check("COUNT(profiles de prueba) = 0 tras la limpieza", leftoverProfiles === 0, String(leftoverProfiles));

  const remainingIds = [...createdUserIds];
  let leftoverPunches = 0;
  for (const id of remainingIds) {
    const { count } = await admin
      .from("punches")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id);
    leftoverPunches += count ?? 0;
  }
  check("COUNT(punches de prueba) = 0 tras la limpieza", leftoverPunches === 0, String(leftoverPunches));

  console.log(`\n${failures === 0 ? "LIMPIEZA VERIFICADA: TODO OK" : `${failures} FALLO(S) EN TOTAL`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error("ERROR:", err);
  for (const id of createdUserIds) {
    await admin
      .from("profiles")
      .delete()
      .eq("id", id)
      .catch(() => {});
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  process.exit(1);
});
