"use client";

import { useState } from "react";

import { currentStudent, today } from "../../_lib/mock-data";
import styles from "../styles.module.css";
import { Flap } from "./Flap";

export function StudentView() {
  const [status, setStatus] = useState(currentStudent.status);
  const [checkIn, setCheckIn] = useState(currentStudent.checkIn ?? "07:41");
  const [busy, setBusy] = useState(false);

  const isWorking = status === "WORKING";

  function handlePunch() {
    if (busy) return;
    setBusy(true);
    if (!isWorking) {
      const now = new Date();
      setCheckIn(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      );
    }
    window.setTimeout(() => {
      setStatus((s) => (s === "WORKING" ? "OUTSIDE" : "WORKING"));
      setBusy(false);
    }, 260);
  }

  return (
    <div className={styles.viewEnter}>
      <span className={styles.eyebrow}>{today.date}</span>
      <h1 className={styles.title}>Buenos días, {currentStudent.name.split(" ")[0]}</h1>

      <div className={styles.pass}>
        <div className={styles.passMain}>
          <span className={styles.passLabel}>Estado</span>
          <Flap label={isWorking ? "DENTRO" : "FUERA"} tone={isWorking ? "positive" : "default"} />
          <div className={styles.passTime}>
            {isWorking ? `Entrada ${checkIn}` : `Última salida ${currentStudent.recent[0].checkOut}`}
          </div>

          <div className={styles.passFooter}>
            <div className={styles.passField}>
              <span className={styles.passFieldLabel}>Alumno</span>
              <span className={styles.passFieldValue}>{currentStudent.name}</span>
            </div>
            <div className={styles.passField}>
              <span className={styles.passFieldLabel}>Grupo</span>
              <span className={styles.passFieldValue}>{currentStudent.classGroup}</span>
            </div>
          </div>
        </div>

        <div className={styles.passStub}>
          <span className={styles.notchTop} aria-hidden="true" />
          <div className={styles.stampZone}>
            <span className={isWorking ? styles.stampMarkVisible : styles.stampMarkHidden} aria-hidden="true">
              <span className={styles.stampWord}>GSD</span>
              <span className={styles.stampWord}>OK</span>
            </span>
          </div>
          <div className={styles.barcode} aria-hidden="true" />
          <button type="button" className={styles.passAction} onClick={handlePunch} disabled={busy}>
            {busy ? "Sellando" : isWorking ? "Fichar salida" : "Fichar entrada"}
          </button>
          <span className={styles.notchBottom} aria-hidden="true" />
        </div>
      </div>
      <p className={styles.passHint}>
        {isWorking
          ? "Tu pase queda sellado mientras dure tu jornada."
          : "Solo puede ficharse desde la red del centro."}
      </p>

      <div className={styles.sectionHead}>
        <span className={styles.sectionTitle}>Fichajes anteriores</span>
        <span className={styles.eyebrow}>{currentStudent.classGroup}</span>
      </div>
      <div className={styles.logList}>
        {currentStudent.recent.map((r) => (
          <div key={r.date} className={styles.logRow}>
            <span className={styles.logDate}>{r.date}</span>
            <span>
              {r.checkIn} → {r.checkOut}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
