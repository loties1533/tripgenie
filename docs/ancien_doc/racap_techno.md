# Récap Complet de l'Architecture TripGenie

Ce document compile tout ce qu'il faut savoir sur l'architecture de TripGenie pour la soutenance RNCP 5 / DWWM. Il couvre la stack, le flux, les techno avec justifications, et clarifie l'authentification.

---

## 1. Vue d'ensemble de la stack

TripGenie est une application web full-stack JavaScript moderne :
- **Front-end** : React + Vite (UI interactive, navigation, cartes, animations).
- **Back-end** : Node.js + Express (API REST, logique métier, pipeline IA, sécurité).
- **Base de données** : PostgreSQL via Supabase (stockage relationnel, JSONB pour les itinéraires).
- **APIs externes** : Anthropic/Claude (génération IA), Tavily (recherche web temps réel : vols, événements, hôtels).
- **Autres** : Outils pour data (React Query, Zustand), styling (Tailwind, Framer Motion), validation (Zod).

Pourquoi cette stack ? Cohérente (même langage JS partout), moderne, adaptée à un projet SaaS comme TripGenie, et facile à défendre à l'oral.

---

## 2. Flux complet de l'application

### A. Utilisateur ouvre l'app
- Navigateur charge le front React compilé par Vite.
- Interface affiche Home, Login, Trips, etc.

### B. Interaction utilisateur
- Clic sur login, génération de voyage, vote.
- Front envoie requête HTTP à Express.

### C. Traitement backend
- Middlewares (Helmet, CORS, rate-limit, JSON).
- Validation des entrées (Zod sur toutes les routes critiques).
- Pipeline IA : analyse → recherche Tavily → assemblage pack → scoring multi-critères.
- Stockage : Via Supabase/PostgreSQL.

### D. Réponse front
- Front reçoit JSON, met à jour UI (React Query, Zustand).
- Animations et styles (Tailwind, Framer Motion).

### Schéma simplifié
```
Front React → Back Express → Pipeline IA (Claude + Tavily) → DB PostgreSQL via Supabase
```

### Pipeline IA détaillé
```
chatIntake (onboarding) → analyzeRequest → suggestDestinations
→ smartFlightSearch (Tavily) + smartEventsSearch (Tavily) + smartHotelSearch (Tavily)
→ assemblePack (Claude) → scorepack (scoring multi-critères)
→ sauvegarde Supabase + (optionnel) chatModify
```
> TripGenie repose sur un **pipeline IA orchestré côté serveur**, avec une composante conversationnelle agentique pour la modification post-génération (`chatModify`). Ce n'est pas un agent autonome : l'orchestration est codée dans `ai.js`, le modèle ne décide pas de l'ordre des étapes.

---

## 3. Détail par couche

### Front-end
- **React** : Composants réutilisables pour UI.
- **JSX** : HTML-like dans JS, compilé par Vite.
- **Vite** : Bundler rapide, dev server.
- **React Router v6** : Navigation SPA.
- **React Query v5** : Data serveur (cache, états de chargement, invalidation).
- **Zustand v5** : État global (authStore, searchStore, chatStore, themeStore).
- **Tailwind CSS** : Styling utilitaires.
- **Framer Motion** : Animations.
- **Leaflet** : Cartes interactives (OpenStreetMap, sans coût API).
- **Recharts** : Visualisation du score multi-critères.
- **Sonner** : Notifications toast.

### Back-end
- **Node.js ≥18** : Runtime serveur — `fetch` natif intégré, pas de dépendance supplémentaire.
- **Express** : API REST légère — 5 routers (auth, trips, ai, packs, votes).
- **Middlewares** : Helmet (headers sécurité), CORS, express-rate-limit (2 limiteurs : global + IA), morgan.
- **Zod** : Validation des entrées sur toutes les routes critiques (auth, trips, votes).
- **JWT (jsonwebtoken)** : Auth stateless — token signé côté serveur, vérifié par middleware.
- **bcryptjs** : Hash mots de passe (coût 12).
- **dotenv** : Variables d'environnement (.env exclu du dépôt Git).

