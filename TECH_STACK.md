# 🛠 TECH STACK & JUSTIFICATIONS — TRIPGENIE

Ce document récapitule les technologies utilisées et justifie les choix stratégiques effectués pour le projet **TripGenie**.

---

## 🎨 FRONT-END (Interface Utilisateur)

### React 18 & Vite.js
*   **Pourquoi ce choix ?** React est la bibliothèque leader du marché. Vite est utilisé comme outil de build pour sa rapidité (ES Modules).
*   **Avantage pour TripGenie :** Permet de créer une interface "Single Page Application" (SPA) ultra-réactive. Vite permet un développement fluide avec un rechargement instantané du code (HMR).

### TailwindCSS
*   **Pourquoi ce choix ?** Contrairement à Bootstrap qui impose un style "déjà vu", Tailwind permet de créer un design sur mesure rapidement.
*   **Avantage pour TripGenie :** Garantit un design "Premium" et moderne, totalement responsive (mobile-first), indispensable pour une application de voyage.

### Zustand
*   **Pourquoi ce choix ?** Alternative moderne à Redux. Beaucoup moins verbeux et plus facile à maintenir.
*   **Avantage pour TripGenie :** Permet de sauvegarder l'historique du chat et l'état de connexion de l'utilisateur de manière globale sans complexifier le code.

---

## ⚙️ BACK-END (Logique & API)

### Node.js & Express.js
*   **Pourquoi ce choix ?** Permet d'utiliser JavaScript sur toute la pile (Full-stack JS) et gère nativement les opérations asynchrones.
*   **Avantage pour TripGenie :** Idéal pour gérer les appels aux APIs d'Intelligence Artificielle (qui peuvent être longs) sans bloquer les autres requêtes des utilisateurs.

### JWT & Bcrypt.js
*   **Pourquoi ce choix ?** Standards de l'industrie pour la sécurité.
*   **Avantage pour TripGenie :** Assure que les mots de passe ne sont jamais stockés en clair (Bcrypt) et que l'accès aux itinéraires personnels est strictement protégé (JWT).

---

## 🗄️ BASE DE DONNÉES (Stockage)

### PostgreSQL (via Supabase)
*   **Pourquoi ce choix ?** PostgreSQL est le SGBDR le plus robuste. Supabase facilite son déploiement et sa gestion.
*   **Avantage pour TripGenie :** Capacité à stocker des données structurées (utilisateurs) et semi-structurées (le JSON des itinéraires générés par l'IA) avec une fiabilité totale.

---

## 🤖 INTELLIGENCE ARTIFICIELLE

### OpenRouter & Claude 3.5
*   **Pourquoi ce choix ?** OpenRouter permet de changer de modèle d'IA facilement. Claude 3.5 est actuellement l'un des plus performants pour la rédaction et la planification.
*   **Avantage pour TripGenie :** Offre des suggestions de voyage extrêmement pertinentes, naturelles et structurées, offrant une réelle valeur ajoutée à l'utilisateur.

---

## 🚀 RÉSUMÉ DES AVANTAGES DE CETTE STACK
1.  **Rapidité de développement :** Full JavaScript (React + Node).
2.  **Performance :** Architecture asynchrone et build optimisé.
3.  **Scalabilité :** Base de données relationnelle solide et APIs robustes.
4.  **Modernité :** Utilisation des derniers standards de l'industrie (Vite, Zustand, Claude 3.5).
