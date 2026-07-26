"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/src/store/gameStore";

const historyClass = (crashMultiplier: number) => {
  if (crashMultiplier >= 10) return "history-chip is-legend";
  if (crashMultiplier >= 5) return "history-chip is-high";
  if (crashMultiplier >= 2) return "history-chip is-mid";
  return "history-chip is-low";
};

export const HistoryRibbon = () => {
  const entries = useGameStore((state) => state.history);
  const expanded = useGameStore((state) => state.historyExpanded);
  const toggleHistory = useGameStore((state) => state.toggleHistory);
  const visibleEntries = entries.slice(0, expanded ? 24 : 12);

  return (
    <section
      className={`history-ribbon ${expanded ? "is-expanded" : ""}`}
      aria-label="Historique des tours"
    >
      <div className="history-heading" />

      <motion.div className="history-list" layout>
        {visibleEntries.map((entry) => (
          <motion.span
            layout
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            className={historyClass(entry.crashMultiplier)}
            key={entry.id}
          >
            <strong>{entry.crashMultiplier.toFixed(2)}x</strong>
          </motion.span>
        ))}
      </motion.div>

      <button
        className="history-toggle"
        type="button"
        onClick={toggleHistory}
        aria-expanded={expanded}
        aria-label={expanded ? "Réduire l'historique" : "Développer l'historique"}
      >
        <span>{expanded ? "RÉDUIRE" : "VOIR PLUS"}</span>
        <svg
          className={expanded ? "is-rotated" : ""}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="m7 9 5 5 5-5" />
        </svg>
      </button>
    </section>
  );
};
