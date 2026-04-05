# TripGenie 🌍✨

Planificateur de voyages AI — prototype interactif

## Arborescence

```
tripgenie/
├── index.html              ← Page principale
├── css/
│   ├── variables.css       ← Variables CSS & reset
│   ├── header.css          ← Header & Hero
│   ├── search.css          ← Formulaire de recherche
│   ├── results.css         ← Section résultats & tabs
│   ├── components.css      ← Tous les composants (vols, hôtels, etc.)
│   └── responsive.css      ← Media queries mobile
└── js/
    ├── main.js             ← Point d'entrée, init, orchestration
    ├── api.js              ← Appel API Claude + prompt
    ├── render.js           ← Rendu HTML des résultats
    └── ui.js               ← Utilitaires UI (toast, tabs, dates...)
```

## Lancer en local

```bash
# Avec Live Server (VS Code)
# Clic sur "Go Live" en bas à droite

# Ou avec Python
python3 -m http.server 5500
# puis ouvrir http://localhost:5500
```

## Ajouter des fonctionnalités

- **Nouvelle feature UI** → `css/components.css` + `js/render.js`
- **Modifier le prompt IA** → `js/api.js` > fonction `buildPrompt()`
- **Nouveau tab** → ajouter dans `index.html` + `js/render.js`
- **Modifier le style global** → `css/variables.css`
