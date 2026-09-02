"use client";

import { useState } from "react";

import { currentTeacher, outsideCount, presentCount, students, type MockStudent } from "../../_lib/mock-data";
import styles from "../styles.module.css";
import { StudentDetail } from "./StudentDetail";

type Filter = "all" | "present" | "absent";

export function TeacherView() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MockStudent | null>(null);

  const filtered = students.filter((s) => {
    if (filter === "present" && s.status !== "WORKING") return false;
    if (filter === "absent" && s.status !== "OUTSIDE") return false;
    if (query && !s.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className={styles.viewEnter}>
      <span className={styles.eyebrow}>Manifiesto de hoy</span>
      <h1 className={styles.title}>Buenos días, {currentTeacher.name}</h1>

      <div className={styles.statsRow}>
        <div className={styles.statBlock}>
          <span className={styles.statValue}>{presentCount}</span>
          <span className={styles.statLabel}>Presentes</span>
        </div>
        <div className={styles.statBlock}>
          <span className={styles.statValue}>{outsideCount}</span>
          <span className={styles.statLabel}>Ausentes</span>
        </div>
        <div className={styles.statBlock}>
          <span className={styles.statValue}>{students.length}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.filterGroup} role="group" aria-label="Filtrar por estado">
          <button type="button" className={filter === "all" ? styles.filterItemActive : styles.filterItem} onClick={() => setFilter("all")}>
            Todos
          </button>
          <button type="button" className={filter === "present" ? styles.filterItemActive : styles.filterItem} onClick={() => setFilter("present")}>
            Presentes
          </button>
          <button type="button" className={filter === "absent" ? styles.filterItemActive : styles.filterItem} onClick={() => setFilter("absent")}>
            Ausentes
          </button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar alumno"
          aria-label="Buscar alumno"
          className={styles.searchInput}
        />
      </div>

      <div className={styles.manifest}>
        {filtered.map((s) => (
          <button key={s.id} type="button" className={styles.manifestRow} onClick={() => setSelected(s)}>
            <span className={styles.manifestTime}>{s.id.padStart(3, "0")}</span>
            <span className={styles.manifestName}>{s.name}</span>
            <span className={styles.manifestGroup}>{s.classGroup}</span>
            <span className={s.status === "WORKING" ? styles.manifestStatusActive : styles.manifestStatus}>
              {s.status === "WORKING" ? "DENTRO" : "FUERA"}
            </span>
          </button>
        ))}
        {filtered.length === 0 && <p className={styles.emptyRow}>Ningún alumno coincide con este filtro.</p>}
      </div>

      {selected && <StudentDetail student={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
