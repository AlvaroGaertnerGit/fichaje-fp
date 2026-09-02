"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/auditoria", label: "Auditoría" },
] as const;

// Sub-navegación dentro del área Admin, anidada bajo la cabecera de
// StaffNavigation (que ya tiene Dashboard/Alumnos/Historial + Admin +
// Cerrar sesión) — no se duplica esa cabecera ni el logout aquí, solo se
// distinguen las tres secciones internas de /admin (Fase 6.1 §28).
//
// Fase 6.1.1: la primera pestaña se llama "Resumen", no "Dashboard" — la
// cabecera principal ya tiene un enlace "Dashboard" que apunta a
// /dashboard (el del teacher), y repetir la misma palabra aquí para una
// página distinta hacía imposible saber cuál era cuál con una mirada
// rápida. También se demota deliberadamente el peso visual de esta barra
// (tipografía más pequeña, indicador de "activo" neutro en vez del acento
// stamp) para que se lea como un segundo nivel de la navegación principal,
// no como una barra de pestañas equivalente apilada encima.
export function AdminSubNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación de administración"
      className="flex items-center gap-1 border-b border-line"
    >
      {links.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 px-3 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp ${
              active
                ? "border-ink text-ink"
                : "border-transparent text-ink-faint hover:text-ink-dim"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
