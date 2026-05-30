# CLAUDE.md — TripGenie
> **Double usage :**
> 1. **Instructions pour Claude Code** — lu automatiquement à chaque session, donne le contexte du projet sans avoir à réexpliquer
> 2. **Référentiel technique personnel** — à relire avant l'oral RNCP5 DWWM pour maîtriser chaque choix technique

---

## 1. C'EST QUOI TRIPGENIE ?

TripGenie est une **application web de génération de voyages personnalisés pilotée par intelligence artificielle**.

L'utilisateur décrit son voyage en langage naturel (destination, budget, style, dates) et l'application génère un **pack complet clé en main** : vols, hôtels, itinéraire jour par jour, activités, météo, budget ventilé — adapté à un mode de voyage choisi (luxe, fête, détente, groupe, étudiant).

### Problème résolu
Les sites de voyage classiques (Booking, Kayak, TripAdvisor) sont des **agrégateurs de données brutes** : ils donnent 300 résultats, l'utilisateur choisit seul. TripGenie fait la synthèse à la place de l'utilisateur via un pipeline IA + scoring multi-critères.

### Ce que ce n'est PAS
Ce n'est **pas** un agent IA autonome. TripGenie repose sur un **pipeline orchestré côté serveur** avec une composante conversationnelle agentique uniquement pour la modification post-génération (voir section Architecture IA).

---

## 2. STACK TECHNIQUE COMPLÈTE

### Frontend
| Technologie | Rôle | Pourquoi ce choix |
|-------------|------|-------------------|
| **React 18** | UI déclarative par composants | Écosystème mature, composants réutilisables, virtual DOM |
| **Vite** | Bundler / dev server | HMR ultra-rapide, build optimisé ES modules |
| **React Router v6** | Routage côté client (SPA) | Navigation sans rechargement de page |
| **Zustand v5** | State management global | Plus simple que Redux, API minimaliste, persist middleware |
| **React Query v5** | Fetching + cache des requêtes | Gestion automatique du cache, loading/error states, refetch |
| **Tailwind CSS** | Styles utilitaires | Cohérence visuelle rapide, responsive intégré |
| **Framer Motion** | Animations | Transitions fluides déclaratives |
| **Sonner** | Toasts / notifications | Feedback utilisateur non-bloquant |
| **Recharts** | Graphiques | Visualisation du budget breakdown |
| **Leaflet** | Carte interactive | Affichage géographique des activités |

### Backend
| Technologie | Rôle | Pourquoi ce choix |
|-------------|------|-------------------|
| **Node.js ≥18** | Runtime JavaScript serveur | Full-stack JS = un seul langage, un seul déploiement |
| **Express 4** | Framework HTTP | Léger, middleware pattern, routes modulaires |
| **Zod v4** | Validation des inputs | Schémas déclaratifs, messages d'erreur précis, TypeScript-ready |
| **JWT (jsonwebtoken)** | Authentification stateless | Token signé, pas de session serveur à maintenir |
| **bcryptjs** | Hashage des mots de passe | Algorithme de hashage lent = résistant au brute-force |
| **cookie-parser** | Lecture des cookies httpOnly | Nécessaire pour lire le token JWT depuis le cookie |
| **Helmet** | Headers de sécurité HTTP | X-Frame-Options, CSP, HSTS en un middleware |
| **CORS** | Contrôle des origines autorisées | Whitelist explicite en production |
| **express-rate-limit** | Protection contre le spam/DDoS | Limite par IP, par route |
| **Morgan** | Logger HTTP middleware | Affiche chaque requête dans le terminal : méthode, route, status code, temps de réponse. Mode `'dev'` = couleurs selon le status (vert 2xx, jaune 4xx, rouge 5xx) |

### Base de données
| Technologie | Rôle |
|-------------|------|
| **PostgreSQL** | Base relationnelle (hébergée sur Supabase) |
| **Supabase** | Hébergeur PostgreSQL + client JavaScript |
| **@supabase/supabase-js** | Client SDK pour requêtes depuis Node.js |

