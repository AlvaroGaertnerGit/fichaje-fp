"use client";

import { barcodeBars } from "../_lib/barcode";
import styles from "../styles.module.css";
import { Flap } from "./Flap";

export type PassPhase = "idle" | "validating" | "stamping" | "issued";

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
  const rippling = phase === "stamping";

  return (
    <div className={`${styles.pass} ${scanning ? styles.passScanActive : ""}`}>
      <div className={styles.passScan} aria-hidden="true">
        <div className={styles.passScanLine} />
      </div>

      <div className={styles.passHead}>
        <span className={styles.passSerial}>JORNADA № {serial}</span>
        <span className={styles.passIssued}>GSD · FP</span>
      </div>

      <div className={styles.passMain}>
        <span className={styles.passFieldLabel}>Alumno</span>
        <div className={styles.passName}>{name}</div>
        <div className={styles.passMeta}>{classGroup}</div>

        <div className={styles.statusRow}>
          <Flap label={validated ? "VALIDADO" : "LISTO"} validated={validated} />
          <span className={fading ? styles.statusDetailFading : styles.statusDetail}>
            {phase === "validating" ? "Validando…" : `${timeLabel} ${timeValue}`}
          </span>
        </div>

        <div className={styles.passFooter}>
          <div className={styles.passField}>
            <span className={styles.passFieldLabel}>Grupo</span>
            <span className={styles.passFieldValue}>{classGroup}</span>
          </div>
          <div className={styles.passField}>
            <span className={styles.passFieldLabel}>Emisor</span>
            <span className={styles.passFieldValue}>GSD Educación</span>
          </div>
        </div>

        <p className={styles.microtext}>Documento de uso interno · control de jornada</p>
      </div>

      <div className={styles.passStub}>
        <span className={styles.perfDotTop} aria-hidden="true" />

        <div className={styles.stampZone}>
          <span className={validated ? styles.stampRingGone : styles.stampRingHidden} aria-hidden="true" />
          {rippling && <span className={styles.stampRippling} aria-hidden="true" />}
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
            {phase === "validating" ? "Validando" : phase === "stamping" ? "Sellando" : action.label}
          </button>
        )}

        <span className={styles.perfDotBottom} aria-hidden="true" />
      </div>
    </div>
  );
}
