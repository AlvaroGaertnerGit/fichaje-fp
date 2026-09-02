import { PunchTicket } from "@/components/student/PunchTicket";
import { formatDegreeCourse } from "@/lib/academic";
import { requireRole } from "@/lib/auth/session";
import { formatPunchDate } from "@/lib/punches/format";
import { getCurrentPunchState, getMyPunches } from "@/lib/punches/queries";
import { pairPunchesIntoWorkdays } from "@/lib/punches/workday";

export default async function StudentHomePage() {
  const profile = await requireRole(["student"]);
  const [{ state, lastPunch }, recentPunches] = await Promise.all([
    getCurrentPunchState(profile.id),
    getMyPunches(6),
  ]);

  const recentWorkdays = pairPunchesIntoWorkdays(recentPunches).slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-6 py-10">
      <div>
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
          {formatPunchDate(new Date().toISOString())}
        </span>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">
          Buenos días, {profile.name.split(" ")[0]}
        </h1>
      </div>

      <PunchTicket
        studentName={profile.name}
        academicGroup={formatDegreeCourse(profile.degree, profile.course)}
        initialState={state}
        initialPunchId={lastPunch?.id ?? null}
        initialTimestamp={lastPunch?.timestamp ?? null}
        recentWorkdays={recentWorkdays}
      />
    </div>
  );
}