> **Important :** Supabase est utilisé uniquement comme hébergeur PostgreSQL.
> Supabase Auth n'est pas utilisé (auth maison via JWT signé). Le Row Level Security, lui, est désormais **géré par nous** : rôle PostgreSQL dédié sans BYPASSRLS + policies sur notre propre variable de session `app.current_user_id` (voir section 6 et `docs/RLS_MAISON.md`). Socle posé et validé (6/6 tests) ; bascule des routes en cours sur la branche `feat/postgres-rls`.

### IA & Services externes
| Service | Rôle | Fallback |
|---------|------|---------|
| **Google Gemini** | LLM principal (génération de packs) | OpenRouter |
| **OpenRouter** | LLM secondaire (accès multi-modèles) | Claude API |
| **Anthropic Claude** | LLM tertiaire | Mocks |
| **Tavily** | Recherche web temps réel (vols, événements) | Données simulées |
| **Unsplash** | Photos de destinations | Placeholder image |
| **OpenWeatherMap** | Météo en temps réel | Données IA simulées |
| **Foursquare Places API** | Restaurants réels par ville (1000 req/jour gratuit) | Yelp |
| **Yelp Fusion API** | Restaurants fallback si Foursquare vide | [] (pack sans restos) |
| **PredictHQ** | Événements réels par ville et dates (concerts, festivals) | smartEventsSearch Tavily |

### Tests
| Outil | Rôle |
|-------|------|
| **Vitest** | Test runner (compatible ESM, rapide) |
| **Supertest** | Tests d'intégration HTTP sur Express |

### DevOps
| Outil | Rôle |
|-------|------|
| **Render** | Hébergement production (PaaS) |
| **render.yaml** | Configuration déploiement déclarative |
| **dotenv** | Variables d'environnement locales |

---

## 3. ARCHITECTURE DU PROJET

