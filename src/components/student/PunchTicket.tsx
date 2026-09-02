"use client";

import { ArrowRight, SignOut } from "@phosphor-icons/react";
import { useState } from "react";

import { punch, refreshPunchStatus } from "@/lib/punches/actions";
import { formatPunchSerial, formatPunchTime } from "@/lib/punches/format";
import type { PunchState } from "@/lib/punches/state";
import type { Workday } from "@/lib/punches/workday";

import { WorkdayEntry } from "./WorkdayEntry";

// Duración fija de la coreografía tras un éxito del servidor (PRINTING +
// STAMP). "VALIDATING" no tiene duración fija propia: dura exactamente lo
// que tarde la petición real — nunca empieza a imprimirse/sellarse antes de
// que el servidor confirme el fichaje.
const T_PRINT = 480;
const T_STAMP = 420;
const T_ISSUED_MESSAGE = 1400;

type Phase = "idle" | "validating" | "printing" | "stamping";

export function PunchTicket({
  studentName,
  academicGroup,
  initialState,
  initialPunchId,
  initialTimestamp,
  recentWorkdays,
}: {
  studentName: string;
  academicGroup: string | null;
  initialState: PunchState;
  initialPunchId: string | null;
  initialTimestamp: string | null;
  recentWorkdays: Workday[];
}) {
  const [state, setState] = useState(initialState);
  const [punchId, setPunchId] = useState(initialPunchId);
  const [timestamp, setTimestamp] = useState(initialTimestamp);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedMessage, setIssuedMessage] = useState(false);

  const isWorking = state === "WORKING";
  const printing = phase === "printing";
  const stamping = phase === "stamping";
  const scanning = phase === "validating";

  function finishPrintingSequence() {
    setPhase("printing");
    window.setTimeout(() => {
      setPhase("stamping");
      window.setTimeout(() => {
        setPhase("idle");
        setPending(false);
        setIssuedMessage(true);
        window.setTimeout(() => setIssuedMessage(false), T_ISSUED_MESSAGE);
      }, T_STAMP);
    }, T_PRINT);
  }

  async function handlePunch() {
    if (pending) return;
    setPending(true);
    setError(null);
    setIssuedMessage(false);
    setPhase("validating");

    let result;
    try {
      result = await punch();
    } catch {
      // Fallo de RED, no de servidor: no sabemos si el punch llegó a
      // crearse. Nunca reintentamos punch() a ciegas (podría duplicarlo) —
      // en vez de eso preguntamos al servidor cuál es el estado real
      // (lectura pura, idempotente) y mostramos eso.
      const recovered = await refreshPunchStatus().catch(() => null);
      setPhase("idle");
      setPending(false);
      if (recovered?.ok) {
        setState(recovered.state);
        setTimestamp(recovered.timestamp);
        setError(
          "Se perdió la conexión al fichar. Hemos comprobado tu estado real: es el que ves arriba.",
        );
      } else {
        setError(
          "No se ha podido conectar con el servidor. Actualiza la página para comprobar tu estado.",
        );
      }
      return;
    }

    if (!result.success) {
      setPhase("idle");
      setPending(false);
      setError(result.message);
      return;
    }

    // El servidor ya ha confirmado el fichaje: a partir de aquí la
    // animación solo "cuenta" lo que ya ha ocurrido de verdad.
    setState(result.state);
    setPunchId(result.id);
    setTimestamp(result.timestamp);
    finishPrintingSequence();
  }

  let buttonLabel: React.ReactNode;
  if (phase === "validating") buttonLabel = "Validando";
  else if (phase === "printing") buttonLabel = "Imprimiendo";
  else if (phase === "stamping") buttonLabel = "Sellando";
  else if (isWorking) {
    buttonLabel = (
      <span className="inline-flex items-center gap-2">
        <SignOut size={16} weight="bold" /> Fichar salida
      </span>
    );
  } else {
    buttonLabel = (
      <span className="inline-flex items-center gap-2">
        <ArrowRight size={16} weight="bold" /> Fichar entrada
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div
        className={`relative grid grid-cols-1 border border-ink bg-paper-raised shadow-[0_18px_34px_-22px_rgba(60,44,16,0.35)] sm:grid-cols-[1fr_200px] ${
          printing ? "motion-safe:animate-print" : ""
        }`}
      >
        {scanning && (
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div className="motion-safe:animate-scan absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-stamp/25 to-transparent" />
          </div>
        )}

        <div className="flex items-center justify-between border-b border-dashed border-line-strong px-6 py-3 sm:col-span-2">
          <span className="font-mono text-xs font-bold tracking-wide text-stamp">
            FICHAJE
          </span>
          <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-faint">
            {punchId && timestamp
              ? formatPunchSerial(timestamp, punchId)
              : "GSD · FP"}
          </span>
        </div>

        <div className="px-6 py-6">
          <div className={printing ? "motion-safe:animate-print-line" : ""}>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
              Alumno
            </span>
            <div className="mt-1 text-lg font-bold text-ink">{studentName}</div>
            {academicGroup && (
              <div className="text-sm text-ink-dim">{academicGroup}</div>
            )}
          </div>

          <div
            className={
              printing ? "motion-safe:animate-print-line mt-6" : "mt-6"
            }
            style={printing ? { animationDelay: "70ms" } : undefined}
          >
            <h2
              data-testid="punch-state"
              className={`text-2xl font-extrabold tracking-tight ${
                isWorking ? "text-stamp" : "text-ink-faint"
              }`}
            >
              {isWorking ? "EN JORNADA" : "NO ESTÁS EN JORNADA"}
            </h2>
            <p className="mt-1 font-mono text-sm text-ink-dim">
              {phase === "validating"
                ? "Validando…"
                : issuedMessage
                  ? "Fichaje validado"
                  : timestamp
                    ? `${isWorking ? "Entrada" : "Última salida"} ${formatPunchTime(timestamp)}`
                    : "Todavía no has fichado hoy"}
            </p>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-4 border-t border-dashed border-line-strong px-5 py-6 sm:border-t-0 sm:border-l">
          <div
            className="relative flex h-20 w-20 items-center justify-center"
            aria-hidden="true"
          >
            <span
              className={`absolute inset-0 rounded-full border-2 border-dashed border-line-strong transition-opacity duration-150 ${
                isWorking ? "opacity-0" : "opacity-100"
              }`}
            />
            {stamping && (
              <span className="motion-safe:animate-ripple absolute inset-1.5 rounded-full border border-stamp" />
            )}
            <span
              className={`flex h-[84px] w-[84px] flex-col items-center justify-center rounded-full border-[2.5px] border-stamp text-stamp transition-opacity duration-150 ${
                isWorking ? "opacity-100" : "opacity-0"
              } ${stamping ? "motion-safe:animate-stamp" : ""}`}
            >
              <span className="font-mono text-[0.6875rem] font-bold tracking-wide">
                GSD
              </span>
              <span className="font-mono text-[0.6875rem] font-bold tracking-wide">
                OK
              </span>
            </span>
          </div>

          <button
            type="button"
            data-testid="punch-button"
            onClick={handlePunch}
            disabled={pending}
            className="w-full border border-ink bg-ink px-4 py-3 font-mono text-sm font-bold uppercase tracking-wide text-paper-raised transition-[transform,background-color] duration-150 ease-out hover:border-stamp-ink hover:bg-stamp-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp active:scale-[0.97] disabled:cursor-default disabled:opacity-70"
          >
            {buttonLabel}
          </button>
        </div>
      </div>

      {recentWorkdays.length > 0 && (
        <div>
          <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
            Últimos fichajes
          </h2>
          <div className="mt-3 border-t border-ink">
            {recentWorkdays.map((w) => (
              <WorkdayEntry key={w.checkIn} workday={w} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
