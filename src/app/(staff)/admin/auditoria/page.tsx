import Link from "next/link";

import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { getAuditLogPage } from "@/lib/admin/queries";

export default async function AdminAuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { entries, hasNextPage } = await getAuditLogPage(page);

  return (
    <div>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        Registro
      </span>
      <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">Auditoría</h1>
      <p className="mt-1 text-sm text-ink-dim">
        Acciones administrativas sobre usuarios, más recientes primero.
      </p>

      <div className="mt-6">
        <AuditLogTable entries={entries} />
      </div>

      {(page > 1 || hasNextPage) && (
        <nav
          className="mt-6 flex items-center justify-between font-mono text-xs uppercase tracking-wide"
          aria-label="Paginación de auditoría"
        >
          {page > 1 ? (
            <Link
              href={page === 2 ? "/admin/auditoria" : `/admin/auditoria?page=${page - 1}`}
              className="text-ink underline decoration-line-strong underline-offset-4 hover:text-stamp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
            >
              ← Más reciente
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-faint">Página {page}</span>
          {hasNextPage ? (
            <Link
              href={`/admin/auditoria?page=${page + 1}`}
              className="text-ink underline decoration-line-strong underline-offset-4 hover:text-stamp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
            >
              Más antiguo →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