```
tripgenie/
├── server/                     # Backend Node.js / Express
│   ├── index.js                # Point d'entrée : middleware, routes, démarrage
│   ├── routes/
│   │   ├── auth.js             # POST /login, /signup, /logout, GET /me
│   │   ├── trips.js            # CRUD voyages (protégé JWT)
│   │   ├── ai.js               # Pipeline IA : /generate, /chat, /onboarding
│   │   ├── votes.js            # Votes consensus — POST/GET par pack_id
│   │   ├── photos.js           # Proxy Unsplash (clé jamais côté client)
│   │   ├── packs.js            # Gestion des packs sauvegardés
│   │   ├── preferences.js      # GET/PUT /api/preferences (relation 1-1 users)
│   │   └── collaborators.js    # GET/POST/DELETE /api/trips/:id/collaborators
│   ├── middleware/
│   │   ├── auth.js             # requireAuth / optionalAuth (lecture cookie + header)
│   │   └── limiter.js          # Rate limiters dédiés aux routes IA
│   ├── services/
│   │   ├── claude/             # Pipeline IA orchestré
│   │   │   ├── index.js        # Exports publics du pipeline
│   │   │   ├── core.js         # Appel LLM multi-provider avec fallback
│   │   │   ├── analyze.js      # Analyse de la requête utilisateur
│   │   │   ├── pack.js         # Génération du pack complet (prompt engineering)
│   │   │   ├── chat.js         # Modification conversationnelle post-génération
│   │   │   └── webSearch.js    # Recherche web via Tavily
│   │   ├── smartSearch.js      # Recherche vols / hôtels / événements (Tavily + IA)
│   │   ├── foursquare.ts       # Restaurants réels Foursquare (1000/jour gratuit)
│   │   ├── yelp.ts             # Restaurants fallback Yelp (si Foursquare vide)
│   │   ├── predictHQ.ts        # Événements réels PredictHQ (concerts, festivals)
│   │   ├── scoring.js          # Algorithme de scoring multi-critères par mode
│   │   ├── weather.js          # Météo temps réel (OpenWeatherMap)
│   │   ├── photo.js            # Photo destination (Unsplash)
│   │   ├── providers.js        # Abstraction multi-LLM (Gemini/OpenRouter/Claude)
│   │   ├── mocks.js            # Données de fallback si toutes les APIs échouent
│   │   └── tools/              # Outils appelables par le pipeline IA
│   ├── lib/
│   │   ├── AppError.js         # Classe d'erreur custom + middleware global
│   │   └── constants.js        # MODES, BUDGET_RATIOS, DEFAULT_VALUES
│   └── db/
│       └── supabase.js         # Client Supabase (singleton)
│
├── client-react/               # Frontend React / Vite
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx        # Onboarding + génération de pack
│       │   ├── Trips.jsx       # Liste des voyages sauvegardés
│       │   ├── TripDetail.jsx  # Détail d'un voyage + chat de modification
│       │   └── Login.jsx       # Authentification
│       ├── components/
│       │   ├── layout/         # Header, navigation, logout
│       │   ├── results/        # PackResults : affichage du pack généré
│       │   ├── chat/           # Interface de modification conversationnelle
│       │   └── ui/             # Composants réutilisables (Button, Card, etc.)
│       ├── store/
│       │   └── index.js        # Zustand : useAuthStore, useTripStore
│       └── lib/
│           └── api.js          # Toutes les requêtes HTTP vers l'API Express
│
├── tests/
│   ├── api.test.ts             # Tests routes API de base
│   ├── golden_path.test.ts     # Flux critiques bout en bout
│   ├── scoring.test.ts         # Scoring algorithme
│   ├── middleware.test.ts      # Tests middleware auth + rate limit
│   ├── unit/
│   │   ├── scoring-party.test.ts      # Scoring mode party (fallback nightlife)
│   │   └── smartSearch-hotel.test.ts  # Fix bug Bangkok + withTimeout()
│   ├── services/
│   │   ├── predictHQ.test.ts          # PredictHQ events (mock fetch, place ID)
│   │   ├── foursquare.test.ts         # Foursquare restaurants (prix, liens TheFork)
│   │   └── yelp.test.ts               # Yelp fallback (Bearer token, chain FSQ→Yelp)
│   ├── security/
│   │   ├── auth-signup.test.ts        # Création compte (validation, bcrypt, cookie)
│   │   ├── auth-login.test.ts         # Connexion (credentials, JWT, logout)
│   │   ├── auth-tokens.test.ts        # JWT (expiration, alg:none, IDOR, claims)
│   │   └── input-validation.test.ts   # Zod validation toutes routes IA
│   └── integration/
│       └── generate-restaurants.test.ts # Pipeline FSQ→Yelp mergé dans activities
│
└── docs/                       # Documentation technique
```

---

## 4. ARCHITECTURE IA — PIPELINE ORCHESTRÉ

### Formulation exacte pour l'oral RNCP5
> *"TripGenie repose sur un **pipeline IA orchestré côté serveur**, avec une composante conversationnelle agentique pour la modification post-génération."*

### Pourquoi pipeline et pas agent autonome ?
Un **agent autonome** choisit lui-même ses outils, leur ordre d'appel, et peut itérer librement. TripGenie n'est pas ça : les étapes sont prédéfinies et s'enchaînent toujours dans le même ordre.

```
POST /api/ai/generate
        │
        ├─ 1. Validation (Zod)
        │
        ├─ 2. Promise.allSettled([            ← PARALLÈLE (30s timeout par service)
        │       smartFlightSearch(),          ← Tavily : vols réels
        │       smartEventsSearch(),          ← PredictHQ ou Tavily : événements
        │       smartHotelSearch(),           ← Tavily : hôtels
        │       getRealWeather(),             ← OpenWeatherMap
        │       getDestinationPhoto()         ← Unsplash (proxy)
        │     ])
        │
        ├─ 2b. restaurants = foursquareRestaurantSearch()  ← en parallèle aussi
        │         .then(r => r.length > 0 ? r : yelpRestaurantSearch())
        │         .catch(() => [])            ← jamais bloquant
        │
        ├─ 3. assemblePack()                  ← LLM : génère le pack JSON structuré
        │      avec prompt engineering adapté au mode (LUXURY, PARTY, STUDENT...)
        │
        ├─ 4. Merge restaurants               ← Foursquare (ou Yelp) dans activities
        │      pack.activities = [...activitiesIA, ...restaurants]
        │
        ├─ 5. scorepack()                     ← Algorithme déterministe (pas d'IA)
        │      pondération par mode de voyage
        │
        ├─ 6. Sauvegarde Supabase             ← Si utilisateur connecté
        │
        └─ 7. Réponse JSON { pack, score, flights_found, events_found }
```

