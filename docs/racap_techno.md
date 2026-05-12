# Récap Complet de l'Architecture TripGenie

Ce document compile tout ce qu'il faut savoir sur l'architecture de TripGenie pour la soutenance RNCP 5 / DWWM. Il couvre la stack, le flux, les techno avec justifications, et clarifie l'authentification.

---

## 1. Vue d'ensemble de la stack

TripGenie est une application web full-stack JavaScript moderne :
- **Front-end** : React + Vite (UI interactive, navigation, cartes, animations).
- **Back-end** : Node.js + Express (API REST, logique métier, IA, sécurité).
- **Base de données** : PostgreSQL via Supabase (stockage relationnel, auth, JSONB).
- **Autres** : Outils pour data (React Query, Zustand), styling (Tailwind, Framer Motion), validation (Zod), etc.

Pourquoi cette stack ? Cohérente (même langage JS/TS partout), moderne, adaptée à un projet SaaS comme TripGenie, et facile à défendre à l'oral.

---

## 2. Flux complet de l'application

### A. Utilisateur ouvre l’app
- Navigateur charge le front React compilé par Vite.
- Interface affiche Home, Login, Trips, etc.

### B. Interaction utilisateur
- Clic sur login, génération de voyage, vote.
- Front envoie requête HTTP à Express.

### C. Traitement backend
- Middlewares (helmet, cors, rate-limit, json).
- Logique : Validation (Zod), génération IA, scoring.
- Stockage : Via Supabase/PostgreSQL.

### D. Réponse front
- Front reçoit JSON, met à jour UI (React Query, Zustand).
- Animations et styles (Tailwind, Framer Motion).

### Schéma simplifié
Front React → Back Express → DB PostgreSQL via Supabase.

---

## 3. Détail par couche

### Front-end
- **React** : Composants réutilisables pour UI.
- **JSX** : HTML-like dans JS, compilé par Vite.
- **Vite** : Bundler rapide, dev server.
- **React Router** : Navigation SPA.
- **React Query** : Data serveur (cache, erreurs).
- **Zustand** : État global simple.
- **Tailwind CSS** : Styling utilitaires.
- **Framer Motion** : Animations.
- **Leaflet** : Cartes interactives.
- **Recharts** : Graphiques.

### Back-end
- **Node.js** : Runtime serveur.
- **Express** : API REST légère.
- **Middlewares** : Sécurité, parsing, rate-limiting.
- **Zod** : Validation données.
- **JWT** : Auth par token.
- **bcryptjs** : Hash mots de passe.
- **dotenv** : Variables env.
- **node-fetch** : Appels externes (IA).

### Base de données
- **Supabase** : Service PostgreSQL + auth.
- **PostgreSQL** : Base relationnelle, JSONB.

---

## 4. Tableau comparatif enrichi : techno vs équivalents

| Ta techno / framework | À quoi elle sert | Équivalent principal | Équivalent possible (alternatives) | Pourquoi tu as choisi la tienne | Avantages/Inconvénients |
|-----------------------|------------------|----------------------|------------------------------------|-------------------------------|--------------------------|
| **React** | UI interactive, composants | Angular, Vue.js | Svelte, SolidJS | Très demandé, moderne, compatible JS/TS | **Avantages** : Composants réutilisables, écosystème riche. **Inconvénients** : Courbe d'apprentissage pour l'état. |
| **Vite** | Dev server + bundler | Webpack | CRA, Next.js | Plus rapide, simple à configurer | **Avantages** : Démarrage rapide, hot reload. **Inconvénients** : Moins de plugins que Webpack. |
| **React Router** | Navigation pages | React Router DOM | Reach Router | Version standard stable | **Avantages** : Fluide sans rechargement. **Inconvénients** : Routes imbriquées complexes. |
| **React Query** | Data serveur | Redux Toolkit Query | SWR | Léger, moderne pour API REST | **Avantages** : Cache intelligent. **Inconvénients** : Apprentissage pour options avancées. |
| **Zustand** | État global front | Redux | Context API | Plus simple que Redux | **Avantages** : Léger, peu de boilerplate. **Inconvénients** : Moins structuré pour gros projets. |
| **Tailwind CSS** | Styling rapide | CSS classique | Bootstrap | Gagne du temps, design propre | **Avantages** : Productif, cohérent. **Inconvénients** : JSX chargé. |
| **Framer Motion** | Animations | react-spring | Animate.css | Fluide sans boilerplate | **Avantages** : Intégration simple. **Inconvénients** : Peut alourdir performances. |
| **Leaflet** | Carte interactive | Google Maps | MapLibre | Libre, léger | **Avantages** : Customisable. **Inconvénients** : Moins de features que payant. |
| **Recharts** | Graphiques | Chart.js | D3 | Intégration React | **Avantages** : Personnalisable. **Inconvénients** : Moins puissant pour complexes. |
| **Node.js** | Runtime serveur | Python | Java | Stack full JS | **Avantages** : Même langage partout. **Inconvénients** : Moins pour calculs lourds. |
| **Express** | API REST | Fastify | NestJS | Simple, léger | **Avantages** : Flexible. **Inconvénients** : Peu intégré. |
| **Zod** | Validation | Yup | Joi | Moderne, TS intégré | **Avantages** : Stricte. **Inconvénients** : Schémas à maintenir. |
| **Supabase** | DB + auth | Firebase | Nhost | Relationnelle, simple | **Avantages** : Auth prête. **Inconvénients** : Dépendance externe. |
| **PostgreSQL** | Base relationnelle | MySQL | SQLite | Performant, JSONB | **Avantages** : Puissant. **Inconvénients** : Complexe à gérer. |
| **JWT** | Auth token | Sessions | OAuth | Léger, stateless | **Avantages** : Sécurisé APIs. **Inconvénients** : Expiration côté client. |
| **bcryptjs** | Hash mots de passe | argon2 | scrypt | Simple, répandu | **Avantages** : Sécurisé. **Inconvénients** : Coût calcul. |
| **dotenv** | Variables env | Statiques | Configs | Sécurisé | **Avantages** : Flexible. **Inconvénients** : Fichiers à gérer. |
| **node-fetch** | Appels HTTP | axios | got | Moderne, léger | **Avantages** : Natif-like. **Inconvénients** : Moins features qu'axios. |

---

## 5. Clarification authentification

- **Ton rôle** : Tu as créé et intégré l'auth dans ton code (routes `/api/auth`, utilisation de `jsonwebtoken` pour tokens, `bcryptjs` pour hash si nécessaire). Tu gères la logique : inscription, login, vérification, protection routes.
- **Rôle de Supabase** : Fournit le service sous-jacent (base users, sessions, API auth). Tu l'utilises via client JS, mais c'est toi qui contrôles le flux.
- **En résumé** : Supabase simplifie, mais c'est toi qui as orchestré l'auth. Pour l'oral : "J'ai intégré Supabase pour l'auth, mais j'ai géré la logique et sécurité dans mon backend."

---

## 6. Phrase clé pour l'oral

“TripGenie est une stack JS full-stack moderne : React/Vite front, Express/Node back, PostgreSQL via Supabase DB. J'ai choisi ces outils pour leur cohérence, rapidité, et pertinence pour un projet SaaS, tout en montrant des compétences pro en sécurité et data.”

---
