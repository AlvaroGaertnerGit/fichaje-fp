import { AdminSubNav } from "@/components/admin/AdminSubNav";
import { requireRole } from "@/lib/auth/session";

// Segundo guard de servidor, específico de Admin, encima del
// requireRole(['teacher','admin']) que ya exige el layout de (staff) — un
// teacher no debe llegar aquí ni siquiera compartiendo la misma cabecera
// (Fase 6.0 §2/§18, Fase 6.1 §2). No es una comprobación redundante: cada
// capa protegida se verifica en su propio punto de entrada, nunca se
// asume que la capa exterior ya cubrió esta.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["admin"]);

  return (
    <div>
      <AdminSubNav />
      <div className="mt-8">{children}</div>
    </div>
  );
}