### Promise.allSettled — choix technique important
```js
// On lance les 5 recherches EN PARALLÈLE
// allSettled ≠ all : si la météo échoue, le reste continue
const results = await Promise.allSettled([
  smartFlightSearch(...),
  smartEventsSearch(...),
  getRealWeather(...),
  ...
]);
```
`Promise.all` aurait arrêté toute la génération si un seul service externe échouait.
`Promise.allSettled` continue même en cas d'erreur partielle — le pack est généré avec les données disponibles.

### Ce qui est agentique : le chat de modification
```
POST /api/ai/chat
  message: "Remplace l'hôtel par quelque chose de moins cher"
  current_pack: { ... }
        │
        └─ chatModify() → LLM réagit dynamiquement, retourne les modifications
```
Ici le modèle peut choisir quoi modifier dans le pack sans étapes prédéfinies. C'est la seule partie vraiment agentique.

---

## 5. AUTHENTIFICATION — JWT EN COOKIE HTTPONLY

### Schéma de sécurité
```
1. POST /api/auth/login { email, password }
        │
        ├─ bcryptjs.compare(password, hash)   ← vérification mot de passe
        ├─ jwt.sign({ id, email })             ← création token signé
        └─ res.cookie('tg_token', token, {     ← envoi en cookie
             httpOnly: true,                   ← inaccessible en JS navigateur
             secure: true,                     ← HTTPS uniquement en prod
             sameSite: 'strict',               ← protection CSRF
             maxAge: 7j
           })

2. Requêtes suivantes :
   Cookie envoyé automatiquement par le navigateur
        │
        └─ middleware/auth.js : extractToken()
             → req.cookies.tg_token (cookie)
             → req.headers.authorization (fallback Bearer token)
```

### Pourquoi httpOnly et pas localStorage ?
- **localStorage** : accessible via JavaScript → vulnérable au XSS (Cross-Site Scripting). Une injection de script peut voler le token.
- **Cookie httpOnly** : le navigateur ne peut pas y accéder via JavaScript → le token ne peut pas être volé même en cas d'injection de script.

---

## 6. SÉCURITÉ — VUE D'ENSEMBLE

| Menace | Solution mise en place |
|--------|------------------------|
| Vol de token JWT | Cookie httpOnly + sameSite strict |
| XSS | Token inaccessible JS, Helmet headers |
| CSRF | sameSite strict sur le cookie |
| Exposition de clé API | Proxy backend (Unsplash), variables d'env serveur |
| Spam / DDoS | express-rate-limit (global + par route) |
| Injection SQL | Supabase client (requêtes paramétrées) |
| Inputs malveillants | Validation Zod sur tous les endpoints |
| Accès données inter-utilisateurs | **Défense en profondeur** : filtre applicatif `user_id` **+** RLS PostgreSQL « maison » (rôle dédié sans BYPASSRLS, fail-closed) |

### Rate limiting en détail
```
Global (toutes routes) :   100 req / 15 min / IP
Routes IA /api/ai :          5 req / 1 min   / IP  (coût LLM)
Chat /api/ai/chat :         30 req / 15 min  / IP
Votes /api/votes :          10 req / 1 min   / IP
```

### RLS « maison » — sécurité au niveau base (défense en profondeur)
Les policies d'origine (`schema.sql`) reposaient sur `auth.uid()`, une fonction de **Supabase Auth qu'on n'utilise pas** (auth maison via JWT). De plus le code se connecte avec la `SERVICE_KEY` (attribut `BYPASSRLS`) → le RLS y est ignoré.

