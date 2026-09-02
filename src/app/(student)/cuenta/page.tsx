import { formatDegreeCourse } from "@/lib/academic";
import { logout } from "@/lib/auth/actions";
import { requireRole } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

// Página exclusivamente de lectura: el alumno puede consultar sus propios
// datos, nunca cambiarlos desde aquí. role/active/id son competencia
// exclusiva de administración (fase futura) — no hay ningún formulario que
// los transporte.
export default async function CuentaPage() {
  const profile = await requireRole(["student"]);

  const fields = [
    { label: "Nombre", value: profile.name },
    { label: "Email", value: profile.email },
    {
      label: "Grado y curso",
      value:
        formatDegreeCourse(profile.degree, profile.course) ?? "Sin asignar",
    },
    {
      label: "Estado de la cuenta",
      value: profile.active ? "Activa" : "Desactivada",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        Perfil
      </span>
      <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">Cuenta</h1>

      <div className="mt-6 border border-ink bg-paper-raised">
        {fields.map((f) => (
          <div
            key={f.label}
            className="flex items-center justify-between border-b border-dashed border-line px-6 py-4 last:border-b-0"
          >
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
              {f.label}
            </span>
            <span className="text-sm font-semibold text-ink">{f.value}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-ink-dim">
        Tu rol y el estado de tu cuenta los gestiona administración. Si
        necesitas un cambio, contacta con el centro.
      </p>

      <form action={logout} className="mt-6">
        <Button type="submit" variant="ghost">
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
