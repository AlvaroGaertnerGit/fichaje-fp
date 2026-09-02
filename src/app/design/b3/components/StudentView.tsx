"use client";

import { useState } from "react";

import { currentStudent, today } from "../../_lib/mock-data";
import { serialFor } from "../_lib/barcode";
import styles from "../styles.module.css";
import { Pass, type PassPhase } from "./Pass";

const TODAY_SERIAL = serialFor(currentStudent.name + today.date);

// Duraciones del evento de fichaje (ver cabecera de styles.module.css):
// VALIDANDO 280ms → IMPRIMIENDO 480ms → SELLO 420ms → EMITIDO
const T_VALIDATE = 280;
const T_PRINT = 480;
const T_STAMP = 420;

export function StudentView() {
  const [status, setStatus] = useState(currentStudent.status);
  const [checkIn, setCheckIn] = useState(currentStudent.checkIn ?? "07:41");
  const [phase, setPhase] = useState<PassPhase>("idle");
  const [busy, setBusy] = useState(false);
  const [todayEntry, setTodayEntry] = useState<{ checkIn: string | null; checkOut: string | null }>({
    checkIn: currentStudent.checkIn,
    checkOut: null,
  });

  const isWorking = status === "WORKING";

  function handlePunch() {
    if (busy) return;
    setBusy(true);
    setPhase("validating");

    window.setTimeout(() => {
      setPhase("printing");

      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      if (isWorking) {
        setTodayEntry((e) => ({ ...e, checkOut: time }));
      } else {
        setCheckIn(time);
        setTodayEntry({ checkIn: time, checkOut: null });
      }
      setStatus((s) => (s === "WORKING" ? "OUTSIDE" : "WORKING"));
    }, T_VALIDATE);

    window.setTimeout(() => {
      setPhase("stamping");
    }, T_VALIDATE + T_PRINT);

    window.setTimeout(() => {
      setPhase("idle");
      setBusy(false);
    }, T_VALIDATE + T_PRINT + T_STAMP);
  }

  return (
    <div className={styles.viewEnter}>
      <span className={styles.eyebrow}>{today.date}</span>
      <h1 className={styles.title}>Buenos días, {currentStudent.name.split(" ")[0]}</h1>

      <Pass
        name={currentStudent.name}
        classGroup={currentStudent.classGroup}
        serial={TODAY_SERIAL}
        validated={isWorking}
        phase={phase}
        fading={false}
        timeLabel={isWorking ? "Entrada validada" : "Última salida"}
        timeValue={isWorking ? checkIn : currentStudent.recent[0].checkOut ?? ""}
        barcodeSeed={currentStudent.name}
        action={{
          label: isWorking ? "Fichar salida" : "Fichar entrada",
          busy,
          onPress: handlePunch,
        }}
      />
      <p className={styles.passHint}>
        {isWorking
          ? "Al fichar salida se cierra la jornada y queda archivada."
          : "Solo puede ficharse desde la red del centro."}
      </p>

      <div className={styles.sectionHead}>
        <span className={styles.sectionTitle}>Archivo de jornadas</span>
        <span className={styles.eyebrow}>{currentStudent.classGroup}</span>
      </div>

      <div className={styles.archive}>
        {todayEntry.checkIn && (
          <div
            key={`${todayEntry.checkIn}-${todayEntry.checkOut}`}
            className={phase === "idle" && !busy ? styles.archiveFresh : styles.archiveRow}
          >
            <span className={styles.archiveSerial}>№{TODAY_SERIAL}</span>
            <span className={styles.archiveDate}>Hoy</span>
            <span className={styles.archiveTimes}>
              {todayEntry.checkIn} → {todayEntry.checkOut ?? "en curso"}
            </span>
            <span className={styles.archiveDuration}>{todayEntry.checkOut ? "5h 59m" : ""}</span>
            <span className={styles.archiveGlyph} aria-hidden="true" />
          </div>
        )}
        {currentStudent.recent.map((r, i) => (
          <div
            key={r.date}
            className={`${styles.archiveRow} ${styles.archiveSettleIn}`}
            style={{ ["--row-i" as string]: i + 1 }}
          >
            <span className={styles.archiveSerial}>№{serialFor(currentStudent.name + r.date)}</span>
            <span className={styles.archiveDate}>{r.date}</span>
            <span className={styles.archiveTimes}>
              {r.checkIn} → {r.checkOut}
            </span>
            <span className={styles.archiveDuration}>5h 58m</span>
            <span className={styles.archiveGlyph} aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}
