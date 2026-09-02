"use client";

import { historyEntries } from "../../_lib/mock-data";
import styles from "../styles.module.css";

export function HistoryView() {
  return (
    <div className={styles.viewEnter}>
      <span className={styles.eyebrow}>Cuadro de fichajes</span>
      <h1 className={styles.title}>Historial</h1>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Grupo</th>
              <th>Fecha</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            {historyEntries.map((h) => (
              <tr key={h.id}>
                <td>{h.student}</td>
                <td>{h.classGroup}</td>
                <td>{h.date}</td>
                <td>{h.checkIn}</td>
                <td>{h.checkOut ?? <span className={styles.flag}>{h.flagged ? "SIN SALIDA" : "EN CURSO"}</span>}</td>
                <td>{h.duration ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
