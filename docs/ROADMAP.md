# 🗺️ TripGenie — Roadmap & Évolutions Futures

Ce document liste les améliorations techniques et fonctionnelles prévues pour la version 2.0 du projet.

---

## 🛠️ Améliorations de Code (Refactoring)

### 1. Centralisation de la Configuration (Backend)
*   **Objectif** : Créer un fichier `server/config/env.js` pour éviter d'utiliser `process.env` partout dans le code.
*   **Bénéfice** : Meilleure lisibilité et typage des variables d'environnement.

### 2. Variables d'Environnement dans `vite.config.js`
*   **Objectif** : Remplacer l'URL du proxy (localhost:3000) par une variable d'environnement.
*   **Bénéfice** : Facilite le déploiement sur différents environnements (staging, prod).

### 3. Architecture MVC stricte
*   **Objectif** : Séparer les fichiers de routes et les contrôleurs.
*   **Bénéfice** : Facilite les tests unitaires et la maintenance à long terme.

---

## 🚀 Évolutions Technologiques

### 1. Migration React 19 & Server Components
*   **Objectif** : Utiliser le **React Compiler** pour supprimer les `useMemo`/`useCallback` manuels et passer les composants lourds en **Server Components**.
*   **Bénéfice** : Temps de chargement initial réduit et code plus léger.

### 2. Interface Premium avec `Mapcn.dev`
*   **Objectif** : Refondre le design de la carte interactive en utilisant des composants Tailwind pré-stylisés.
*   **Bénéfice** : Look "SaaS" haut de gamme et meilleure UX.

### 3. Mise en cache avec Redis
*   **Objectif** : Stocker les résultats de recherche IA fréquents dans un cache Redis.
*   **Bénéfice** : Réduction des coûts d'API et réponses quasi-instantanées pour les destinations populaires.

### 4. Tests End-to-End (E2E)
*   **Objectif** : Implémenter Playwright pour simuler des parcours utilisateurs complets.
*   **Bénéfice** : Garantie totale de non-régression sur les flux critiques (Login -> Génération -> Vote).
