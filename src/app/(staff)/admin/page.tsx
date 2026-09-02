import Link from "next/link";

import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { getAdminDashboardStats, getRecentAuditActivity } from "@/lib/admin/queries";

const RECENT_ACTIVITY_LIMIT = 8;

export default async function AdminDashboardPage() {
  const [stats, recentActivity] = await Promise.all([
    getAdminDashboardStats(),
    getRecentAuditActivity(RECENT_ACTIVITY_LIMIT),
  ]);

  const primaryStats = [
    { label: "Usuarios", value: stats.totalUsers },
    { label: "Activos", value: stats.active },
    { label: "Inactivos", value: stats.inactive },
  ];
  const roleStats = [
    { label: "Alumnos", value: stats.students },
    { label: "Profesores", value: stats.teachers },
    { label: "Admins", value: stats.admins },
  ];

  return (
    <div>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        Manifiesto de control
      </span>
      <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">Admin</h1>

      <div className="mt-8 divide-y divide-line border-y border-ink font-mono">
        <div className="grid grid-cols-3 divide-x divide-line">
          {primaryStats.map((stat) => (
            <div key={stat.label} className="px-4 py-5 first:pl-0 last:pr-0">
              <div className="text-2xl font-bold tabular-nums text-ink">{stat.value}</div>
              <div className="mt-1 text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 divide-x divide-line">
          {roleStats.map((stat) => (
            <div key={stat.label} className="px-4 py-5 first:pl-0 last:pr-0">
              <div className="text-2xl font-bold tabular-nums text-ink">{stat.value}</div>
              <div className="mt-1 text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
            Actividad administrativa reciente
          </h2>
          <Link
            href="/admin/auditoria"
            className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-dim underline decoration-line-strong underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
          >
            Ver todo →
          </Link>
        </div>
        <AuditLogTable entries={recentActivity} />
      </section>
    </div>
  );
}
