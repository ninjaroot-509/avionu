import { motion } from "framer-motion";

interface GameLoaderProps {
  progress: number;
  ready: boolean;
  awaitingGesture: boolean;
  onEnter: () => void;
}

export const GameLoader = ({
  progress,
  ready,
  awaitingGesture,
  onEnter,
}: GameLoaderProps) => (
  <motion.div
    className="game-loader"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.35 }}
    role={ready ? "dialog" : "status"}
    aria-live="polite"
    aria-label={`Chargement du jeu ${progress}%`}
  >
    <div className="game-loader-fleet" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => <span key={index} />)}
    </div>

    <div className="game-loader-content">
      <div className="game-loader-brand" aria-label="Vinparye Game">
        <span className="game-loader-logo" aria-hidden="true" />
        <strong>AVIONU</strong>
      </div>

      {!ready && (
        <>
          <div className="game-loader-progress">
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="game-loader-readout">
            <span>Chargement</span>
            <strong>{progress}%</strong>
          </div>
        </>
      )}

      {ready && awaitingGesture && (
        <motion.button
          className="game-loader-enter"
          type="button"
          onClick={onEnter}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Entrer dans le jeu
        </motion.button>
      )}
    </div>
  </motion.div>
);
