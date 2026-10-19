# Frontend : structure et outils

## Choix

| Sujet | Choix |
|-------|-------|
| Langage | JavaScript |
| Framework | Vue 3 + Vite |
| Style | Tailwind CSS (mobile first) |
| Routage | vue-router |
| État / session | Pinia |
| Client HTTP | `fetch` natif (wrapper `src/services/api.js`) |
| Tests | Vitest + Vue Test Utils + jsdom |
| Accessibilité | axe-core dans les tests |

## Structure

```
frontend/src/
├── router/      # routes (et gardes d'accès)
├── views/       # une vue par page
├── services/    # accès API (api.js)
├── stores/      # stores Pinia (à ajouter au besoin)
├── components/  # composants réutilisables (à ajouter au besoin)
└── __tests__/   # tests Vitest
```

## Commandes

```bash
npm run dev    # serveur de dev
npm run build  # build de production
npm test       # tests
```

L'URL de l'API est lue depuis `VITE_API_URL`.
