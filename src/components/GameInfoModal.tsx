import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useGameStore } from "@/src/store/gameStore";
import { formatMoney } from "@/src/utils/format";

export type GameInfoModalName =
  | "rules"
  | "limits"
  | "provably"
  | "avatar";
type ProvablyTab = "explanation" | "diagram" | "verify";

const GAME_MODAL_EVENT = "avionu:open-game-modal";

export const openGameInfoModal = (modal: GameInfoModalName) => {
  window.dispatchEvent(
    new CustomEvent<GameInfoModalName>(GAME_MODAL_EVENT, {
      detail: modal,
    }),
  );
};

const MODAL_TITLES: Record<GameInfoModalName, string> = {
  rules: "Règles du jeu",
  limits: "Limites",
  provably: "Provably Fair",
  avatar: "Avatar",
};

const ProvablyExplanation = ({
  onNext,
}: {
  onNext: () => void;
}) => (
  <div className="provably-panel">
    <div className="provably-notice">
      <span>i</span>
      <strong>Engagement cryptographique émis par le backend</strong>
    </div>

    <p>
      Le principe Provably Fair permet de vérifier une manche à partir d’une
      graine serveur et d’une graine client, combinées par HMAC-SHA256.
    </p>

    <h3>Comment ça fonctionne</h3>
    <h4>En résumé</h4>
    <p>
      Le serveur engage une graine secrète avant la manche en publiant son
      hash. Après le tour, la graine est révélée afin que le résultat puisse
      être recalculé indépendamment.
    </p>

    <h4>État du jeu</h4>
    <p>
      Le hash de la graine serveur est publié avant les mises. La graine reste
      scellée côté serveur pendant la manche et n’est révélée qu’après son
      règlement.
    </p>

    <div className="game-info-actions">
      <button type="button" onClick={onNext}>
        Voir le diagramme →
      </button>
    </div>
  </div>
);

