"use client";

import { useEffect, useRef, useState } from "react";

import styles from "../styles.module.css";

const FLIP_MS = 190;

export function Flap({
  label,
  validated,
}: {
  label: string;
  validated: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState({ label, validated });
  const prev = useRef(label);

  useEffect(() => {
    if (prev.current === label) return;
    prev.current = label;

    const el = ref.current;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!el || reduce) {
      setShown({ label, validated });
      return;
    }

    el.style.transition = `transform ${FLIP_MS}ms var(--ease-flip-in)`;
    el.style.transform = "rotateX(90deg)";

    const timer = window.setTimeout(() => {
      setShown({ label, validated });
      el.style.transition = "none";
      el.style.transform = "rotateX(-90deg)";
      void el.offsetHeight;
      requestAnimationFrame(() => {
        el.style.transition = `transform ${FLIP_MS}ms var(--ease-flip-out)`;
        el.style.transform = "rotateX(0deg)";
      });
    }, FLIP_MS);

    return () => window.clearTimeout(timer);
  }, [label, validated]);

  return (
    <span className={styles.flapWrap}>
      <span ref={ref} className={shown.validated ? styles.flapValidated : styles.flapReady}>
        {shown.label}
      </span>
    </span>
  );
}
