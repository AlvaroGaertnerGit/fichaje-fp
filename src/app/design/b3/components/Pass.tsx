"use client";

import { barcodeBars } from "../_lib/barcode";
import styles from "../styles.module.css";
import { Flap } from "./Flap";

// LISTO → VALIDANDO → IMPRIMIENDO → SELLO → (vuelta a idle = EMITIDO)
export type PassPhase = "idle" | "validating" | "printing" | "stamping";

export function Pass({
  name,
  classGroup,
  serial,
  validated,
  phase,
  fading,
  timeLabel,
  timeValue,
  barcodeSeed,
  action,
}: {
  name: string;
  classGroup: string;
  serial: string;
  validated: boolean;
  phase: PassPhase;
  fading: boolean;
  timeLabel: string;
  timeValue: string;
  barcodeSeed: string;
  action?: {
    label: string;
    busy: boolean;
    onPress: () => void;
  };
}) {
  const bars = barcodeBars(barcodeSeed);
  const scanning = phase === "validating";
  const printing = phase === "printing";
  const stampingPhase = phase === "stamping";

  const lineClass = printing ? styles.printLine : "";
  const lineStyle = (i: number) => (printing ? { ["--line-i" as string]: i } : undefined);

  return (
    <div
      className={[
        styles.pass,
        scanning ? styles.passScanActive : "",
        printing ? styles.passPrinting : "",
        stampingPhase ? `${styles.passImpact} ${styles.passSettle}` : "",
      ].join(" ")}
    >
      <div className={styles.passScan} aria-hidden="true">
        <div className={styles.passScanLine} />
      </div>
      {printing && <div className={styles.printHead} aria-hidden="true" />}

      <div className={styles.passHead}>
        <span className={styles.passSerial}>JORNADA № {serial}</span>
        <span className={styles.passIssued}>GSD · FP</span>
      </div>

      <div className={styles.passMain}>
        <div className={lineClass} style={lineStyle(0)}>
          <span className={styles.passFieldLabel}>Alumno</span>
          <div className={styles.passName}>{name}</div>
          <div className={styles.passMeta}>{classGroup}</div>
        </div>

        <div className={styles.statusRow + " " + lineClass} style={lineStyle(1)}>
          <Flap label={validated ? "VALIDADO" : "LISTO"} validated={validated} />
          <span className={fading ? styles.statusDetailFading : styles.statusDetail}>
            {phase === "validating" ? "Validando…" : `${timeLabel} ${timeValue}`}
          </span>
        </div>

        <div className={styles.passFooter + " " + lineClass} style={lineStyle(2)}>
          <div className={styles.passField}>
            <span className={styles.passFieldLabel}>Grupo</span>
            <span className={styles.passFieldValue}>{classGroup}</span>
          </div>
          <div className={styles.passField}>
            <span className={styles.passFieldLabel}>Emisor</span>
            <span className={styles.passFieldValue}>GSD Educación</span>
          </div>
        </div>

        <p className={styles.microtext + " " + lineClass} style={lineStyle(3)}>
          Documento de uso interno · control de jornada
        </p>
      </div>

      <div className={styles.passStub}>
        <span className={styles.perfDotTop} aria-hidden="true" />

        <div className={styles.stampZone}>
          <span className={validated ? styles.stampRingGone : styles.stampRingHidden} aria-hidden="true" />
          {stampingPhase && <span className={styles.stampRippling} aria-hidden="true" />}
          <span className={validated ? styles.stampMarkVisible : styles.stampMarkHidden} aria-hidden="true">
            <span className={styles.stampWord}>GSD</span>
            <span className={styles.stampWord}>OK</span>
          </span>
        </div>

        <div className={styles.barcode} aria-hidden="true">
          {bars.map((w, i) => (
            <span key={i} className={styles.barcodeBar} style={{ width: `${w}px` }} />
          ))}
        </div>

        {action && (
          <button type="button" className={styles.passAction} onClick={action.onPress} disabled={action.busy}>
            {phase === "validating"
              ? "Validando"
              : phase === "printing"
                ? "Imprimiendo"
                : phase === "stamping"
                  ? "Sellando"
                  : action.label}
          </button>
        )}

        <span className={styles.perfDotBottom} aria-hidden="true" />
      </div>
    </div>
  );
}
