"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/src/store/gameStore";
import type { ConnectionStatus } from "@/src/types/game";
import { formatGourdes } from "@/src/utils/format";

const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
  connecting: "Connexion",
  connected: "En ligne",
  reconnecting: "Reconnexion",
  offline: "Hors ligne",
};

const SoundIcon = ({ enabled }: { enabled: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9.2h3.4L12 5.5v13l-4.6-3.7H4V9.2Z" />
    {enabled ? (
      <>
        <path d="M15 9c1.3 1.7 1.3 4.3 0 6" />
        <path d="M18 6.5c3 3 3 8 0 11" />
      </>
    ) : (
      <path d="m15.5 9 5 6m0-6-5 6" />
    )}
  </svg>
);

const MenuIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {open ? (
      <>
        <path d="m6 6 12 12" />
        <path d="M18 6 6 18" />
      </>
    ) : (
      <>
        <path d="M5 7h14" />
        <path d="M5 12h14" />
        <path d="M5 17h14" />
      </>
    )}
  </svg>
);

interface TopBarProps {
  onReconnect: () => void;
}

export const TopBar = ({ onReconnect }: TopBarProps) => {
  const connection = useGameStore((state) => state.connection);
  const balance = useGameStore((state) => state.balance);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const menuOpen = useGameStore((state) => state.menuOpen);
  const toggleSound = useGameStore((state) => state.toggleSound);
  const toggleMenu = useGameStore((state) => state.toggleMenu);

  return (
    <header className="topbar">
      <a className="brand" href="#flight-scene" aria-label="VinParye Aviator accueil">
        <img
          src="/vinparye-flight-mark.svg"
          alt=""
          width="38"
          height="38"
        />
        <span className="brand-copy">
          <strong>VINPARYE</strong>
          <small>AVIATOR</small>
        </span>
      </a>

      <div className="topbar-actions">
        <div className="points-balance" aria-label={`${balance} gourdes`}>
          <span className="points-symbol">G</span>
          <span>
            <small>SOLDE</small>
            <strong>{formatGourdes(balance)}</strong>
          </span>
        </div>

        <button
          className={`connection-pill is-${connection}`}
          type="button"
          onClick={onReconnect}
          aria-label="Tester la reconnexion"
          title="Cliquer pour tester la reconnexion"
        >
          <span className="connection-dot" />
          <span>{CONNECTION_LABELS[connection]}</span>
        </button>

        <button
          className="icon-button"
          type="button"
          onClick={toggleSound}
          aria-label={soundEnabled ? "Couper le son" : "Activer le son"}
          aria-pressed={soundEnabled}
        >
          <SoundIcon enabled={soundEnabled} />
        </button>

        <button
          className="icon-button"
          type="button"
          onClick={toggleMenu}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="compact-menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            <strong>Centre de jeu</strong>
            <span>Session locale</span>
            <div className="menu-rule" />
            <span className="safe-copy">
              GOURDES FICTIVES
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
