import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { openGameInfoModal } from "@/src/components/GameInfoModal";
import { useGameStore } from "@/src/store/gameStore";

const RULES_STORAGE_KEY = "avionu-hide-how-to-play";

const historyClass = (crashMultiplier: number) => {
  if (crashMultiplier >= 10) return "history-chip is-legend";
  if (crashMultiplier >= 5) return "history-chip is-high";
  if (crashMultiplier >= 3) return "history-chip is-good";
  if (crashMultiplier >= 2) return "history-chip is-mid";
  if (crashMultiplier >= 1.3) return "history-chip is-low";
  return "history-chip is-crash";
};

export const HistoryRibbon = () => {
  const entries = useGameStore((state) => state.history);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [hideRules, setHideRules] = useState(false);
  const visibleEntries = entries.slice(0, 10);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setRulesOpen(localStorage.getItem(RULES_STORAGE_KEY) !== "1");
      } catch {
        setRulesOpen(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!rulesOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRulesOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [rulesOpen]);

  const startPlaying = () => {
    if (hideRules) {
      try {
        localStorage.setItem(RULES_STORAGE_KEY, "1");
      } catch {
        // The modal can still close when browser storage is unavailable.
      }
    }
    setRulesOpen(false);
  };

  return (
    <>
      <section className="history-ribbon" aria-label="Historique des tours">
        <button
          className="history-rule-button"
          type="button"
          onClick={() => openGameInfoModal("rules")}
        >
          Règle
        </button>

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
      </section>

      <AnimatePresence>
        {rulesOpen && (
          <motion.div
            className="rules-modal-backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setRulesOpen(false);
            }}
          >
            <motion.section
              className="rules-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rules-modal-title"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="rules-modal-head">
                <h2 id="rules-modal-title">Comment jouer</h2>
                <button
                  className="rules-modal-close"
                  type="button"
                  onClick={() => setRulesOpen(false)}
                  aria-label="Fermer les règles"
                >
                  ×
                </button>
              </div>

              <div className="rules-modal-body">
                <p className="rules-intro">
                  Il y a quelques étapes simples à suivre :
                </p>

                <ol className="rules-list">
                  <li>
                    <span className="rules-step-number">01</span>
                    <span>
                      <strong>Placez votre mise</strong>
                      <small>
                        Sélectionnez le montant et placez votre pari avant le
                        début de la manche.
                      </small>
                    </span>
                  </li>
                  <li>
                    <span className="rules-step-number">02</span>
                    <span>
                      <strong>Regardez le multiplicateur monter</strong>
                      <small>
                        L’avion décolle et le multiplicateur augmente. Encaissez
                        avant le crash.
                      </small>
                    </span>
                  </li>
                  <li>
                    <span className="rules-step-number">03</span>
                    <span>
                      <strong>Encaissez au bon moment</strong>
                      <small>
                        Appuyez sur Encaisser pour verrouiller votre gain ou
                        utilisez le retrait automatique.
                      </small>
                    </span>
                  </li>
                </ol>
              </div>

              <div className="rules-modal-footer">
                <label className="rules-hide-control">
                  <input
                    type="checkbox"
                    checked={hideRules}
                    onChange={(event) => setHideRules(event.target.checked)}
                  />
                  <span>Ne plus afficher</span>
                </label>

                <button
                  className="rules-modal-action"
                  type="button"
                  onClick={startPlaying}
                >
                  Commencer
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