### APIs externes
- **Anthropic/Claude** : Génération des itinéraires, onboarding conversationnel, modification de pack.
- **Tavily** : Recherche web temps réel — vols (`smartFlightSearch`), événements (`smartEventsSearch`), hôtels (`smartHotelSearch`). Remplace toute API spécialisée (pas d'Amadeus, pas de PredictHQ).
- **Providers IA alternatifs** : OpenRouter, Gemini, Ollama — configurables via variable `AI_PROVIDER`.

### Base de données
- **Supabase** : Hébergeur PostgreSQL managé — utilisé uniquement comme client BDD, pas comme service d'auth.
- **PostgreSQL** : Base relationnelle — 6 tables avec FK, RLS activé, index, type JSONB pour `pack_data`.

---

## 4. Tableau comparatif : techno vs équivalents

| Techno | Rôle | Équivalent principal | Alternatives | Pourquoi ce choix | Avantages / Inconvénients |
|--------|------|----------------------|--------------|-------------------|--------------------------|
| **React** | UI interactive, composants | Vue.js | Angular, Svelte | Très demandé, écosystème riche | ✅ Composants réutilisables ❌ Courbe d'apprentissage état |
| **Vite** | Dev server + bundler | Webpack | CRA (obsolète), Next.js | ESM natif, démarrage instantané | ✅ Hot reload rapide ❌ Moins de plugins que Webpack |
| **React Router v6** | Navigation SPA | React Router v5 | Reach Router | API `<Routes>` plus stricte | ✅ Layouts imbriqués natifs ❌ Migration v5→v6 non triviale |
| **React Query v5** | Cache + sync données serveur | Redux Toolkit Query | SWR | Léger, sans store Redux | ✅ Cache automatique, invalidation ❌ Courbe pour options avancées |
| **Zustand v5** | État global front | Redux Toolkit | Context API | 10 lignes vs 100 avec Redux | ✅ Léger, middleware persist ❌ Moins structuré pour très gros projets |
| **Tailwind CSS** | Styling utilitaire | Bootstrap | Material UI | Tree-shaking, dark mode natif | ✅ Productif, cohérent ❌ HTML verbeux |
| **Framer Motion** | Animations | CSS animations | react-spring, GSAP | Intégré au cycle de vie React | ✅ API déclarative ❌ Peut alourdir le bundle |
| **Leaflet** | Carte interactive | Google Maps SDK | Mapbox, MapLibre | Open source, sans coût API | ✅ Gratuit, léger (42 KB) ❌ Moins de features que les payants |
| **Recharts** | Graphiques | Chart.js | D3.js | Composants React purs | ✅ Déclaratif, intégration React ❌ Moins puissant que D3 pour les cas complexes |
| **Sonner** | Notifications toast | react-toastify | react-hot-toast | Minimaliste, compatible Tailwind | ✅ Léger, CSS variables ❌ Moins de features que react-toastify |
| **Node.js ≥18** | Runtime serveur | Python/Django | Java Spring, Go | Stack 100% JS, fetch natif | ✅ Même langage front/back ❌ Moins adapté aux calculs CPU lourds |
| **Express** | API REST | Fastify | NestJS, Hono | Standard industrie, middlewares matures | ✅ Flexible, écosystème large ❌ Peu d'opinions, structure à définir soi-même |
| **Zod** | Validation des entrées | Joi | Yup, Valibot | TS-first, messages d'erreur clairs | ✅ Schémas concis, inférence de type ❌ Schémas à maintenir |
| **Supabase** | Hébergeur PostgreSQL | Firebase | Nhost, PlanetScale | Vrai SQL vs NoSQL Firebase | ✅ PostgreSQL managé, RLS, gratuit ❌ Dépendance externe |
| **PostgreSQL** | Base relationnelle | MySQL | SQLite, MongoDB | JSONB natif pour pack_data | ✅ Relations + JSON flexible ❌ Plus complexe que MySQL à administrer |
| **JWT** | Auth stateless | Sessions Express | Passport.js, OAuth2 | Pas de stockage côté serveur | ✅ Stateless, vérifiable sans BDD ❌ Révocation complexe |
| **bcryptjs** | Hash mots de passe | argon2 | scrypt | Implémentation JS pure | ✅ Sans binaires natifs, coût configurable ❌ Plus lent qu'argon2 |
| **dotenv** | Variables d'environnement | Variables OS | convict | Standard universel | ✅ Centralisé, exclu de Git ❌ Fichier à gérer par environnement |
| **Anthropic/Claude** | Génération IA | OpenAI GPT-4 | Gemini, Mistral | Qualité de raisonnement, JSON structuré | ✅ Excellent pour JSON structuré ❌ Coût API à l'usage |
| **Tavily** | Recherche web temps réel | Amadeus (vols), PredictHQ (events) | SerpAPI, Brave Search | Une seule API pour vols + événements + hôtels | ✅ Gratuit, polyvalent ❌ Données moins structurées qu'une API spécialisée |

---

## 5. Clarification authentification

- **Ce que tu as codé** : Routes `/api/auth` (signup, login, me, update), middleware `requireAuth` et `optionalAuth`, génération et vérification JWT, hash bcrypt, sanitisation des sorties utilisateur.
- **Rôle de Supabase** : Uniquement hébergeur PostgreSQL — tu stockes tes users dans une table `users` que tu gères toi-même. Tu **n'utilises pas** Supabase Auth (pas de `supabase.auth.signIn`).
- **Formule exacte pour l'oral** : *"J'utilise Supabase uniquement comme hébergeur PostgreSQL managé. L'authentification est entièrement implémentée dans mon backend : JWT signé avec jsonwebtoken, mots de passe hashés avec bcryptjs au coût 12, et middleware requireAuth codé par moi qui protège toutes les routes privées."*

---

## 6. Clarification pipeline IA

- **Ce n'est pas du fine-tuning** : Les poids du modèle ne sont pas modifiés. Claude est utilisé tel quel via l'API Anthropic.
- **Ce n'est pas un agent autonome** : Le modèle ne décide pas de ses prochaines étapes. L'orchestration est codée dans `server/routes/ai.js`.
- **C'est un pipeline orchestré** : Les étapes s'enchaînent dans un ordre fixe défini par le développeur.
- **La seule partie agentique** : `chatModify` — boucle de feedback où l'utilisateur modifie le pack après génération.
- **Formule exacte pour l'oral** : *"TripGenie repose sur un pipeline IA orchestré côté serveur, avec une composante conversationnelle agentique pour la modification post-génération."*

---

## 7. Phrase clé pour l'oral

*"TripGenie est une application full-stack JavaScript : React/Vite côté front, Node.js/Express côté back, PostgreSQL via Supabase en base. La feature centrale est un pipeline IA orchestré qui combine Claude pour la génération et Tavily pour la recherche web temps réel — vols, événements, hôtels — le tout sécurisé avec JWT, Zod et Helmet, et testé avec Vitest et Supertest."*

---