On a donc recréé le RLS pour qu'il soit **géré par nous** (migration `server/db/migrations/0001_rls_self_managed.sql`) :
- un **rôle PostgreSQL dédié** `tripgenie_app`, **sans BYPASSRLS** et sans droit DDL (moindre privilège) ;
- une variable de session **transaction-locale** `app.current_user_id`, posée par requête via `withUser()` (`server/db/pg.ts`) ;
- des policies **fail-closed** : sans contexte utilisateur, **aucune** ligne n'est renvoyée.

Résultat : **2 barrières** (filtre applicatif `.eq('user_id')` **+** RLS Postgres). Socle validé par `scripts/test-rls.ts` (6/6). Bascule des routes de `supabase.ts` vers `pg.ts` **en cours** (branche `feat/postgres-rls`) ; tant qu'une route n'est pas migrée, elle utilise encore la `SERVICE_KEY`.

---

## 7. ALGORITHME DE SCORING

Le scoring est **déterministe** (pas d'IA) — un algorithme pur qui calcule un score entre 0 et 1 selon le mode de voyage.

### Pondération par mode
```js
const MODE_WEIGHTS = {
  luxury:  { hotel: 0.40, activities: 0.30, vol: 0.20, prix: 0.10 },
  party:   { events: 0.40, prix: 0.30, hotel: 0.20, vol: 0.10 },
  student: { prix: 0.50, activities_free: 0.25, hotel: 0.15, events: 0.10 },
  group:   { hotel: 0.35, activities: 0.30, prix: 0.20, vol: 0.15 },
  relax:   { calme: 0.35, hotel: 0.30, activities: 0.25, prix: 0.10 },
}
```

### Exemple mode LUXURY
- L'hôtel pèse 40% du score → 5 étoiles = score maximal
- Les activités pèsent 30% → activités > 100€ = premium
- Le prix ne pèse que 10% → budget non limitant

### Résultat
```json
{
  "total": 0.78,
  "details": {
    "vol": 0.82,
    "hotel": 0.90,
    "events": 0.30,
    "activities": 0.75,
    "prix": 0.50
  }
}
```

---

## 8. MODÈLES DE DONNÉES (POSTGRESQL)

### Table `users`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
email       TEXT UNIQUE NOT NULL
password    TEXT NOT NULL          -- hashé bcryptjs
name        TEXT
created_at  TIMESTAMPTZ DEFAULT now()
```

### Table `trips`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES users(id) ON DELETE CASCADE
title       TEXT
destination TEXT
origin      TEXT
departure   DATE
return_date DATE
travelers   INTEGER
budget      TEXT
mode        TEXT                   -- party | luxury | student | group | relax
pack_data   JSONB                  -- pack complet sérialisé
score       NUMERIC
status      TEXT DEFAULT 'draft'   -- draft | confirmed | archived
created_at  TIMESTAMPTZ DEFAULT now()
updated_at  TIMESTAMPTZ DEFAULT now()
```

### Table `trip_votes`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
pack_id     UUID REFERENCES packs(id) ON DELETE CASCADE  -- vote sur un pack précis
item_id     TEXT                   -- identifiant de l'élément voté (flight_0, hotel_1...)
voter_name  TEXT DEFAULT 'Anonyme'
vote_type   BOOLEAN                -- true = pour, false = contre
created_at  TIMESTAMPTZ DEFAULT now()
```

---

## 9. ROUTES API — RÉFÉRENCE

### Auth
```
POST   /api/auth/signup     { email, password, name } → 201 + cookie
POST   /api/auth/login      { email, password }       → 200 + cookie
POST   /api/auth/logout     —                         → 200 + clear cookie
GET    /api/auth/me         (cookie)                  → { user }
```

### IA
```
POST   /api/ai/generate     { destination, origin, departure, return_date,
                              travelers, budget, mode }  → { pack, score, trip_id }
POST   /api/ai/chat         { message, current_pack, mode, trip_id }  → { reply, modifications }
POST   /api/ai/onboarding   { userMessage, currentData } → { extractedData, reply }
POST   /api/ai/destinations { mode, budget, travelers }  → destinations[]
```

### Voyages
```
GET    /api/trips           (auth) → trips[]
GET    /api/trips/:id       (auth) → trip
GET    /api/trips/share/:id (public) → trip
DELETE /api/trips/:id       (auth) → 200
```

### Votes
```
POST   /api/votes           { pack_id, item_id, vote_type, voter_name } → 201
GET    /api/votes/:pack_id  → votes[]
```

### Préférences
```
GET    /api/preferences     (auth) → { preferences }
PUT    /api/preferences     (auth) { default_mode, preferred_prefs, home_city, currency } → { preferences }
```

### Collaborateurs
```
GET    /api/trips/:id/collaborators          (auth) → collaborators[]
POST   /api/trips/:id/collaborators          (auth) { email, role } → 201 + collaborator
DELETE /api/trips/:id/collaborators/:user_id (auth) → 200
```

### Divers
```
GET    /api/photos/:city    → { url }   (proxy Unsplash)
GET    /api/health          → { status: 'ok' }
```

---

## 10. LIENS AVEC LA FORMATION HOLBERTON

| Exercices Holberton | Application dans TripGenie |
|---------------------|---------------------------|
| **SQL** (web_back_end) | Tables PostgreSQL, clés primaires UUID, clés étrangères avec CASCADE, requêtes filtrées `.eq()` |
| **ES6 Promises** | `Promise.allSettled()` pour les 5 recherches parallèles — `allSettled` choisi exprès pour ne pas bloquer sur un échec partiel |
| **RESTful API** | Routes Express : GET/POST/DELETE, status codes HTTP corrects (200/201/400/401/404/429) |
| **Authentication** | JWT signé + bcryptjs pour le hashage — mêmes principes que les exercices `Basic_authentication` et `Session_authentication` |
| **Python OOP** (hbnb) | Même logique de séparation des responsabilités : routes → services → base de données |
| **HBnB Part 4 solo** | JS vanilla + JWT cookie + Fetch API → directement transposé en React + cookie httpOnly dans TripGenie |
| **TDD** | Tests Vitest + Supertest : mocks, golden path, edge cases — même approche que les exercices unittest Python |
| **Sécurité web** | JWT alg:none attack, IDOR, XSS via cookie httpOnly — couvre les concepts de la spécialisation cybersécurité |
| **APIs REST externes** | Foursquare, Yelp, PredictHQ — intégration, gestion d'erreurs, fallback chain, comme les exercices d'intégration d'API |

---

## 11. DÉPLOIEMENT

### Configuration Render (render.yaml)
```yaml
services:
  - type: web
    name: tripgenie-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: ALLOWED_ORIGINS
        value: https://tripgenie.onrender.com
```

### Variables d'environnement requises
```
# Serveur
PORT=3000
NODE_ENV=production
JWT_SECRET=<secret fort>
ALLOWED_ORIGINS=https://tripgenie.onrender.com

# Base de données
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=<service role key>

# IA
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
ANTHROPIC_API_KEY=...
TAVILY_API_KEY=...

# Services
UNSPLASH_ACCESS_KEY=...
OPENWEATHER_API_KEY=...
```

---

## 12. TESTS — STRATÉGIE

### Architecture des tests (10 fichiers organisés par couche)

```
tests/
├── unit/               ← Fonctions isolées, pas de HTTP
│   ├── scoring-party.test.ts       15 tests — mode party, fallback nightlife
│   └── smartSearch-hotel.test.ts   12 tests — bug Bangkok URL, withTimeout()
│
├── services/           ← Services externes mockés (fetch global)
│   ├── predictHQ.test.ts           15 tests — place ID → events, catégories par mode
│   ├── foursquare.test.ts          17 tests — prix, emoji, TheFork URL, queries mode
│   └── yelp.test.ts                10 tests — Bearer token, fallback chain FSQ→Yelp
│
├── security/           ← Sécurité auth + inputs
│   ├── auth-signup.test.ts         12 tests — validation, bcrypt, cookie httpOnly
│   ├── auth-login.test.ts          12 tests — credentials, JWT, logout, GET /me
│   ├── auth-tokens.test.ts         13 tests — expiration, alg:none, IDOR, claims
│   └── input-validation.test.ts    15 tests — Zod toutes routes, injections
│
└── integration/        ← Pipeline complet HTTP (Supertest)
    └── generate-restaurants.test.ts  8 tests — FSQ+Yelp mergés dans activities
```

**Total : ~129 tests**

### Principe des mocks
Tous les services externes sont mockés en test :
- **LLM** (Claude/Gemini) → `assemblePack: vi.fn()` + `vi.mocked()` pour contrôle
- **Supabase** → chaîne de mock (`from → select → eq → single`) + `vi.hoisted()`
- **Foursquare / Yelp / PredictHQ** → `global.fetch = vi.fn()` avant import du service
- **Tavily / Unsplash / Météo** → données statiques
- **Rate limiters** → passthrough (sinon les tests s'auto-bloquent après 5 requêtes)

### Pattern vitest important — `vi.hoisted()`
```typescript
// PROBLÈME : vi.mock() est hoisté au top du fichier
// Les const déclarées après sont inaccessibles dans la factory

// ❌ CASSÉ
const mockSingle = vi.fn();
vi.mock('supabase', () => ({ single: mockSingle })); // ReferenceError !

// ✅ CORRECT — vi.hoisted() s'exécute avant les imports
const { mockSingle } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  return { mockSingle };
});
vi.mock('supabase', () => ({ single: mockSingle })); // OK
```

---

## 13. CONVENTIONS DE TRAVAIL

### Commits
- **En français**, atomiques, un sujet par commit
- Format : `type: description courte` (feat, fix, refactor, test, docs, chore)
- Exemples : `feat: ajouter proxy Unsplash côté serveur`, `fix: corriger accès issues Zod v4`

### Règles de code
- **Jamais de `console.log` en production** sans raison — utiliser `console.error` pour les erreurs
- **Toujours valider les inputs** avec Zod avant de toucher à la base de données
- **Jamais de clé API dans le code client** — proxy backend ou variable d'environnement serveur
- **`credentials: 'include'`** sur toutes les requêtes fetch pour envoyer le cookie

### Structure d'une route Express type
```js
router.post('/route', middleware, async (req, res, next) => {
  try {
    // 1. Validation Zod
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.issues[0].message, 400));

    // 2. Logique métier

    // 3. Réponse
    res.status(200).json({ data });

  } catch (err) {
    next(err); // AppError → globalErrorHandler
  }
});
```

---

## 14. QUESTIONS JURY ANTICIPÉES

**"Pourquoi JavaScript et pas Python/Flask comme en formation ?"**
> Full-stack JS = un seul langage, un seul runtime, un seul déploiement. Pas de changement de contexte mental entre frontend et backend. Flask aurait nécessité un déploiement séparé et une communication inter-services supplémentaire.

**"Pourquoi pas un ORM pour PostgreSQL ?"**
> Le client Supabase est suffisant pour mes besoins. Il génère des requêtes paramétrées sécurisées sans injection SQL. Un ORM comme Prisma aurait ajouté de la complexité (migrations, schéma déclaratif) sans bénéfice réel à mon échelle.

**"C'est quoi un pipeline IA orchestré ?"**
> Un pipeline où les étapes sont prédéfinies et s'enchaînent dans un ordre fixe. Différent d'un agent autonome qui décide lui-même quels outils appeler. Chez moi : analyze → search → assemble → score. Toujours dans cet ordre, toujours ces étapes.

**"Pourquoi `Promise.allSettled` et pas `Promise.all` ?"**
> `Promise.all` échoue si une seule promesse échoue. Si l'API météo est en panne, toute la génération s'arrête. `Promise.allSettled` attend toutes les promesses quelle que soit leur issue — le pack est généré avec les données disponibles, avec fallback sur les données IA si une source externe échoue.

**"Comment tu sécurises les données utilisateur ?"**
> Trois niveaux : JWT en cookie httpOnly (vol de token impossible par XSS), validation Zod sur chaque input (injection impossible), filtrage par `user_id` sur chaque requête SQL (isolation des données inter-utilisateurs).

**"Ton RLS est activé ?"**
> Oui, mais c'est un RLS **que je gère moi-même**, pas celui de Supabase Auth. Les policies d'origine utilisaient `auth.uid()` (Supabase Auth, que je n'utilise pas), et le code se connectait avec la clé de service qui contourne le RLS. J'ai donc créé un rôle PostgreSQL dédié **sans BYPASSRLS**, qui lit ma propre variable de session `app.current_user_id` posée par transaction (`withUser()`). Ça me donne deux barrières : le filtre applicatif **et** le RLS au niveau base. Le comportement par défaut est **fail-closed** : sans utilisateur posé, la base ne renvoie aucune ligne. Je bascule les routes une par une vers cette couche (branche `feat/postgres-rls`).

**"Pourquoi Vitest et pas Jest ?"**
> Vitest est natif ESM, compatible avec la configuration Vite/ES modules du projet. Jest nécessiterait une configuration de transpilation supplémentaire pour les imports ES modules. Vitest est aussi significativement plus rapide.

**"C'est quoi une SPA et pourquoi ce choix ?"**
> SPA = Single Page Application. Un seul fichier HTML est chargé, React gère ensuite toute la navigation côté client sans rechargement. TripGenie est une app derrière authentification — le SEO n'a aucune valeur (Google ne peut pas se connecter). La SPA permet de maintenir l'état de génération IA (15s de traitement) et le chat de modification en mémoire sans perdre le contexte. Pour un site vitrine public, j'aurais choisi Next.js (SSR + SEO).

**"Pourquoi pas Next.js ?"**
> Next.js est plus adapté quand on a besoin de SSR pour le SEO ou d'ISR pour des pages produit. TripGenie est une app authentifiée sans besoin de référencement Google. React + Express séparés me permettent de maîtriser clairement chaque couche indépendamment — c'est pédagogiquement plus riche pour montrer la séparation frontend / backend / base de données.

**"Comment fonctionne la chaîne Foursquare → Yelp ?"**
> Foursquare est interrogé en premier (1000 req/jour gratuites). Si la réponse est vide, Yelp prend le relais. Si les deux échouent, le pack est généré sans restaurants — le `.catch(() => [])` garantit que le pipeline ne s'arrête jamais à cause des restaurants. C'est une dégradation gracieuse.

**"C'est quoi le code HTTP 409 ?"**
> 409 Conflict = la requête est valide mais crée un conflit avec l'état actuel de la base. Typiquement utilisé quand un email est déjà enregistré. Différent du 400 (requête mal formée) — l'email est valide, c'est la donnée qui est en conflit.

**"Comment tu testes la sécurité JWT ?"**
> J'ai une suite dédiée `auth-tokens.test.ts` qui couvre : token expiré (401), mauvaise signature (401), attaque alg:none (forge de token sans secret → 401), IDOR (User A ne peut pas accéder aux trips de User B → 404), token dans cookie vs Bearer header. Tous les services externes sont mockés — seul le middleware auth est testé en conditions réelles.

---

## 15. RESPONSIVE MOBILE — MODIFICATIONS UI

### Problèmes corrigés

**TripDetail.tsx — ModifyChat inaccessible sur mobile**
- Avant : `hidden lg:flex` → le chat était invisible sur téléphone
- Après : Bottom sheet (88vh) avec `AnimatePresence` + spring animation
- FAB (bouton flottant) à `bottom-20` (80px) pour passer au-dessus de la barre iOS Safari
- Overlay backdrop cliquable pour fermer le sheet

**ChatWidget.tsx — Chips non cliquables**
- Avant : chips "Oui, montre-moi !" visuellement présentes mais inactives
- Après : `onChipClick` prop sur le composant `Message`, seul le dernier message bot a les chips cliquables
- `active:scale-95` + `cursor-pointer` pour feedback tactile

**Footer — Liens faux**
- Avant : `<li className="cursor-pointer">` qui ne fait rien
- Après : `<Link to="/">` React Router real

**PackResults — Bouton PDF**
- Avant : toast "génération PDF en cours" sans rien faire
- Après : `window.print()` → export PDF natif du navigateur

**Home.tsx + Trips.tsx — Accessibilité clavier**
- `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter + Space)
- `focus:ring-2 focus:ring-gold/60` pour la navigation clavier visible
