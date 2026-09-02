"use client";

import { useEffect, useRef, useState } from "react";

import styles from "../styles.module.css";

const EASE_IN = "cubic-bezier(0.55,0,1,0.45)";
const EASE_OUT = "cubic-bezier(0.23,1,0.32,1)";
const FLIP_MS = 190;

export function Flap({
  label,
  tone,
}: {
  label: string;
  tone: "default" | "positive";
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState({ label, tone });
  const prev = useRef(label);

  useEffect(() => {
    if (prev.current === label) return;
    prev.current = label;

    const el = ref.current;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!el || reduce) {
      setShown({ label, tone });
      return;
    }

    el.style.transition = `transform ${FLIP_MS}ms ${EASE_IN}`;
    el.style.transform = "rotateX(90deg)";

    const timer = window.setTimeout(() => {
      setShown({ label, tone });
      el.style.transition = "none";
      el.style.transform = "rotateX(-90deg)";
      void el.offsetHeight;
      requestAnimationFrame(() => {
        el.style.transition = `transform ${FLIP_MS}ms ${EASE_OUT}`;
        el.style.transform = "rotateX(0deg)";
      });
    }, FLIP_MS);

    return () => window.clearTimeout(timer);
  }, [label, tone]);

  return (
    <span className={styles.flapWrap}>
      <span ref={ref} className={shown.tone === "positive" ? styles.flapWorking : styles.flap}>
        {shown.label}
      </span>
    </span>
  );
}
