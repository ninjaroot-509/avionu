# VinParye Sky Command

Interface React + Vite + TypeScript pour un crash game visuel.

## Démarrage

```bash
npm install
npm run dev
```

## Commandes

- `npm run dev` : démarre l’interface locale.
- `npm run build` : génère le site statique dans `dist/`.
- `npm run preview` : sert localement le build statique.
- `npm run lint` : vérifie les règles TypeScript du projet.

## Organisation

```text
src/
  animations/  calculs et trajectoires Canvas
  assets/      identité visuelle locale
  components/  barre, historique, scène, missions et notifications
  hooks/       cycle de synchronisation du simulateur
  mocks/       données locales initiales
  screens/     composition de l’écran principal
  services/    service socket mock typé
  store/       état Zustand
  types/       événements et modèles TypeScript
  utils/       formatage et son synthétique
```

Le service de démonstration local émet :

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

Le dossier `dist/` contient un `index.html` autonome et les assets du jeu.
