"use client";

import { currentTeacher } from "../../_lib/mock-data";
import styles from "../styles.module.css";

export type ViewKey = "student" | "teacher" | "history" | "states";

const items: { key: ViewKey; label: string }[] = [
  { key: "student", label: "Mi pase" },
  { key: "teacher", label: "Manifiesto" },
  { key: "history", label: "Archivo" },
  { key: "states", label: "Estados" },
];

export function Header({
  active,
  onChange,
}: {
  active: ViewKey;
  onChange: (view: ViewKey) => void;
}) {
  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <span className={styles.brandName}>Fichaje</span>
        <span className={styles.issuerTag}>GSD · FP</span>
      </div>

      <nav className={styles.tabs} aria-label="Navegación principal">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={item.key === active ? styles.tabActive : styles.tab}
            aria-current={item.key === active ? "page" : undefined}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <span className={styles.userMark} aria-hidden="true" title={currentTeacher.name}>
        {currentTeacher.name.charAt(0)}
      </span>
    </header>
  );
}
