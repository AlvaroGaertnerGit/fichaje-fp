"use client";

import { useState } from "react";

import { currentStudent, today } from "../../_lib/mock-data";
import { serialFor } from "../_lib/barcode";
import styles from "../styles.module.css";
import { Pass, type PassPhase } from "./Pass";

const TODAY_SERIAL = serialFor(currentStudent.name + today.date);

export function StudentView() {
  const [status, setStatus] = useState(currentStudent.status);
  const [checkIn, setCheckIn] = useState(currentStudent.checkIn ?? "07:41");
  const [phase, setPhase] = useState<PassPhase>("idle");
  const [fading, setFading] = useState(false);
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
      setPhase("stamping");
      setFading(true);

      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      if (isWorking) {
        setTodayEntry((e) => ({ ...e, checkOut: time }));
      } else {
        setCheckIn(time);
        setTodayEntry({ checkIn: time, checkOut: null });
      }
      setStatus((s) => (s === "WORKING" ? "OUTSIDE" : "WORKING"));

      window.setTimeout(() => setFading(false), 320);
    }, 380);

    window.setTimeout(() => {
      setPhase("idle");
      setBusy(false);
    }, 1000);
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
        fading={fading}
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
        {currentStudent.recent.map((r) => (
          <div key={r.date} className={styles.archiveRow}>
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
