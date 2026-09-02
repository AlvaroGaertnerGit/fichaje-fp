export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-paper px-6 py-12">
      <div className="motion-safe:animate-ticket-in w-full max-w-sm border border-ink bg-paper-raised">
        <div className="flex items-center justify-between border-b border-dashed border-line-strong px-6 py-3.5">
          <span className="text-sm font-extrabold tracking-tight text-ink">Fichaje</span>
          <span className="border border-stamp px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold tracking-wide text-stamp-ink">
            GSD · FP
          </span>
        </div>
        <div className="px-6 py-7">{children}</div>
      </div>
    </main>
  );
}
