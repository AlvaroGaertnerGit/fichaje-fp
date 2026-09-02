"use client";

import { historyEntries } from "../../_lib/mock-data";
import { serialFor } from "../_lib/barcode";
import styles from "../styles.module.css";

export function HistoryView() {
  return (
    <div className={styles.viewEnter}>
      <span className={styles.eyebrow}>Archivo completo</span>
      <h1 className={styles.title}>Historial</h1>

      <div className={styles.archive} style={{ marginTop: 20 }}>
        {historyEntries.map((h, i) => (
          <div
            key={h.id}
            className={`${styles.archiveRowGlobal} ${styles.archiveSettleIn}`}
            style={{ ["--row-i" as string]: i }}
          >
            <span className={styles.archiveSerial}>№{serialFor(h.student + h.date)}</span>
            <span>
              <span className={styles.archiveNameCell}>{h.student}</span>
              <span className={styles.archiveGroupCell}>{h.classGroup}</span>
            </span>
            <span className={styles.archiveDate}>{h.date}</span>
            <span className={styles.archiveTimes}>
              {h.checkIn} → {h.checkOut ?? (h.flagged ? "sin salida" : "en curso")}
            </span>
            <span className={styles.archiveDuration}>{h.duration ?? ""}</span>
            <span className={h.flagged ? styles.archiveGlyphFlag : styles.archiveGlyph} aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}
