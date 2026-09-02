"use client";

import { useEffect, useRef } from "react";

import { studentHistoryFor, type MockStudent } from "../../_lib/mock-data";
import styles from "../styles.module.css";

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
      <div className={styles.modalCard} role="dialog" aria-modal="true" aria-label={`Detalle de ${student.name}`}>
        <button ref={closeRef} type="button" className={styles.modalClose} onClick={onClose}>
          Cerrar
        </button>

        <h2 className={styles.modalName}>{student.name}</h2>
        <p className={styles.modalMeta}>
          {student.classGroup} · {student.status === "WORKING" ? `Dentro desde las ${student.checkIn}` : "Fuera del centro"}
        </p>

        <hr className={styles.modalDivider} />

        <span className={styles.sectionTitle}>Fichajes anteriores</span>
        <div className={styles.logList}>
          {history.map((h) => (
            <div key={h.date} className={styles.logRow}>
              <span className={styles.logDate}>{h.date}</span>
              <span>
                {h.checkIn} → {h.checkOut}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
