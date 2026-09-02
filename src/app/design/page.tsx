import Link from "next/link";

const proposals = [
  {
    slug: "b",
    label: "v1",
    name: "Manifiesto",
    description:
      "El punto de partida. El fichaje como pase de embarque: papel de ticket, talón perforado, sello de tinta, manifiesto de alumnos.",
  },
  {
    slug: "b2",
    label: "v2 · dirección elegida",
    name: "Manifiesto, sistema de documento",
    description:
      "El mismo concepto llevado mucho más lejos: el pase como sistema (serie, perforación, código, sello) que se repite en toda la aplicación.",
  },
  {
    slug: "b3",
    label: "v3 · referencia actual",
    name: "Manifiesto, motion e impresión",
    description:
      "La misma dirección visual de v2, sin cambios de composición ni paleta, con el fichaje convertido en una secuencia física: validar, imprimir, sellar, emitir.",
  },
] as const;

export default function DesignExplorationHome() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0B0C0E] px-6 py-16 text-[#F4F4F2]">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <span className="mb-6 rounded-full border border-white/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
          Herramienta interna, no es la app final
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Fichaje
        </h1>
        <p className="mt-2 text-lg text-white/50">Manifiesto, GSD</p>
        <p className="mt-6 max-w-xl text-balance text-sm leading-relaxed text-white/40">
          Una sola dirección visual, en tres momentos de su desarrollo: la
          idea original, el sistema de documento ya maduro, y la versión con
          motion completo. v3 es la referencia actual.
        </p>
      </div>

      <div className="mt-14 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {proposals.map((p) => (
          <Link
            key={p.slug}
            href={`/design/${p.slug}`}
            className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition-colors duration-200 ease-out hover:border-white/25 hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                {p.label}
              </span>
              <h2 className="mt-3 text-xl font-semibold text-white">
                {p.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/45">
                {p.description}
              </p>
            </div>
            <span className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-transform duration-200 ease-out group-hover:translate-x-1">
              Ver propuesta
              <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
