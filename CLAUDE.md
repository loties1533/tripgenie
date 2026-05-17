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

> **Important :** Supabase est utilisé uniquement comme hébergeur PostgreSQL et client SQL.
> Ni Supabase Auth, ni le Row Level Security ne sont utilisés — la sécurité est gérée au niveau applicatif (voir section Sécurité).

### IA & Services externes
| Service | Rôle | Fallback |
|---------|------|---------|
| **Google Gemini** | LLM principal (génération de packs) | OpenRouter |
| **OpenRouter** | LLM secondaire (accès multi-modèles) | Claude API |
| **Anthropic Claude** | LLM tertiaire | Mocks |
| **Tavily** | Recherche web temps réel (vols, événements) | Données simulées |
| **Unsplash** | Photos de destinations | Placeholder image |
| **OpenWeatherMap** | Météo en temps réel | Données IA simulées |

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
│   │   ├── votes.js            # Votes consensus sur les packs partagés
│   │   ├── photos.js           # Proxy Unsplash (clé jamais côté client)
│   │   └── packs.js            # Gestion des packs sauvegardés
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
│   ├── golden_path.test.js     # Tests d'intégration flux critiques (Vitest + Supertest)
│   ├── scoring.test.js         # Tests unitaires algorithme de scoring
│   └── api.test.js             # Tests routes API
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
        ├─ 2. Promise.allSettled([            ← PARALLÈLE (15s timeout)
        │       smartFlightSearch(),          ← Tavily : vols réels
        │       smartEventsSearch(),          ← Tavily : événements locaux
        │       smartHotelSearch(),           ← Tavily : hôtels
        │       getRealWeather(),             ← OpenWeatherMap
        │       getDestinationPhoto()         ← Unsplash (proxy)
        │     ])
        │
        ├─ 3. assemblePack()                  ← LLM : génère le pack JSON structuré
        │      avec prompt engineering adapté au mode (LUXURY, PARTY, STUDENT...)
        │
        ├─ 4. scorepack()                     ← Algorithme déterministe (pas d'IA)
        │      pondération par mode de voyage
        │
        ├─ 5. Sauvegarde Supabase             ← Si utilisateur connecté
        │
        └─ 6. Réponse JSON { pack, score, flights_found, events_found }
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
| Accès données inter-utilisateurs | `.eq('user_id', req.user.id)` sur chaque requête SQL |

### Rate limiting en détail
```
Global (toutes routes) :   100 req / 15 min / IP
Routes IA /api/ai :          5 req / 1 min   / IP  (coût LLM)
Chat /api/ai/chat :         30 req / 15 min  / IP
Votes /api/votes :          10 req / 1 min   / IP
```

### RLS Supabase — compromis documenté
Le Row Level Security de Supabase ne s'applique qu'avec Supabase Auth. TripGenie utilise une auth custom (JWT signé par notre serveur). La sécurité est donc appliquée **au niveau applicatif** :
```js
// Chaque requête filtre par user_id côté serveur
supabase.from('trips').select('*').eq('user_id', req.user.id)
```
C'est un compromis assumé et documenté, pas un oubli.

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
trip_id     UUID REFERENCES trips(id) ON DELETE CASCADE
item_id     TEXT                   -- identifiant de l'élément voté
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
POST   /api/votes           { trip_id, item_id, vote_type, voter_name } → 201
GET    /api/votes/:trip_id  → votes[]
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

### Ce qui est testé
```
tests/golden_path.test.js   — Flux critiques bout en bout (Vitest + Supertest)
  ✓ POST /api/ai/generate   — génération pack complet
  ✓ Score entre 0 et 1      — scoring déterministe
  ✓ Vol intégré dans pack   — données enrichies
  ✓ 400 params manquants    — validation Zod
  ✓ POST /api/ai/chat       — modification conversationnelle
  ✓ GET /api/photos/:city   — proxy Unsplash
  ✓ POST /api/votes         — vote consensus
  ✓ GET /api/health         — healthcheck

tests/scoring.test.js       — Tests unitaires algorithme de scoring
```

### Principe des mocks
Tous les services externes sont mockés en test :
- **LLM** (Claude/Gemini) → réponse JSON fixe
- **Supabase** → chaîne de mock (from → insert → select → single)
- **Tavily / Unsplash / Météo** → données statiques
- **Rate limiters** → passthrough (sinon les tests s'auto-bloquent après 5 requêtes)

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

**"Ton RLS Supabase est activé ?"**
> Non, et c'est un compromis documenté. Le RLS ne fonctionne qu'avec Supabase Auth. Comme j'utilise une auth custom, la sécurité est gérée au niveau applicatif avec des filtres SQL systématiques. En production à grande échelle, je passerais à Supabase Auth + RLS pour une défense en profondeur.

**"Pourquoi Vitest et pas Jest ?"**
> Vitest est natif ESM, compatible avec la configuration Vite/ES modules du projet. Jest nécessiterait une configuration de transpilation supplémentaire pour les imports ES modules. Vitest est aussi significativement plus rapide.
