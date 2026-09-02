import { StudentNavigation } from "@/components/student/StudentNavigation";
import { requireRole } from "@/lib/auth/session";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["student"]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <StudentNavigation studentName={profile.name} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
