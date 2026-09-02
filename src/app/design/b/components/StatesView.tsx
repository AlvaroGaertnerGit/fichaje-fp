"use client";

import styles from "../styles.module.css";

export function StatesView() {
  return (
    <div className={styles.viewEnter}>
      <span className={styles.eyebrow}>Referencia</span>
      <h1 className={styles.title}>Estados</h1>

      <div className={styles.statesGrid}>
        <div className={styles.stateCard}>
          <span className={styles.stateCardTitle}>Jornada activa</span>
          <span className={styles.manifestStatusActive}>DENTRO</span>
        </div>

        <div className={styles.stateCard}>
          <span className={styles.stateCardTitle}>Fuera del centro</span>
          <span className={styles.manifestStatus}>FUERA</span>
        </div>

        <div className={styles.stateCard}>
          <span className={styles.stateCardTitle}>Fichaje correcto</span>
          <span className={styles.feedbackOk}>Entrada sellada a las 08:03</span>
        </div>

        <div className={styles.stateCard}>
          <span className={styles.stateCardTitle}>Error · red no autorizada</span>
          <span className={styles.feedbackError}>
            <span className={styles.feedbackErrorTitle}>No puedes fichar desde esta red. </span>
            Conéctate a la red del centro para registrar tu jornada.
          </span>
        </div>

        <div className={styles.stateCard}>
          <span className={styles.stateCardTitle}>Cargando</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className={styles.skeletonLine} style={{ width: "60%" }} />
            <div className={styles.skeletonLine} style={{ width: "38%" }} />
          </div>
        </div>

        <div className={styles.stateCard}>
          <span className={styles.stateCardTitle}>Vacío</span>
          <div className={styles.emptyState}>
            <span className={styles.emptyStateTitle}>Sin fichajes todavía</span>
            <span>El manifiesto de hoy aparecerá aquí.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
