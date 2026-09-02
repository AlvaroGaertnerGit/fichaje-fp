"use client";

import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { useState } from "react";

import { Header, type ViewKey } from "./components/Header";
import { HistoryView } from "./components/HistoryView";
import { StatesView } from "./components/StatesView";
import { StudentView } from "./components/StudentView";
import { TeacherView } from "./components/TeacherView";
import styles from "./styles.module.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-mono",
});

export default function ProposalB2() {
  const [view, setView] = useState<ViewKey>("student");

  return (
    <div className={`${styles.root} ${archivo.variable} ${plexMono.variable}`}>
      <div className={styles.grain} aria-hidden="true" />
      <Header active={view} onChange={setView} />
      <main className={styles.main}>
        {view === "student" && <StudentView />}
        {view === "teacher" && <TeacherView />}
        {view === "history" && <HistoryView />}
        {view === "states" && <StatesView />}
      </main>
    </div>
  );
}
