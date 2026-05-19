<div align="center">

# ✈️ TripGenie

### AI-Powered Travel Pack Generator

**Décris ton voyage. TripGenie génère tout le reste.**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://supabase.com)
[![Vitest](https://img.shields.io/badge/Vitest-55_tests-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev)

[🚀 Demo Live](https://tripgenie.onrender.com) · [📖 Doc Technique](./docs/) · [🐛 Issues](https://github.com/loties1533/tripgenie/issues)

---

![TripGenie Demo](https://images.unsplash.com/photo-1488085061387-422e29b40080?w=900&h=400&fit=crop&q=80)

</div>

---

## 🎯 C'est quoi TripGenie ?

Les comparateurs de voyage (Booking, Kayak, TripAdvisor) retournent **300 résultats bruts**. Tu dois toi-même filtrer, comparer, décider.

**TripGenie fait la synthèse à ta place.**

Tu décris ton voyage en langage naturel → l'app génère un **pack complet clé en main** en moins de 30 secondes :

- ✈️ Vols avec prix et compagnies
- 🏨 Hôtels sélectionnés selon ton style
- 🗓️ Itinéraire jour par jour
- 🎉 Événements locaux pendant ton séjour
- 🌤️ Météo prévue
- 💰 Budget ventilé par poste
- 📊 Score de qualité du pack (0–1)

---

## ✨ Fonctionnalités

### 🤖 Onboarding conversationnel
Pas de formulaires. L'IA pose des questions naturelles pour extraire destination, budget, style, dates — et génère le pack à la fin.

### 🔍 Données temps réel
Vols, hôtels et événements sont cherchés via **Tavily** (recherche web) pour éviter les hallucinations LLM sur les prix et disponibilités.

### 🎛️ 5 modes de voyage
`party` · `luxury` · `student` · `group` · `relax` — chaque mode adapte le prompt IA, le scoring et la répartition budgétaire.

### 💬 Chat de modification
Après génération, modifie le pack en langage naturel : *"Change l'hôtel pour quelque chose de moins cher"*, *"Ajoute une journée de randonnée"* → le pack se met à jour.

### 🗺️ Carte interactive
Visualise les activités et hôtels sur une carte Leaflet avec marqueurs réels.

### 🔗 Partage public
Chaque voyage a un lien de partage public — tes amis voient le pack sans avoir besoin d'un compte.

### 🗳️ Vote collectif
En mode groupe, chaque membre vote pour/contre les éléments du pack pour construire un consensus.

---

## 🏗️ Architecture

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
        ├─ 3. assemblePack()               ← LLM avec données injectées
        │      Gemini → OpenRouter → Claude (fallback chain)
        │
        ├─ 4. scorepack()                  ← Algorithme déterministe (0–1)
        │      pondération par mode de voyage
        │
        └─ 5. Sauvegarde Supabase          ← Si utilisateur connecté
```

> **Pipeline orchestré, pas un agent autonome.** Les étapes sont prédéfinies et s'enchaînent toujours dans le même ordre. Seul le chat de modification (`/api/ai/chat`) est véritablement agentique.

---

## 🛠️ Stack Technique

### Frontend
| Technologie | Rôle |
|-------------|------|
| React 18 + Vite | UI déclarative, HMR ultra-rapide |
| TypeScript | Typage statique |
| Zustand v5 | State management global |
| React Query v5 | Cache + fetching |
| Tailwind CSS | Styles utilitaires |
| Framer Motion | Animations |
| Leaflet | Carte interactive |
| Recharts | Graphique budget breakdown |

### Backend
| Technologie | Rôle |
|-------------|------|
| Node.js ≥18 + Express 4 | Runtime + Framework HTTP |
| TypeScript | Typage statique (migration v4 : 8 bugs détectés) |
| Zod v4 | Validation des inputs |
| JWT + bcryptjs | Auth stateless + hashage |
| Helmet + CORS | Sécurité HTTP |
| express-rate-limit | Protection DDoS (10 req/h sur les routes IA) |

### IA & Services
| Service | Rôle |
|---------|------|
| **Google Gemini** | LLM principal |
| **OpenRouter** | LLM fallback |
| **Anthropic Claude** | LLM fallback tertiaire |
| **Tavily** | Recherche web temps réel |
| **OpenWeatherMap** | Météo |
| **Unsplash** | Photos (proxy backend) |
| **PostgreSQL / Supabase** | Base de données |

---

## 🔒 Sécurité

- **JWT en cookie httpOnly** — inaccessible depuis JavaScript → protège contre le XSS
- **sameSite: strict** — protection CSRF
- **Validation Zod** sur tous les endpoints — pas d'injection possible
- **Isolation SQL** — `.eq('user_id', req.user.id)` sur chaque requête
- **Clés API jamais côté client** — proxy backend pour Unsplash, variables d'env pour le reste

---

## 🚀 Installation locale

### Prérequis
- Node.js ≥ 18
- Un compte Supabase (gratuit)
- Une clé Gemini API (gratuit)

### Setup

```bash
# 1. Cloner le repo
git clone https://github.com/loties1533/tripgenie.git
cd tripgenie

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Remplir .env avec tes clés API

# 4. Lancer en développement
npm run dev          # Backend Express (port 3000)
npm run client:dev   # Frontend Vite (port 5173)
```

### Variables d'environnement requises

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
OPENROUTER_API_KEY=...
ANTHROPIC_API_KEY=...

# Services (optionnels — fallback IA si absent)
TAVILY_API_KEY=...
UNSPLASH_ACCESS_KEY=...
OPENWEATHER_API_KEY=...
```

> **Note :** L'appli démarre même sans Supabase ni les APIs externes. Le LLM génère des données simulées cohérentes en fallback.

---

## 🧪 Tests

```bash
# Lancer les 55 tests (0.3 secondes)
npm test

# Avec coverage
npm run test:coverage
```

```
✓ api.test.ts         35 tests  — Routes HTTP, auth, rate limiting
✓ golden_path.test.ts 11 tests  — Flux critiques end-to-end
✓ scoring.test.ts      9 tests  — Algorithme de scoring
─────────────────────────────────
  55 tests passed in 0.31s
```

Tous les services externes (LLM, Supabase, Tavily) sont **mockés** — pas besoin de vraies clés pour faire tourner les tests.

---

## 📁 Structure du projet

```
tripgenie/
├── server/                     # Backend Node.js / Express / TypeScript
│   ├── routes/                 # auth · trips · ai · votes · photos
│   ├── middleware/             # JWT auth · rate limiting
│   ├── services/
│   │   ├── claude/             # Pipeline IA : analyze · pack · chat
│   │   ├── smartSearch.ts      # Recherche vols / hôtels / événements
│   │   ├── scoring.ts          # Algorithme scoring 0–1
│   │   └── weather.ts          # Météo OpenWeatherMap
│   └── db/supabase.ts          # Client PostgreSQL
│
├── client-react/               # Frontend React / Vite / TypeScript
│   └── src/
│       ├── pages/              # Home · Trips · TripDetail · Login
│       ├── components/         # PackResults · Chat · Map · UI
│       ├── store/              # Zustand auth + trips
│       └── lib/api.ts          # Requêtes HTTP
│
└── tests/                      # 55 tests Vitest + Supertest
```

---

## 📊 Base de données

6 tables PostgreSQL conçues manuellement :

```sql
users              — Comptes utilisateurs (JWT custom, pas Supabase Auth)
trips              — Voyages avec pack_data JSONB + score
packs              — Packs générés liés aux voyages
user_preferences   — Préférences utilisateur
trip_votes         — Votes collectifs (true/false par item)
trip_collaborators — Collaborateurs sur un voyage partagé
```

---

## 🗺️ Roadmap

- [x] Génération de pack complète (vols, hôtels, itinéraire, événements)
- [x] Chat de modification post-génération
- [x] Authentification JWT sécurisée
- [x] Scoring multi-critères par mode
- [x] Vote collectif
- [x] Migration TypeScript complète
- [ ] Export PDF du pack
- [ ] Intégration Google Places (notes et photos réelles)
- [ ] PWA — installation mobile

---

<div align="center">

**Projet solo — Formation Holberton School**

*TripGenie — Explorez le monde, l'IA s'occupe du reste.*

</div>
