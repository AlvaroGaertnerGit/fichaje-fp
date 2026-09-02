import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16: `middleware.ts` se ha renombrado a `proxy.ts` (misma función).
//
// Esto es una redirección OPTIMISTA, no la barrera de seguridad. Solo lee
// la sesión (JWT) para evitar el viaje de ida y vuelta de renderizar una
// página protegida antes de mandar a /login a alguien sin sesión. La
// autorización real (rol, cuenta activa, qué filas puede leer/escribir)
// siempre se decide en servidor: `requireRole()` en cada layout protegido y
// las políticas de RLS. Aunque este archivo fallara o se eliminara, ningún
// dato quedaría expuesto por ello.
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Sin proyecto Supabase conectado todavía (ver .env.local): no hay forma
  // de comprobar la sesión. Se deja pasar sin redirigir para no romper el
  // entorno de desarrollo antes de tener credenciales reales — la
  // autorización real nunca depende de este archivo.
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  // /registro es pública igual que /login: un alumno sin cuenta debe poder
  // llegar a ambas sin estar autenticado. Un usuario ya autenticado no
  // tiene motivo para volver a ninguna de las dos (ver §13, Fase 5.5).
  const isPublicAuthRoute = pathname === "/login" || pathname === "/registro";

  if (!isAuthenticated && !isPublicAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isPublicAuthRoute) {
    // Optimista: manda a la raíz protegida. El destino final por rol
    // (student → "/", teacher/admin → "/dashboard") lo decide el servidor
    // en requireRole(), que necesita leer profiles y este archivo no debe
    // hacer (nada de fetch de datos lento en el proxy).
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|design).*)"],
};
