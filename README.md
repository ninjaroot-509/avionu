# VinParye Sky Command

Interface React + Vite + TypeScript pour une simulation arcade de pilotage.
Tous les points sont fictifs et l’énergie sert uniquement à régler la
propulsion.

## Démarrage

```bash
npm install
npm run dev
```

## Commandes

- `npm run dev` : démarre l’interface locale.
- `npm run build` : génère la version de production.
- `npm run lint` : vérifie TypeScript et les règles du projet.

## Organisation

```text
src/
  animations/  calculs et trajectoires Canvas
  assets/      identité visuelle locale
  components/  barre, historique, scène, missions et notifications
  hooks/       cycle de synchronisation du simulateur
  mocks/       données locales initiales
  pages/       composition de l’écran principal
  services/    service socket mock typé
  store/       état Zustand
  types/       événements et modèles TypeScript
  utils/       formatage et son synthétique
```

Le service local émet :

- `connection_status`
- `round_created`
- `round_countdown`
- `round_started`
- `multiplier_update`
- `mission_started`
- `mission_stabilized`
- `signal_ended`
- `round_finished`
- `history_update`

SIMULATION ARCADE — POINTS FICTIFS
