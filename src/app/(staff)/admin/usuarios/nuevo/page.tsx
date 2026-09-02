import { CreateUserForm } from "@/components/admin/CreateUserForm";

export default function AdminNuevoUsuarioPage() {
  return (
    <div>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        Alta
      </span>
      <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">Nuevo usuario</h1>
      <p className="mt-1 max-w-md text-sm text-ink-dim">
        Crea una cuenta de alumno o profesor. Nunca se puede crear un
        administrador desde aquí.
      </p>

      <div className="mt-8">
        <CreateUserForm />
      </div>
    </div>
  );
}
