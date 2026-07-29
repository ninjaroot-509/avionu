import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  openGameInfoModal,
  type GameInfoModalName,
} from "@/src/components/GameInfoModal";
import { HistoryRibbon } from "@/src/components/HistoryRibbon";
import { useGameStore } from "@/src/store/gameStore";
import type { ConnectionStatus } from "@/src/types/game";
import { formatMoney } from "@/src/utils/format";

const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
  connecting: "Connexion",
  connected: "En ligne",
  reconnecting: "Reconnexion",
  offline: "Hors ligne",
};

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

interface MenuToggleRowProps {
  glyph: string;
  label: string;
  enabled: boolean;
  onToggle: () => void;
}

const MenuToggleRow = ({
  glyph,
  label,
  enabled,
  onToggle,
}: MenuToggleRowProps) => (
  <button className="player-menu-row" type="button" onClick={onToggle}>
    <span className="player-menu-glyph" aria-hidden="true">
      {glyph}
    </span>
    <span>{label}</span>
    <span className={`player-menu-switch ${enabled ? "is-active" : ""}`}>
      <i />
    </span>
  </button>
);

interface TopBarProps {
  onReconnect: () => void;
}

export const TopBar = ({ onReconnect }: TopBarProps) => {
  const connection = useGameStore((state) => state.connection);
  const balance = useGameStore((state) => state.balance);
  const currency = useGameStore((state) => state.currency);
  const displayName = useGameStore((state) => state.displayName);
  const latencyMs = useGameStore((state) => state.latencyMs);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const musicEnabled = useGameStore((state) => state.musicEnabled);
  const menuOpen = useGameStore((state) => state.menuOpen);
  const selectedAvatar = useGameStore((state) => state.selectedAvatar);
  const toggleSound = useGameStore((state) => state.toggleSound);
  const toggleMusic = useGameStore((state) => state.toggleMusic);
  const toggleMenu = useGameStore((state) => state.toggleMenu);
  const closeMenu = useGameStore((state) => state.closeMenu);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openInfo = (modal: GameInfoModalName) => {
    openGameInfoModal(modal);
    closeMenu();
  };
  const avatarColumn = selectedAvatar % 5;
  const avatarRow = Math.floor(selectedAvatar / 5);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutsideInteraction = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        menuButtonRef.current?.contains(target)
      ) {
        return;
      }
      closeMenu();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("pointerdown", closeOnOutsideInteraction);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideInteraction);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeMenu, menuOpen]);

  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="AVIONU accueil">
        <img
          src="/vinparye-flight-mark.svg"
          alt=""
          width="38"
          height="38"
        />
        <span className="brand-copy">
          {/* <strong>VINPARYE</strong> */}
          <strong>AVIONU</strong>
        </span>
      </a>

      <HistoryRibbon />

      <div className="topbar-actions">
        <div className="points-balance" aria-label={`${balance} ${currency}`}>
          <span className="points-symbol">{currency}</span>
          <span>
            <small>SOLDE</small>
            <strong>{formatMoney(balance, currency)}</strong>
          </span>
        </div>

        <button
          className={`connection-pill is-${connection}`}
          type="button"
          onClick={onReconnect}
          aria-label="Tester la reconnexion"
          title={
            latencyMs === null
              ? "Cliquer pour reconnecter"
              : `Latence ${Math.round(latencyMs)} ms`
          }
        >
          <span className="connection-dot" />
          <span>{CONNECTION_LABELS[connection]}</span>
        </button>

        <button
          ref={menuButtonRef}
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
            ref={menuRef}
            className="compact-menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            <div className="player-menu-profile">
              <button
                className="player-menu-avatar-button"
                type="button"
                onClick={() => openInfo("avatar")}
                aria-label="Modifier mon avatar"
                title="Modifier mon avatar"
              >
                <span
                  className="player-menu-avatar avatar-sprite"
                  aria-hidden="true"
                  style={{
                    backgroundPosition: `${avatarColumn * 25}% ${avatarRow * 50}%`,
                  }}
                />
                <span className="player-menu-avatar-pencil" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="m4 20 4.4-1 9.8-9.8-3.4-3.4L5 15.6 4 20Z" />
                    <path d="m13.8 6.8 3.4 3.4" />
                  </svg>
                </span>
              </button>
              <span>
                <small className="player-menu-kicker">PROFIL</small>
                <strong>{displayName || "Joueur VinParye"}</strong>
                <small>Compte joueur</small>
              </span>
            </div>

            <div className="player-menu-section" data-section="Audio">
              <MenuToggleRow
                glyph="◖"
                label="Son"
                enabled={soundEnabled}
                onToggle={toggleSound}
              />
              <MenuToggleRow
                glyph="♫"
                label="Musique"
                enabled={musicEnabled}
                onToggle={toggleMusic}
              />
            </div>

            <div className="player-menu-section" data-section="Personnalisation">
              <button
                className="player-menu-row"
                type="button"
                onClick={() => openInfo("avatar")}
              >
                <span className="player-menu-glyph" aria-hidden="true">♙</span>
                <span>Mon avatar</span>
              </button>
            </div>

            <div className="player-menu-section" data-section="Sécurité & aide">
              <button
                className="player-menu-row"
                type="button"
                onClick={() => openInfo("provably")}
              >
                <span className="player-menu-glyph" aria-hidden="true">◇</span>
                <span>Provably Fair</span>
              </button>
              <button
                className="player-menu-row"
                type="button"
                onClick={() => openInfo("limits")}
              >
                <span className="player-menu-glyph" aria-hidden="true">◔</span>
                <span>Limites</span>
              </button>
              <button
                className="player-menu-row"
                type="button"
                onClick={() => openInfo("rules")}
              >
                <span className="player-menu-glyph" aria-hidden="true">▤</span>
                <span>Règles du jeu</span>
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
