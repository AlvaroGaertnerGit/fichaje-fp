"use client";

import { useEffect, useRef } from "react";

import { studentHistoryFor, type MockStudent } from "../../_lib/mock-data";
import { serialFor } from "../_lib/barcode";
import styles from "../styles.module.css";
import { Pass } from "./Pass";

export function StudentDetail({
  student,
  onClose,
}: {
  student: MockStudent;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const history = studentHistoryFor(student);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={styles.modalScrim}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modalBody} role="dialog" aria-modal="true" aria-label={`Pase de ${student.name}`}>
        <button ref={closeRef} type="button" className={styles.modalClose} onClick={onClose}>
          Cerrar
        </button>

        <Pass
          name={student.name}
          classGroup={student.classGroup}
          serial={serialFor(student.name)}
          validated={student.status === "WORKING"}
          phase="idle"
          fading={false}
          timeLabel={student.status === "WORKING" ? "Entrada validada" : "Sin fichaje"}
          timeValue={student.checkIn ?? ""}
          barcodeSeed={student.name}
        />

        <div className={styles.sectionHead} style={{ marginTop: 32 }}>
          <span className={styles.sectionTitle}>Archivo de jornadas</span>
        </div>
        <div className={styles.archive}>
          {history.map((h) => (
            <div key={h.date} className={styles.archiveRow}>
              <span className={styles.archiveSerial}>№{serialFor(student.name + h.date)}</span>
              <span className={styles.archiveDate}>{h.date}</span>
              <span className={styles.archiveTimes}>
                {h.checkIn} → {h.checkOut}
              </span>
              <span className={styles.archiveDuration}>{h.duration}</span>
              <span className={styles.archiveGlyph} aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
