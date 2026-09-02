import { StudentDirectory } from "@/components/staff/StudentDirectory";
import { requireRole } from "@/lib/auth/session";
import { getStudentDirectory } from "@/lib/staff/queries";

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole(["teacher", "admin"]);

  const { q } = await searchParams;
  const entries = await getStudentDirectory(q);

  return (
    <div>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        Registro
      </span>
      <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">
        Alumnos
      </h1>

      {/* Sin JS: GET nativo a la misma ruta con ?q=, actualiza searchParams. */}
      <form
        method="get"
        className="mt-6 flex max-w-sm items-center border-b border-ink"
      >
        <label htmlFor="q" className="sr-only">
          Buscar por nombre, email o grupo
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre, email o grupo"
          className="w-full bg-transparent py-2 font-mono text-sm text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
        />
        <button
          type="submit"
          className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
        >
          Buscar
        </button>
      </form>

      <StudentDirectory entries={entries} />
    </div>
  );
}
