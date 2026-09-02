"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/lib/auth/actions";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/alumnos", label: "Alumnos" },
  { href: "/historial-global", label: "Historial" },
] as const;

export function StaffNavigation({ staffName }: { staffName: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-ink">
      <div className="mx-auto flex max-w-5xl items-center gap-8 px-6 py-4">
        <span className="text-sm font-extrabold tracking-tight text-ink">
          Fichaje
        </span>

        <nav
          className="flex items-center gap-1"
          aria-label="Navegación principal"
        >
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`border-b-2 px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp ${
                  active
                    ? "border-stamp text-ink"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <span className="hidden font-mono text-xs text-ink-faint sm:inline">
            {staffName}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="font-mono text-xs uppercase tracking-wide text-ink-dim underline decoration-line-strong underline-offset-4 transition-colors duration-150 ease-out hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
