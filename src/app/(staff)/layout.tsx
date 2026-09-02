import { StaffNavigation } from "@/components/staff/StaffNavigation";
import { requireRole } from "@/lib/auth/session";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["teacher", "admin"]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <StaffNavigation staffName={profile.name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