const ProvablyDiagram = ({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) => (
  <div className="provably-panel">
    <div className="provably-diagram">
      <div className="provably-seeds">
        <div>
          <span aria-hidden="true">▣</span>
          <strong>Graine serveur</strong>
          <small>32 octets sécurisés</small>
        </div>
        <b>+</b>
        <div>
          <span aria-hidden="true">♙</span>
          <strong>Graine client</strong>
          <small>Valeur contrôlable</small>
        </div>
      </div>
      <i>↓</i>
      <strong className="provably-hmac">HMAC-SHA256</strong>
      <i>↓</i>
      <strong className="provably-result">Multiplicateur final</strong>
    </div>

    <p className="provably-formula">
      Formule v1 : HMAC-SHA256 avec la graine serveur, la graine publique, le
      nonce et la version d’algorithme. Le résultat est ensuite transformé par
      la distribution inverse documentée par le backend.
    </p>

    <div className="game-info-actions">
      <button className="is-secondary" type="button" onClick={onBack}>
        ← Retour
      </button>
      <button type="button" onClick={onNext}>
        Comment vérifier →
      </button>
    </div>
  </div>
);

const ProvablyVerify = ({ onBack }: { onBack: () => void }) => (
  <div className="provably-panel">
    <h3>Comment vérifier</h3>
    <ul className="game-info-bullets is-green">
      <li>Récupérez le hash publié avant la manche.</li>
      <li>
        Après la manche, comparez la graine serveur révélée avec ce hash.
      </li>
      <li>
        Combinez les graines serveur et client avec la formule HMAC-SHA256
        publiée.
      </li>
      <li>
        Comparez le multiplicateur recalculé avec celui inscrit dans
        l’historique.
      </li>
    </ul>

    <div className="game-info-actions">
      <button className="is-secondary" type="button" onClick={onBack}>
        ← Retour
      </button>
    </div>
  </div>
);

export const GameInfoModal = () => {
  const selectedAvatar = useGameStore((state) => state.selectedAvatar);
  const setSelectedAvatar = useGameStore(
    (state) => state.setSelectedAvatar,
  );
  const config = useGameStore((state) => state.config);
  const currentRound = useGameStore((state) => state.currentRound);
  const currency = useGameStore((state) => state.currency);
  const [activeModal, setActiveModal] =
    useState<GameInfoModalName | null>(null);
  const [avatarDraft, setAvatarDraft] = useState(selectedAvatar);
  const [provablyTab, setProvablyTab] =
    useState<ProvablyTab>("explanation");

  useEffect(() => {
    const openModal = (event: Event) => {
      const modal = (event as CustomEvent<GameInfoModalName>).detail;
      setProvablyTab("explanation");
      setAvatarDraft(useGameStore.getState().selectedAvatar);
      setActiveModal(modal);
    };

    window.addEventListener(GAME_MODAL_EVENT, openModal);
    return () => window.removeEventListener(GAME_MODAL_EVENT, openModal);
  }, []);

  useEffect(() => {
    if (!activeModal) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveModal(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeModal]);

  return (
    <AnimatePresence>
      {activeModal && (
        <motion.div
          className="rules-modal-backdrop game-info-backdrop"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveModal(null);
          }}
        >
          <motion.section
            className={`game-info-modal is-${activeModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-info-title"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="rules-modal-head game-info-head">
              <h2 id="game-info-title">{MODAL_TITLES[activeModal]}</h2>
              <button
                className="rules-modal-close"
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="game-info-body">
              {activeModal === "rules" && (
                <div className="game-rules-sections">
                  <section>
                    <h3>Pari et retrait</h3>
                    <ul className="game-info-bullets">
                      <li>
                        Sélectionnez le montant et placez votre pari avant le
                        début de la manche.
                      </li>
                      <li>
                        Vous pouvez annuler le pari tant que le vol n’a pas
                        commencé.
                      </li>
                      <li>
                        Votre gain correspond à la mise multipliée par la cote
                        au moment du retrait.
                      </li>
                      <li>
                        Le nombre de positions autorisées est fourni par la
                        configuration serveur ({config.maximum_bets_per_player}
                        ).
                      </li>
                      <li>
                        Si le crash arrive avant votre retrait, la mise est
                        perdue.
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3>Retrait automatique</h3>
                    <ul className="game-info-bullets">
                      <li>
                        Activez Auto depuis votre panneau de mise et saisissez
                        votre multiplicateur cible.
                      </li>
                      <li>
                        Le backend exécute le retrait automatiquement lorsque
                        la cible est atteinte, même si le navigateur est fermé.
                      </li>
                      <li>
                        Le retrait automatique ne garantit pas un gain et ne
                        remplace pas les limites de jeu responsable.
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3>Résultat de la manche</h3>
                    <ul className="game-info-bullets">
                      <li>
                        La scène et l’avion illustrent uniquement la progression
                        du multiplicateur.
                      </li>
                      <li>
                        Le crash, la trajectoire temporelle et le résultat
                        financier proviennent exclusivement de la manche
                        serveur #{currentRound?.round_number ?? "—"}.
                      </li>
                    </ul>
                  </section>
                </div>
              )}

              {activeModal === "limits" && (
                <dl className="game-limits-list">
                  <div>
                    <dt>Mise minimale</dt>
                    <dd>{formatMoney(config.min_bet, currency)}</dd>
                  </div>
                  <div>
                    <dt>Mise maximale</dt>
                    <dd>{formatMoney(config.max_bet, currency)}</dd>
                  </div>
                  <div>
                    <dt>Gain maximal</dt>
                    <dd>
                      {formatMoney(
                        config.maximum_bet_per_user,
                        currency,
                      )} par joueur
                    </dd>
                  </div>
                  <div>
                    <dt>Positions par manche</dt>
                    <dd>{config.maximum_bets_per_player}</dd>
                  </div>
                  <div>
                    <dt>Retrait auto max</dt>
                    <dd>{config.max_auto_cashout}x</dd>
                  </div>
                  <div>
                    <dt>Version configuration</dt>
                    <dd>v{config.config_version}</dd>
                  </div>
                </dl>
              )}

              {activeModal === "avatar" && (
                <div className="avatar-picker">
                  <div className="avatar-grid">
                    {Array.from({ length: 15 }, (_, index) => {
                      const column = index % 5;
                      const row = Math.floor(index / 5);
                      return (
                        <button
                          className={
                            avatarDraft === index ? "is-selected" : ""
                          }
                          type="button"
                          onClick={() => setAvatarDraft(index)}
                          aria-label={`Avatar ${index + 1}`}
                          aria-pressed={avatarDraft === index}
                          key={index}
                        >
                          <span
                            className="avatar-sprite"
                            style={{
                              backgroundPosition: `${column * 25}% ${row * 50}%`,
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="avatar-confirm"
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(avatarDraft);
                      setActiveModal(null);
                    }}
                  >
                    Changer
                  </button>
                </div>
              )}

              {activeModal === "provably" && (
                <>
                  <dl className="game-limits-list">
                    <div>
                      <dt>Manche</dt>
                      <dd>#{currentRound?.round_number ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Hash serveur</dt>
                      <dd>{currentRound?.server_seed_hash || "—"}</dd>
                    </div>
                    <div>
                      <dt>Graine publique</dt>
                      <dd>{currentRound?.client_seed || "—"}</dd>
                    </div>
                    <div>
                      <dt>Nonce</dt>
                      <dd>{currentRound?.nonce ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Graine révélée</dt>
                      <dd>
                        {currentRound?.server_seed ||
                          "Disponible après règlement"}
                      </dd>
                    </div>
                  </dl>
                  <div className="provably-tabs" role="tablist">
                    {(
                      [
                        ["explanation", "Explication"],
                        ["diagram", "Diagramme"],
                        ["verify", "Vérifier"],
                      ] as const
                    ).map(([tab, label]) => (
                      <button
                        className={provablyTab === tab ? "is-active" : ""}
                        type="button"
                        role="tab"
                        aria-selected={provablyTab === tab}
                        onClick={() => setProvablyTab(tab)}
                        key={tab}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {provablyTab === "explanation" && (
                    <ProvablyExplanation
                      onNext={() => setProvablyTab("diagram")}
                    />
                  )}
                  {provablyTab === "diagram" && (
                    <ProvablyDiagram
                      onBack={() => setProvablyTab("explanation")}
                      onNext={() => setProvablyTab("verify")}
                    />
                  )}
                  {provablyTab === "verify" && (
                    <ProvablyVerify
                      onBack={() => setProvablyTab("diagram")}
                    />
                  )}
                </>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
