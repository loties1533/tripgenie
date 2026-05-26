<div align="center">

# ✈️ TripGenie

### AI-Powered Travel Pack Generator

**Décris ton voyage. TripGenie génère tout le reste.**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://supabase.com)
[![Vitest](https://img.shields.io/badge/Vitest-77_tests-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev)

[🚀 Demo Live](https://tripgenie.onrender.com) · [📖 Doc Technique](./docs/) · [🐛 Issues](https://github.com/loties1533/tripgenie/issues)

---

</div>

## 🎯 Présentation

Les comparateurs de voyage (Booking, Kayak, TripAdvisor) retournent **300 résultats bruts**. L'utilisateur doit filtrer, comparer, décider seul.

**TripGenie fait la synthèse à sa place.**

L'utilisateur décrit son voyage en langage naturel → l'app génère un **pack complet clé en main** en moins de 30 secondes :

- ✈️ Vols avec prix et compagnies
- 🏨 Hôtels sélectionnés selon le style de voyage
- 🗓️ Itinéraire jour par jour
- 🎉 Événements locaux pendant le séjour
- 🌤️ Météo prévue
- 💰 Budget ventilé par poste
- 📊 Score de qualité du pack (0–1)

---

## ✨ Fonctionnalités

### Onboarding conversationnel
L'IA pose des questions naturelles pour extraire destination, budget, style, dates — et génère le pack à la fin. Pas de formulaire complexe.

### Données temps réel
Vols, hôtels et événements sont récupérés via **Tavily** (recherche web temps réel) pour éviter les hallucinations LLM sur les prix et disponibilités.

### 5 modes de voyage
`party` · `luxury` · `student` · `group` · `relax` — chaque mode adapte le prompt IA, le scoring et la répartition budgétaire.

### Chat de modification post-génération
Après génération, l'utilisateur modifie le pack en langage naturel : *"Change l'hôtel pour quelque chose de moins cher"* → le pack se met à jour sans tout régénérer.

### Carte interactive
Visualisation des activités et hôtels sur une carte Leaflet avec marqueurs géolocalisés.

### Partage public
Chaque voyage génère un lien public `/share/:id` — consultable sans compte.

### Vote collectif
En mode groupe, chaque membre vote pour/contre les éléments du pack pour construire un consensus.

---

## 🏗️ Architecture

> **Pipeline IA orchestré côté serveur — pas un agent autonome.** Les étapes sont prédéfinies et s'enchaînent toujours dans le même ordre. Seul le chat de modification (`/api/ai/chat`) est agentique.

![Architecture](./docs/assets/diagrams/architecture.png)

```
POST /api/ai/generate
        │
        ├─ 1. Validation Zod
        │
        ├─ 2. Promise.allSettled([          ← Parallèle, 15s timeout
        │       smartFlightSearch(),        ← Tavily : vols réels
        │       smartEventsSearch(),        ← Tavily : événements
        │       smartHotelSearch(),         ← Tavily : hôtels
        │       getRealWeather(),           ← OpenWeatherMap
        │       getDestinationPhoto()       ← Unsplash (proxy)
        │     ])
        │
        ├─ 3. assemblePack()               ← LLM + données réelles injectées
        │      Gemini → Claude → OpenRouter (fallback chain)
        │
        ├─ 4. scorepack()                  ← Algorithme déterministe (0–1)
        │      pondération par mode de voyage
        │
        └─ 5. Sauvegarde Supabase          ← Si utilisateur connecté
```

### Chaîne de résilience LLM

![Fallback LLM](./docs/assets/diagrams/llm_fallback.png)

Si le LLM principal échoue, le pipeline enchaîne automatiquement les fallbacks jusqu'aux mocks statiques. `Promise.allSettled` garantit que la génération continue même si un service externe est en panne.

---

## 📊 Base de données

3 tables PostgreSQL conçues manuellement — aucun ORM. Requêtes paramétrées via le client Supabase JS.

![ERD](./docs/assets/diagrams/erd.png)

```sql
users        — Comptes utilisateurs, auth JWT custom (pas Supabase Auth)
trips        — Voyages avec pack_data JSONB + score float 0-1
trip_votes   — Votes collectifs par item (true = pour, false = contre)
```

**Choix techniques notables :**
- `pack_data JSONB` : structure variable selon le mode, plus adapté qu'une normalisation en 10+ tables
- `score FLOAT` : calculé par l'algorithme déterministe, jamais par un LLM
- Pas de Supabase RLS — sécurité applicative via `.eq('user_id', req.user.id)` sur chaque requête

---

## 🔄 Diagrammes de séquence

### Génération de pack (US-03)

![Séquence génération](./docs/assets/diagrams/seq_generate.png)

### Authentification JWT (US-02)

![Séquence auth](./docs/assets/diagrams/seq_auth.png)

---

## 📐 Algorithme de Scoring

100% déterministe — zéro IA. Même entrée → même sortie. Score float entre 0 et 1.

![Scoring](./docs/assets/diagrams/scoring.png)

| Mode | Hôtel | Activités | Vols | Prix | Événements |
|------|-------|-----------|------|------|------------|
| luxury | 40% | 30% | 20% | 10% | — |
| party | 20% | — | 10% | 30% | 40% |
| student | 15% | 25% | — | 50% | 10% |
| group | 35% | 30% | 15% | 20% | — |
| relax | 30% | 25% | — | 10% | — |

---

## 🛠️ Stack Technique

### Frontend
| Technologie | Rôle |
|-------------|------|
| React 18 + Vite | UI déclarative, HMR ultra-rapide |
| TypeScript | Typage statique partagé front/back |
| React Router v6 | SPA — navigation sans rechargement |
| Zustand v5 | State management global (auth + trips) |
| React Query v5 | Cache + fetching automatique |
| Tailwind CSS | Styles utilitaires |
| Framer Motion | Animations déclaratives |
| Leaflet | Carte interactive |
| Recharts | Graphique budget breakdown |

### Backend
| Technologie | Rôle |
|-------------|------|
| Node.js ≥18 + Express 4 | Runtime + framework HTTP |
| TypeScript | Typage statique |
| Zod v4 | Validation des inputs — aucun endpoint sans validation |
| JWT + bcryptjs | Auth stateless + hashage bcrypt |
| cookie-parser | Lecture cookie httpOnly |
| Helmet + CORS | Headers de sécurité HTTP |
| express-rate-limit | Protection DDoS (10 req/h routes IA) |
| Morgan | Logger HTTP (méthode, route, status, durée) |

### IA & Services externes
| Service | Rôle | Fallback |
|---------|------|---------|
| Google Gemini | LLM principal — génération des packs | Claude |
| Anthropic Claude | LLM secondaire | OpenRouter |
| OpenRouter | LLM tertiaire — 12 modèles gratuits | Mocks statiques |
| Tavily | Recherche web temps réel (vols, hôtels, événements) | Données IA |
| OpenWeatherMap | Météo en temps réel | Données IA simulées |
| Unsplash | Photos destinations (proxy backend) | Placeholder |

---

## 🔒 Sécurité

| Menace | Solution |
|--------|----------|
| Vol de token JWT | Cookie httpOnly — inaccessible depuis JavaScript |
| XSS | Token hors portée JS + Helmet CSP headers |
| CSRF | `sameSite: strict` sur le cookie |
| Injection SQL | Requêtes paramétrées Supabase client |
| Inputs malveillants | Validation Zod sur tous les endpoints |
| Spam / DDoS | Rate limiting par IP (global + par route IA) |
| Exposition clés API | Proxy backend Unsplash, variables d'env serveur |
| Accès inter-utilisateurs | `.eq('user_id', req.user.id)` systématique |

---

## 🧪 Tests

```bash
# Lancer les 77 tests (~0.4 secondes)
npm test

# Avec coverage
npm run test:coverage
```

```
✓ api.test.ts           40 tests  — Routes HTTP : auth, trips, votes, rate limiting, CORS
✓ golden_path.test.ts   15 tests  — Flux critiques end-to-end : generate, chat, photos
✓ scoring.test.ts       12 tests  — Algorithme de scoring sur tous les modes
✓ middleware.test.ts    10 tests  — JWT : token absent, expiré, invalide
─────────────────────────────────────────────────────────────────────────
  77 tests passed in 0.4s
```

Tous les services externes (LLM, Supabase, Tavily, OpenWeatherMap) sont **mockés** — les tests tournent sans aucune clé API.

---

## 🚀 Installation locale

### Prérequis
- Node.js ≥ 18
- Un compte Supabase (gratuit)
- Au moins une clé LLM (Gemini gratuit suffit)

### Setup

```bash
# 1. Cloner le repo
git clone https://github.com/loties1533/tripgenie.git
cd tripgenie

# 2. Installer les dépendances backend
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Remplir .env avec tes clés API

# 4. Lancer en développement
npm run dev          # Backend Express → http://localhost:3000
npm run client:dev   # Frontend Vite  → http://localhost:5173
```

### Variables d'environnement

```env
# Serveur
PORT=3000
JWT_SECRET=your-strong-secret-here
ALLOWED_ORIGINS=http://localhost:5173

# Base de données
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# IA (au moins une clé requise)
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
OPENROUTER_API_KEY=...

# Services (optionnels — fallback IA si absent)
TAVILY_API_KEY=...
UNSPLASH_ACCESS_KEY=...
OPENWEATHER_API_KEY=...
```

> L'app démarre même sans toutes les APIs. Le pipeline IA enchaîne les fallbacks jusqu'aux mocks statiques.

---

## 📁 Structure du projet

```
tripgenie/
├── server/                     # Backend Node.js / Express / TypeScript
│   ├── index.ts                # Point d'entrée — middleware, routes, démarrage
│   ├── routes/                 # auth · trips · ai · votes · photos · packs
│   ├── middleware/             # requireAuth · optionalAuth · rate limiters
│   ├── services/
│   │   ├── claude/             # Pipeline IA : core · analyze · pack · chat
│   │   ├── providers.ts        # Abstraction multi-LLM (Gemini / Claude / OpenRouter)
│   │   ├── scoring.ts          # Algorithme scoring déterministe 0–1
│   │   ├── smartSearch.ts      # Recherche vols / hôtels / événements (Tavily)
│   │   ├── weather.ts          # Météo OpenWeatherMap
│   │   └── mocks.ts            # Fallback données statiques
│   ├── lib/
│   │   ├── AppError.ts         # Classe erreur custom + middleware global
│   │   └── constants.ts        # MODES, BUDGET_RATIOS, DEFAULT_VALUES
│   └── db/supabase.ts          # Client PostgreSQL (singleton)
│
├── client-react/               # Frontend React / Vite / TypeScript
│   └── src/
│       ├── pages/              # Home · Trips · TripDetail · Login
│       ├── components/         # PackResults · Chat · Map · UI
│       ├── store/              # Zustand : useAuthStore · useTripStore
│       └── lib/api.ts          # Toutes les requêtes HTTP vers l'API
│
├── tests/                      # 77 tests Vitest + Supertest
│   ├── api.test.ts
│   ├── golden_path.test.ts
│   ├── scoring.test.ts
│   └── middleware.test.ts
│
└── docs/                       # Documentation technique
    ├── DIAGRAMS.md             # Diagrammes Mermaid source
    └── assets/diagrams/        # PNG générés (architecture, ERD, séquences...)
```

---

## 🌐 Routes API

### Authentification
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/signup` | — | Création de compte |
| POST | `/api/auth/login` | — | Connexion + cookie JWT |
| POST | `/api/auth/logout` | — | Suppression du cookie |
| GET | `/api/auth/me` | requireAuth | Profil utilisateur connecté |

### IA
| Méthode | Route | Auth | Limite |
|---------|-------|------|--------|
| POST | `/api/ai/generate` | optionalAuth | 10/h/IP |
| POST | `/api/ai/chat` | optionalAuth | 30/15min/IP |
| POST | `/api/ai/onboarding` | — | 20/h/IP |
| POST | `/api/ai/destinations` | — | 10/h/IP |

### Voyages
| Méthode | Route | Auth |
|---------|-------|------|
| GET | `/api/trips` | requireAuth |
| GET | `/api/trips/:id` | requireAuth |
| DELETE | `/api/trips/:id` | requireAuth |
| GET | `/api/trips/share/:id` | public |

### Divers
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/votes` | Vote sur un élément du pack |
| GET | `/api/votes/:trip_id` | Récupérer les votes |
| GET | `/api/photos/:city` | Photo destination (proxy Unsplash) |
| GET | `/api/health` | Healthcheck |

---

<div align="center">

**Projet solo — Formation Holberton School — Mai 2026**

*TripGenie — Explorez le monde, l'IA s'occupe du reste.*

</div>
