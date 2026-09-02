import { ActivityLog } from "@/components/staff/ActivityLog";
import { WorkingRoster } from "@/components/staff/WorkingRoster";
import { requireRole } from "@/lib/auth/session";
import { formatPunchDate } from "@/lib/punches/format";
import { countByState } from "@/lib/staff/roster";
import { getRecentActivity, getStudentRoster } from "@/lib/staff/queries";
import { nowMs } from "@/lib/time";

const RECENT_ACTIVITY_LIMIT = 12;

export default async function StaffDashboardPage() {
  await requireRole(["teacher", "admin"]);

  const now = nowMs();
  const [roster, recentActivity] = await Promise.all([
    getStudentRoster(),
    getRecentActivity(RECENT_ACTIVITY_LIMIT),
  ]);

  const { working, outside } = countByState(roster);
  const workingRoster = roster.filter((entry) => entry.state === "WORKING");

  const stats = [
    { label: "Alumnos", value: roster.length },
    { label: "En jornada", value: working },
    { label: "Fuera", value: outside },
  ];

  return (
    <div>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        Manifiesto de jornadas
      </span>
      <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">
        Hoy · {formatPunchDate(new Date(now).toISOString())}
      </h1>

      <div className="mt-8 grid grid-cols-3 divide-x divide-line border-y border-ink font-mono">
        {stats.map((stat) => (
          <div key={stat.label} className="px-4 py-5 first:pl-0 last:pr-0">
            <div className="text-2xl font-bold tabular-nums text-ink">
              {stat.value}
            </div>
            <div className="mt-1 text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
          Alumnos en jornada
        </h2>
        <WorkingRoster entries={workingRoster} now={now} />
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
          Actividad reciente
        </h2>
        <ActivityLog entries={recentActivity} showDate />
      </section>
    </div>
  );
}
