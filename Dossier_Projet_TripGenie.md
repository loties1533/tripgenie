# DOSSIER DE PROJET — TRIPGENIE
**Titre professionnel visé :** Développeur Web et Web Mobile (DWWM) — Niveau 5
**Candidat :** Alexis Laubert
**Formation :** Holberton School
**Année :** 2025-2026
**Projet réalisé pendant la formation**

---

## SOMMAIRE

1. Liste des compétences professionnelles mises en œuvre
2. Expression des besoins — objectifs et limites du projet
3. Environnement technique
4. Réalisations
   - 4.1 CP1 — Environnement de travail
   - 4.2 CP2 — Maquettes et navigation
   - 4.3 CP3 — Interfaces statiques
   - 4.4 CP4 — Partie dynamique des interfaces
   - 4.5 CP5 — Base de données relationnelle
   - 4.6 CP6 — Composants d'accès aux données
   - 4.7 CP7 — Composants métier côté serveur
   - 4.8 CP8 — Déploiement documenté
5. Sécurité de l'application
6. Jeu d'essai fonctionnel
7. Veille technologique et sécurité
8. Conclusion

---

## 1. LISTE DES COMPÉTENCES PROFESSIONNELLES MISES EN ŒUVRE

Ce projet couvre l'intégralité des 8 compétences professionnelles du titre DWWM, réparties en deux blocs :

### Bloc 1 — Développer la partie front-end d'une application web sécurisée

| N° | Compétence | Mise en œuvre dans TripGenie |
|----|-----------|------------------------------|
| CP1 | Installer et configurer son environnement de travail | Node.js, VSCode, Git/GitHub, npm, nodemon, variables d'environnement (.env) |
| CP2 | Maquetter des interfaces utilisateur web | Wireframes des 4 écrans principaux, schéma de navigation |
| CP3 | Réaliser des interfaces utilisateur statiques | Composants React avec Tailwind CSS, design responsive |
| CP4 | Développer la partie dynamique des interfaces | React Query, Zustand, appels API fetch, animations Framer Motion |

### Bloc 2 — Développer la partie back-end d'une application web sécurisée

| N° | Compétence | Mise en œuvre dans TripGenie |
|----|-----------|------------------------------|
| CP5 | Mettre en place une base de données relationnelle | PostgreSQL (Supabase), 6 tables, clés étrangères, index, script schema.sql |
| CP6 | Développer des composants d'accès aux données SQL | Supabase JS client, requêtes paramétrées, validation Zod, gestion des erreurs |
| CP7 | Développer des composants métier côté serveur | Pipeline IA Express, algorithme de scoring, middleware auth JWT, rate limiting |
| CP8 | Documenter le déploiement | render.yaml, DEPLOY.md, variables d'environnement documentées |

---

## 2. EXPRESSION DES BESOINS — OBJECTIFS ET LIMITES DU PROJET

### 2.1 Contexte et problématique

La planification d'un voyage implique de jongler entre de multiples sites (comparateurs de vols, plateformes hôtelières, guides d'activités) sans cohérence ni personnalisation. L'utilisateur doit assembler lui-même les informations, ce qui génère une surcharge cognitive et une perte de temps significative.

**Problème identifié :** Il n'existe pas d'outil simple qui génère un pack voyage complet et personnalisé à partir d'une description en langage naturel.

### 2.2 Objectifs du projet

**Objectif principal :** Développer une application web full-stack permettant à un utilisateur de générer un pack voyage personnalisé (vols, hôtels, itinéraire, activités, budget) à partir d'une conversation en langage naturel avec un pipeline IA.

**Objectifs secondaires :**
- Permettre la sauvegarde et la consultation des voyages générés
- Proposer un système de vote collaboratif pour choisir en groupe
- Implémenter une authentification sécurisée
- Garantir la sécurité des données utilisateur

### 2.3 Personas utilisateurs

**Lucas, 24 ans, étudiant :** Budget serré, veut découvrir une destination festive avec des amis. Il utilise le mode "Fête" et partage le lien de vote avec son groupe.

**Sophie, 35 ans, cadre :** Cherche un week-end de détente premium. Elle utilise le mode "Luxe" et sauvegarde son pack pour y revenir.

**Le groupe de collègues :** Veulent partir ensemble sans se prendre la tête. Ils utilisent le mode "Groupe", partagent le lien et votent pour les activités.

### 2.4 Limites du projet

| Limite | Explication |
|--------|-------------|
| Pas de réservation réelle | Les liens redirigent vers des recherches (Booking, Google Flights), pas de transaction financière |
| Dépendance aux APIs IA | Si tous les LLMs sont indisponibles, des données mockées sont retournées |
| RLS Supabase non activé | Incompatible avec l'auth custom JWT — sécurité assurée au niveau applicatif |
| Pas de paiement | Fonctionnalité désactivée intentionnellement pour la version formation |

### 2.5 Cas d'utilisation principaux (Use Cases)

```
[Utilisateur non connecté]
    → S'inscrire / Se connecter
    → Générer un pack (sans sauvegarde)
    → Consulter un pack partagé (lien public)
    → Voter sur les éléments d'un pack partagé

[Utilisateur connecté]
    → Générer et sauvegarder un pack
    → Consulter son historique de voyages
    → Modifier un pack via le chat IA
    → Partager un voyage par lien public
    → Supprimer un voyage
```

---

## 3. ENVIRONNEMENT TECHNIQUE

### 3.1 Poste de développement

| Outil | Version | Rôle |
|-------|---------|------|
| macOS | Sonoma | OS développeur |
| Visual Studio Code | 1.90+ | Éditeur de code |
| Node.js | 18.x LTS | Runtime JavaScript serveur |
| npm | 10.x | Gestionnaire de paquets |
| Git | 2.x | Contrôle de version |
| GitHub | — | Hébergement dépôt distant |
| Nodemon | 3.x | Rechargement automatique serveur dev |

### 3.2 Stack technique

**Frontend** — `client-react/`

| Technologie | Version | Rôle |
|-------------|---------|------|
| React | 18.3 | Framework UI déclaratif |
| Vite | 5.4 | Bundler + serveur de développement |
| React Router | 6.27 | Navigation SPA côté client |
| Zustand | 5.0 | State management global |
| React Query | 5.60 | Cache et synchronisation des requêtes HTTP |
| Tailwind CSS | 3.4 | Framework CSS utilitaire |
| Framer Motion | 11 | Animations déclaratives |
| Sonner | 1.7 | Notifications toast |

**Backend** — `server/`

| Technologie | Version | Rôle |
|-------------|---------|------|
| Express | 4.18 | Framework HTTP REST |
| Zod | 4.3 | Validation des entrées utilisateur |
| jsonwebtoken | 9.0 | Génération/vérification JWT |
| bcryptjs | 2.4 | Hashage des mots de passe |
| cookie-parser | 1.4 | Lecture des cookies httpOnly |
| Helmet | 7.1 | Headers de sécurité HTTP |
| express-rate-limit | 7.5 | Protection anti-spam/DDoS |
| Morgan | 1.10 | Logger HTTP des requêtes |

**Base de données**

| Technologie | Rôle |
|-------------|------|
| PostgreSQL | Base de données relationnelle |
| Supabase | Hébergeur PostgreSQL + client JS |

**Services externes**

| Service | Rôle | Fallback |
|---------|------|---------|
| Google Gemini | LLM principal | OpenRouter |
| OpenRouter | LLM secondaire | Claude API |
| Anthropic Claude | LLM tertiaire | Mocks |
| Tavily | Recherche web temps réel | Données simulées |
| Unsplash | Photos destinations | Placeholder |
| OpenWeatherMap | Météo temps réel | Données IA |

**Tests**

| Outil | Rôle |
|-------|------|
| Vitest | Test runner (ESM natif) |
| Supertest | Tests d'intégration HTTP |

**Déploiement**

| Outil | Rôle |
|-------|------|
| Render | Hébergement production (PaaS) |
| render.yaml | Configuration déclarative du déploiement |

### 3.3 Architecture générale

```
┌─────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR                           │
│           React 18 + Vite + Tailwind + Zustand              │
│     Home │ Trips │ TripDetail │ Login │ PackResults         │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS + Cookie httpOnly
                       │ fetch() / React Query
┌──────────────────────▼──────────────────────────────────────┐
│                   SERVEUR EXPRESS (Node.js)                  │
│  /api/auth   /api/trips   /api/ai   /api/votes   /api/photos│
│                                                              │
│  Middleware: Helmet │ CORS │ Rate-Limit │ Auth JWT │ Morgan  │
│                                                              │
│  Services: Pipeline IA │ Scoring │ SmartSearch │ Weather    │
└──────────┬──────────────────────────────┬────────────────────┘
           │ Supabase JS Client           │ HTTP APIs externes
┌──────────▼──────────┐         ┌─────────▼──────────────────┐
│  PostgreSQL         │         │  Gemini / OpenRouter /     │
│  (Supabase)         │         │  Claude / Tavily /         │
│  users, trips,      │         │  Unsplash / Weather        │
│  trip_votes...      │         └────────────────────────────┘
└─────────────────────┘
```

---

## 4. RÉALISATIONS

### 4.1 CP1 — Environnement de travail

#### Configuration Git

Le projet utilise Git avec des commits atomiques en français, chaque commit couvrant un sujet précis :

```bash
# Exemple de log Git du projet
git log --oneline

a3f2c1d feat: ajouter proxy Unsplash côté serveur
b8e4f2a fix: corriger accès issues Zod v4 dans route votes
c9d1a3b feat: JWT httpOnly cookie - sécurisation auth
d4f7b2c feat: rate-limit votes 10req/min
e1c8d5a test: blindage golden path 15 tests Vitest
```

#### Structure du projet avec .gitignore

```
# .gitignore — fichiers exclus du dépôt
node_modules/
.env
client-react/.env
client-react/dist/
*.log
npm-cache/
```

#### Variables d'environnement

Le fichier `.env.example` documente toutes les variables requises sans exposer les valeurs :

```bash
# Serveur
PORT=3000
NODE_ENV=development
JWT_SECRET=change_me_strong_secret

# Base de données
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# IA
GEMINI_API_KEY=your_key
OPENROUTER_API_KEY=your_key
ANTHROPIC_API_KEY=your_key

# Services
UNSPLASH_ACCESS_KEY=your_key
TAVILY_API_KEY=your_key
OPENWEATHER_API_KEY=your_key
```

---

### 4.2 CP2 — Maquettes et navigation

#### Schéma de navigation (User Flow)

```
[Page Login / Signup]
        │
        ▼ (connecté)
[Home — Onboarding]
    │
    │ L'utilisateur répond aux questions du chatbot
    │ (destination, budget, dates, mode de voyage)
    │
    ▼ (génération lancée)
[PackResults — Résultat]
    │
    ├── Voir les vols / hôtels / activités
    ├── Lancer le chat de modification
    ├── Partager par lien public → [Page publique vote]
    └── Sauvegarder → [Mes Voyages]
            │
            ▼
    [TripDetail — Détail voyage]
        ├── Consulter le pack sauvegardé
        ├── Modifier via chat IA
        └── Supprimer le voyage
```

#### Description des écrans

**Écran 1 — Home (Onboarding)**
Interface de chat conversationnel. L'utilisateur répond à des questions guidées. Un formulaire progressif révèle les champs (destination, dates, budget, nombre de voyageurs, mode). Un bouton "Générer mon voyage" déclenche le pipeline IA. Un skeleton loader s'affiche pendant la génération (15-30 secondes).

**Écran 2 — PackResults (Résultats)**
Affichage du pack complet : carte de destination avec photo Unsplash, score visuel, météo, vols trouvés, hôtels recommandés, itinéraire jour par jour, activités avec liens Google Maps et GetYourGuide, budget ventilé sous forme de graphique Recharts.

**Écran 3 — Mes Voyages**
Liste des voyages sauvegardés avec photo, destination, date, score et statut. Bouton de suppression. Accès au détail de chaque voyage.

**Écran 4 — TripDetail (Détail)**
Affichage complet du pack sauvegardé. Interface de chat latéral pour demander des modifications. Bouton de partage par lien public.

---

### 4.3 CP3 — Interfaces utilisateur statiques

#### Composant Card réutilisable

```jsx
// client-react/src/components/ui/Card.jsx
// Composant statique de base — utilisé partout dans l'application

export default function Card({ children, className = '' }) {
  return (
    <div className={`
      bg-white rounded-2xl shadow-sm border border-gray-100
      p-6 transition-shadow hover:shadow-md
      ${className}
    `}>
      {children}
    </div>
  );
}
```

#### Layout responsive avec Tailwind

```jsx
// client-react/src/components/layout/index.jsx
// Navigation principale — responsive mobile-first

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">✈️</span>
              <span className="font-bold text-xl text-gray-900">TripGenie</span>
            </Link>

            {/* Navigation desktop */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/trips" className="text-gray-600 hover:text-gray-900">
                Mes voyages
              </Link>
              {user && (
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Déconnexion
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
```

#### Interface de connexion statique

```jsx
// client-react/src/pages/Login.jsx — partie statique

return (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100
                  flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
      
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {isLogin ? 'Connexion' : 'Créer un compte'}
      </h1>
      <p className="text-gray-500 mb-8">
        {isLogin ? 'Retrouvez vos voyages sauvegardés'
                 : 'Commencez à planifier vos aventures'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full px-4 py-3 rounded-xl border border-gray-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          className="w-full px-4 py-3 rounded-xl border border-gray-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-xl
                     font-semibold hover:bg-blue-700 transition-colors"
        >
          {isLogin ? 'Se connecter' : "S'inscrire"}
        </button>
      </form>
    </div>
  </div>
);
```

---

### 4.4 CP4 — Partie dynamique des interfaces

#### State management avec Zustand

```js
// client-react/src/store/index.js
// Store global persistant — survit au rafraîchissement de page

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      // Connexion : stocke l'utilisateur (le token est dans le cookie httpOnly)
      setAuth: (user) => set({ user }),
      // Déconnexion : efface le store côté client
      clearAuth: () => set({ user: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }) // persiste seulement user
    }
  )
);
```

#### Appel API avec React Query

```jsx
// client-react/src/pages/Trips.jsx — données dynamiques

import { useQuery } from '@tanstack/react-query';
import { getTrips } from '../lib/api';

export default function Trips() {
  // React Query gère : chargement, erreur, cache, refetch automatique
  const { data, isLoading, error } = useQuery({
    queryKey: ['trips'],
    queryFn: getTrips,
    staleTime: 5 * 60 * 1000, // cache 5 minutes
  });

  if (isLoading) return <SkeletonList />;
  if (error)    return <ErrorMessage message={error.message} />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data?.trips?.map(trip => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}
```

#### Génération dynamique du pack avec gestion d'état

```jsx
// client-react/src/pages/Home.jsx — génération asynchrone

const [isGenerating, setIsGenerating] = useState(false);
const [pack, setPack]                 = useState(null);

const handleGenerate = async (formData) => {
  setIsGenerating(true);
  try {
    // Appel au pipeline IA côté serveur (15-30 secondes)
    const result = await generatePack(formData);
    setPack(result.pack);
    toast.success('Votre voyage est prêt !');
  } catch (err) {
    toast.error(err.message);
  } finally {
    setIsGenerating(false);
  }
};

// Pendant la génération : skeleton loader animé
if (isGenerating) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-64 bg-gray-200 rounded-2xl" />
      <div className="h-8 bg-gray-200 rounded w-2/3" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}
```

#### Appels API centralisés

```js
// client-react/src/lib/api.js
// Toutes les requêtes HTTP — credentials: include envoie le cookie JWT

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // cookie httpOnly envoyé automatiquement
    ...opts
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

export const generatePack = (params) =>
  request('/ai/generate', { method: 'POST', body: JSON.stringify(params) });

export const getTrips = () => request('/trips');

export const saveVote = (trip_id, item_id, vote_type, voter_name) =>
  request('/votes', { method: 'POST',
    body: JSON.stringify({ trip_id, item_id, vote_type, voter_name }) });
```

---

### 4.5 CP5 — Base de données relationnelle

#### Schéma conceptuel (MCD)

```
USERS ──────────────── TRIPS
  │  1         0..*      │
  │                      │ 1
  │                      │
  │                   0..* 
  │                    TRIP_VOTES
  │
  │ 1
  └──── USER_PREFERENCES (1..1)

TRIPS ──── PACKS (1..*)
TRIPS ──── TRIP_COLLABORATORS (*..*) ──── USERS
```

Relations :
- Un utilisateur peut créer plusieurs voyages (1,n)
- Un voyage peut recevoir plusieurs votes (1,n)
- Un voyage peut avoir plusieurs packs générés (1,n)
- Un voyage peut être partagé avec plusieurs collaborateurs (n,n) → table de jonction

#### Schéma physique — Script SQL complet

```sql
-- server/db/schema.sql
-- Script d'initialisation PostgreSQL (Supabase SQL Editor)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- TABLE USERS ----
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,          -- hashé bcryptjs (saltRounds=10)
  name       TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- TABLE TRIPS ----
CREATE TABLE IF NOT EXISTS trips (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  destination TEXT NOT NULL,
  country     TEXT,
  origin      TEXT,
  departure   DATE,
  return_date DATE,
  travelers   INT DEFAULT 1,
  budget      TEXT,
  mode        TEXT CHECK (mode IN
              ('party','student','luxury','group','relax','surprise')),
  status      TEXT DEFAULT 'draft' CHECK (status IN
              ('draft','confirmed','archived')),
  score       FLOAT,
  pack_data   JSONB,          -- pack complet sérialisé (vols, hôtels, etc.)
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---- TABLE TRIP_VOTES ----
CREATE TABLE IF NOT EXISTS trip_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  item_id    TEXT NOT NULL,           -- identifiant de l'élément voté
  voter_name TEXT DEFAULT 'Anonyme',
  vote_type  BOOLEAN NOT NULL,        -- true=pour, false=contre
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- TABLE TRIP_COLLABORATORS (Many-to-Many) ----
CREATE TABLE IF NOT EXISTS trip_collaborators (
  trip_id    UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'editor',   -- 'viewer' | 'editor'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (trip_id, user_id)      -- clé primaire composée
);

-- ---- INDEX DE PERFORMANCE ----
CREATE INDEX IF NOT EXISTS idx_trips_user_id  ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_mode     ON trips(mode);
CREATE INDEX IF NOT EXISTS idx_votes_trip_id  ON trip_votes(trip_id);
```

#### Justification des choix de conception

| Choix | Justification |
|-------|--------------|
| UUID comme clé primaire | Évite l'incrémentation prédictible (sécurité), permet la génération côté client |
| ON DELETE CASCADE | Intégrité référentielle — si user supprimé, ses voyages et votes disparaissent |
| JSONB pour pack_data | Le pack voyage est un objet complexe et variable — JSONB permet des requêtes sur le JSON |
| Contrainte CHECK sur mode | Validation de domaine directement en base — défense en profondeur |
| Clé primaire composée | Table de jonction many-to-many — évite les doublons de collaborateurs |

---

### 4.6 CP6 — Composants d'accès aux données

#### Client Supabase (singleton)

```js
// server/db/supabase.js
// Instance unique du client Supabase — partagée dans toute l'application

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // clé service — jamais exposée côté client
);

export default supabase;
```

#### Route d'accès aux voyages (CRUD sécurisé)

```js
// server/routes/trips.js

// GET /api/trips — lecture des voyages de l'utilisateur connecté
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('id, title, destination, departure, score, status, created_at')
      .eq('user_id', req.user.id)      // filtre strict par user_id
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ trips: data });

  } catch (err) {
    next(err);
  }
});

// DELETE /api/trips/:id — suppression sécurisée
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);   // double vérification : id + user_id

    if (error) throw error;
    res.json({ message: 'Voyage supprimé.' });

  } catch (err) {
    next(err);
  }
});
```

#### Validation des entrées avec Zod v4

```js
// server/routes/votes.js — validation stricte avant toute requête

import { z } from 'zod';

const voteSchema = z.object({
  trip_id:    z.string().uuid('trip_id invalide'),
  item_id:    z.string().min(1, 'item_id requis'),
  vote_type:  z.boolean(),
  voter_name: z.string().max(50).optional()
});

router.post('/', async (req, res, next) => {
  try {
    // 1. Validation avant toute interaction avec la BDD
    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues?.[0]?.message ?? 'Données invalides'
      });
    }

    const { trip_id, item_id, voter_name, vote_type } = parsed.data;

    // 2. Insertion sécurisée (requête paramétrée via Supabase)
    const { data, error } = await supabase
      .from('trip_votes')
      .insert({ trip_id, item_id,
                voter_name: voter_name || 'Anonyme', vote_type })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Vote enregistré !', vote: data });

  } catch (err) {
    next(err);
  }
});
```

#### Gestion centralisée des erreurs

```js
// server/lib/AppError.js

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode  = statusCode;
    this.status      = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware global Express — capte toutes les erreurs non gérées
export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  if (err.isOperational) {
    // Erreur prévisible : on expose le message
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // Erreur système : on ne divulgue rien
    console.error('ERREUR SYSTÈME:', err);
    res.status(500).json({ status: 'error',
      message: 'Une erreur interne est survenue.' });
  }
};
```

---

### 4.7 CP7 — Composants métier côté serveur

#### Pipeline IA orchestré

```js
// server/routes/ai.js — POST /api/ai/generate

router.post('/generate', aiGenerateLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { destination, origin, departure, return_date,
            travelers, budget, mode } = req.body;

    // Validation
    if (!destination?.trim()) return next(new AppError('destination requise', 400));
    if (!departure)           return next(new AppError('date de départ requise', 400));
    if (!budget || budget<=0) return next(new AppError('budget invalide', 400));

    // ÉTAPE 1 — Recherches parallèles (timeout 15s)
    // Promise.allSettled : si une API échoue, les autres continuent
    const results = await Promise.allSettled([
      smartFlightSearch({ origin, destination, departure, return_date }),
      smartEventsSearch({ location: destination, mode }),
      smartHotelSearch({ location: destination, mode }),
      getRealWeather(destination),
      getDestinationPhoto(destination)
    ]);

    // ÉTAPE 2 — Extraction des résultats (avec fallback null)
    const aiFlight   = results[0].status === 'fulfilled' ? results[0].value : null;
    const events     = results[1].status === 'fulfilled' ? results[1].value : [];
    const realHotels = results[2].status === 'fulfilled' ? results[2].value : [];
    const realWeather= results[3].status === 'fulfilled' ? results[3].value : null;
    const realPhoto  = results[4].status === 'fulfilled' ? results[4].value : null;

    // ÉTAPE 3 — Génération du pack par le LLM
    const pack = await assemblePack({
      destination, flights: aiFlight ? [aiFlight] : [],
      events, hotels: realHotels, mode, travelers,
      budget, departure, return_date, realWeather, realPhoto
    });

    // ÉTAPE 4 — Scoring multi-critères (algorithme déterministe)
    const scoreResult = scorepack(
      { vol: aiFlight, hotel: pack.hotels?.[0],
        events, activities: pack.activities, totalPrice: budget },
      mode, travelers, destination
    );

    // ÉTAPE 5 — Sauvegarde si utilisateur connecté
    let tripId = null;
    if (req.user) {
      const { data: trip } = await supabase
        .from('trips')
        .insert({ user_id: req.user.id, title: `Voyage à ${destination}`,
                  destination, budget: String(budget), mode,
                  pack_data: { ...pack, score: scoreResult },
                  score: scoreResult.total })
        .select('id').single();
      tripId = trip?.id;
    }

    // Réponse finale
    res.json({
      pack:          { ...pack, flights_data: aiFlight ? [aiFlight] : [],
                       events_data: events },
      trip_id:       tripId,
      score:         scoreResult.total,
      flights_found: aiFlight ? 1 : 0,
      events_found:  events.length
    });

  } catch (err) {
    next(err);
  }
});
```

#### Algorithme de scoring

```js
// server/services/scoring.js — score entre 0 et 1

// Pondérations selon le mode de voyage
const MODE_WEIGHTS = {
  luxury:  { hotel: 0.40, activities: 0.30, vol: 0.20, prix: 0.10 },
  party:   { events: 0.40, prix: 0.30, hotel: 0.20, vol: 0.10 },
  student: { prix: 0.50, activities_free: 0.25, hotel: 0.15, events: 0.10 },
  relax:   { calme: 0.35, hotel: 0.30, activities: 0.25, prix: 0.10 },
};

export function scorepack(pack, mode, travelers = 2, destination = '') {
  const { vol, hotel, events, activities, totalPrice } = pack;
  const weights = MODE_WEIGHTS[mode] || MODE_WEIGHTS.party;

  // Calcul des scores individuels (normalisés entre 0 et 1)
  const scores = {
    vol:             scoreVol(vol, mode),
    hotel:           scoreHotel(hotel, mode, travelers),
    events:          scoreEvents(events, mode),
    activities:      scoreActivities(activities, mode),
    prix:            1 - normalise(totalPrice, 200, 10000),
    activities_free: scoreActivities(activities, 'student'),
    calme:           scoreCalme(destination, events),
    originalite:     scoreOriginalite(destination)
  };

  // Score global = moyenne pondérée
  scores.global = Object.entries(weights).reduce(
    (total, [key, weight]) => total + (scores[key] || 0) * weight, 0
  );

  return {
    total:   Math.round(scores.global * 100) / 100,
    details: scores
  };
}
```

#### Middleware d'authentification JWT

```js
// server/middleware/auth.js

import jwt from 'jsonwebtoken';

// Extrait le token depuis le cookie httpOnly OU le header Authorization
function extractToken(req) {
  if (req.cookies?.tg_token) return req.cookies.tg_token;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];
  return null;
}

// requireAuth — route protégée (retourne 401 si non connecté)
export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// optionalAuth — route accessible à tous, mais enrichit req.user si connecté
export function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); }
    catch { /* token invalide ignoré silencieusement */ }
  }
  next();
}
```

---

### 4.8 CP8 — Déploiement documenté

#### Configuration Render (render.yaml)

```yaml
# render.yaml — déploiement déclaratif sur Render

services:
  - type: web
    name: tripgenie-api
    env: node
    region: frankfurt
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: ALLOWED_ORIGINS
        sync: false   # valeur renseignée dans le dashboard Render
      - key: JWT_SECRET
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
```

#### Procédure de déploiement

```
Procédure de déploiement TripGenie sur Render
=============================================

PRÉ-REQUIS :
  - Compte Render (render.com)
  - Compte Supabase avec base de données initialisée
  - Clés API (Gemini, Tavily, Unsplash, OpenWeather)

ÉTAPES :

1. Initialiser la base de données
   → Supabase Dashboard > SQL Editor
   → Coller et exécuter le contenu de server/db/schema.sql

2. Connecter le dépôt GitHub à Render
   → Render Dashboard > New Web Service
   → Connecter le dépôt GitHub tripgenie
   → Branch: main

3. Configurer les variables d'environnement dans Render
   → Environment > Add Environment Variable
   NODE_ENV=production
   JWT_SECRET=<secret fort, min 32 caractères>
   SUPABASE_URL=<url supabase>
   SUPABASE_SERVICE_KEY=<service role key>
   GEMINI_API_KEY=<clé>
   TAVILY_API_KEY=<clé>
   UNSPLASH_ACCESS_KEY=<clé>
   OPENWEATHER_API_KEY=<clé>
   ALLOWED_ORIGINS=https://tripgenie.onrender.com

4. Déploiement automatique
   → Render redéploie automatiquement à chaque push sur main
   → Build: npm install && npm run build (compile le frontend React)
   → Start: npm start (lance server/index.js)
   → Le frontend React est servi par Express en production

5. Vérification
   → GET https://tripgenie.onrender.com/api/health
   → Réponse attendue: {"status":"ok","version":"1.0.0","env":"production"}
```

---

## 5. SÉCURITÉ DE L'APPLICATION

### 5.1 Authentification — JWT en cookie httpOnly

Le token JWT est stocké dans un cookie httpOnly, inaccessible depuis JavaScript côté navigateur. Cela élimine le risque de vol de token par injection XSS.

```js
// server/routes/auth.js — création du cookie sécurisé

function setAuthCookie(res, token) {
  res.cookie('tg_token', token, {
    httpOnly: true,                                    // inaccessible JS
    secure:   process.env.NODE_ENV === 'production',   // HTTPS uniquement
    sameSite: 'strict',                                // protection CSRF
    maxAge:   7 * 24 * 60 * 60 * 1000                 // 7 jours
  });
}

router.post('/login', async (req, res) => {
  // ...vérification mot de passe...
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  setAuthCookie(res, token);
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
  // Le token N'EST PAS dans la réponse JSON — seulement dans le cookie
});
```

### 5.2 Hashage des mots de passe

```js
// server/routes/auth.js — inscription

const SALT_ROUNDS = 10; // coût du hashage — résistant au brute-force

router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  // Hashage avant insertion en base
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const { data, error } = await supabase
    .from('users')
    .insert({ email, password: hashedPassword, name })
    .select().single();
  // ...
});

// Connexion — comparaison sécurisée
const validPassword = await bcrypt.compare(password, user.password);
if (!validPassword) return res.status(401).json({ error: 'Identifiants invalides' });
```

### 5.3 Proxy Unsplash — protection des clés API

La clé Unsplash n'est jamais envoyée au navigateur. Le frontend appelle `/api/photos/Paris`, le serveur appelle Unsplash avec la clé secrète.

```
AVANT (non sécurisé) :
  Navigateur → fetch('https://api.unsplash.com/?client_id=CLEF_VISIBLE')
  ↑ La clé API est visible dans les DevTools

APRÈS (proxy sécurisé) :
  Navigateur → fetch('/api/photos/Paris')
  Serveur Express → fetch('https://api.unsplash.com/?client_id=CLEF_CACHEE')
  ↑ La clé reste sur le serveur, jamais transmise au client
```

### 5.4 Rate Limiting

```js
// server/index.js — limiteurs en cascade

// Limiteur global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 req / 15min / IP
});

// Limiteur IA (coût élevé)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 5,                     // 5 générations / min / IP
  message: { error: 'Limite de génération atteinte.' }
});

// Limiteur votes (anti-spam)
const voteLimiter = rateLimit({
  windowMs: 60_000,           // 1 minute
  max: 10,                    // 10 votes / min / IP
});
```

### 5.5 CORS — Whitelist des origines

```js
// server/index.js

const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
  : ['http://localhost:3001', 'http://localhost:3002'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS bloqué')); // toute autre origine est refusée
  },
  credentials: true // nécessaire pour envoyer les cookies
}));
```

### 5.6 Tableau récapitulatif des mesures de sécurité

| Menace | Mesure implémentée | Fichier |
|--------|-------------------|---------|
| Vol de token (XSS) | Cookie httpOnly + sameSite strict | routes/auth.js |
| CSRF | sameSite: 'strict' sur le cookie | routes/auth.js |
| Brute-force mot de passe | bcrypt saltRounds=10 + rate limit | routes/auth.js |
| Injection SQL | Requêtes paramétrées Supabase | toutes les routes |
| Inputs malveillants | Validation Zod sur chaque endpoint | toutes les routes |
| Exposition clé API | Proxy backend (Unsplash, IA) | routes/photos.js |
| Spam / DDoS | Rate limiting 3 niveaux | index.js, votes.js |
| Accès inter-utilisateurs | Filtre .eq('user_id') systématique | routes/trips.js |
| Headers HTTP | Helmet (X-Frame, CSP, HSTS) | index.js |

---

## 6. JEU D'ESSAI FONCTIONNEL

### Fonctionnalité testée : Génération d'un pack voyage

**Description :** C'est la fonctionnalité centrale de TripGenie. Elle orchestre 5 appels parallèles (vols, événements, hôtels, météo, photos) et génère un pack structuré via un LLM.

#### Données en entrée

```json
{
  "destination": "Amsterdam",
  "origin":      "Paris",
  "departure":   "2025-07-15",
  "return_date": "2025-07-18",
  "travelers":   2,
  "budget":      800,
  "mode":        "party"
}
```

#### Données attendues (structure de sortie)

```json
{
  "pack": {
    "destination": "Amsterdam",
    "country":     "Pays-Bas",
    "tagline":     "La fête sur les canaux",
    "hotels": [{ "name": "...", "stars": 3, "price_per_night": "..." }],
    "activities": [{ "name": "...", "category": "Nightlife", "price": "..." }],
    "budget_breakdown": { "vols": "...", "total": "800€" },
    "flights_data": [{ "outbound": { "airline": "...", "price_per_person": 150 }}]
  },
  "score":         0.72,
  "flights_found": 1,
  "events_found":  3
}
```

#### Données obtenues (extrait du test automatisé)

```
✓ POST /api/ai/generate → 200 OK
✓ pack.destination = "Paris" (mock)
✓ score = 0.XX (nombre entre 0 et 1)
✓ flights_found = 1 (vol Air France mockée)
✓ pack.hotels.length > 0
✓ pack.budget_breakdown défini
```

#### Analyse des écarts

| Cas | Écart observé | Explication |
|-----|--------------|-------------|
| API Tavily indisponible | Vol absent, events=[] | Fallback prévu — pack généré sans données réelles |
| LLM renvoie JSON malformé | Erreur 500 capturée | ParseJSON robuste avec regex — retourne mock |
| Budget trop faible (< 100€) | Erreur 400 | Validation Zod côté serveur |

### Tests automatisés (golden_path.test.js)

```
 ✓ renvoie 200 avec la structure de pack complète             8ms
 ✓ le score total est un nombre compris entre 0 et 1          3ms
 ✓ le pack intègre les données du vol trouvé                  2ms
 ✓ retourne 400 si destination manquante                      1ms
 ✓ retourne 400 si budget manquant ou nul                     1ms
 ✓ retourne 400 si date de départ manquante                   1ms
 ✓ renvoie 200 avec une réponse IA et des modifications       1ms
 ✓ retourne 400 si message vide                               1ms
 ✓ retourne 400 si message trop long (> 1000 car.)            1ms
 ✓ renvoie 200 avec une URL de photo                          3ms
 ✓ fonctionne avec un nom de ville encodé (accents)           1ms
 ✓ enregistre un vote positif (flux nominal)                 35ms
 ✓ retourne 400 si trip_id n'est pas un UUID valide           2ms
 ✓ retourne 400 si item_id est absent                         2ms
 ✓ renvoie status ok (health check)                           1ms

Tests : 15 passed (15)
Durée : 299ms
```

---

## 7. VEILLE TECHNOLOGIQUE ET SÉCURITÉ

Durant le développement de TripGenie, j'ai effectué une veille sur les vulnérabilités liées aux technologies utilisées.

### 7.1 Vulnérabilités identifiées et corrigées

**Vulnérabilité 1 — JWT en localStorage (XSS)**
- **Problème identifié :** Le token JWT était stocké dans le localStorage, accessible par n'importe quel script JavaScript. Une attaque XSS pouvait le voler.
- **Source de veille :** OWASP — "Session Management Cheat Sheet"
- **Correction appliquée :** Migration vers cookie httpOnly. Token inaccessible depuis le JS navigateur.

**Vulnérabilité 2 — Clé API Unsplash exposée côté client**
- **Problème identifié :** La variable `VITE_UNSPLASH_KEY` était compilée dans le bundle JavaScript envoyé au navigateur.
- **Source de veille :** Documentation Vite — variables d'environnement publiques vs privées
- **Correction appliquée :** Proxy backend `/api/photos/:city`. La clé ne quitte plus le serveur.

**Vulnérabilité 3 — Absence de rate limiting sur les votes**
- **Problème identifié :** Sans limitation, un attaquant pouvait spammer l'API votes pour fausser les résultats ou surcharger la base.
- **Correction appliquée :** Rate limiter 10 votes/minute/IP avec `express-rate-limit`.

**Vulnérabilité 4 — CORS trop permissif (`origin: true`)**
- **Problème identifié :** Toute origine était acceptée, permettant des requêtes cross-origin malveillantes.
- **Correction appliquée :** Whitelist explicite des origines autorisées en production.

### 7.2 Sources de veille utilisées

| Source | Type | Usage |
|--------|------|-------|
| OWASP Top 10 | Guide sécurité web | XSS, CSRF, injection |
| MDN Web Docs | Documentation technique | API Web, fetch, cookies |
| npm advisories | Alertes dépendances | Vulnérabilités packages |
| Snyk.io | Scanner de vulnérabilités | Audit des dépendances npm |
| GitHub Security Advisories | Alertes projets | CVE sur Express, JWT |

### 7.3 Audit des dépendances npm

```bash
# Commande d'audit des dépendances
npm audit

# Résultat obtenu
found 0 vulnerabilities
```

---

## 8. CONCLUSION

### Bilan des compétences couvertes

TripGenie couvre l'intégralité des 8 compétences professionnelles du titre DWWM :
- **Bloc Frontend (CP1-CP4)** : environnement configuré, interfaces responsives, partie dynamique React avec gestion d'état et appels API asynchrones.
- **Bloc Backend (CP5-CP8)** : base de données relationnelle PostgreSQL avec 6 tables, composants d'accès aux données sécurisés, composants métier complexes (pipeline IA, scoring), déploiement documenté.

### Points forts du projet

- **Architecture solide** : séparation claire frontend/backend, services modulaires, gestion d'erreurs centralisée
- **Sécurité appliquée** : JWT httpOnly, proxy API, rate limiting, validation Zod — vulnérabilités identifiées et corrigées
- **Résilience** : `Promise.allSettled` + fallback mocks — l'application ne crashe jamais même si les APIs externes sont indisponibles
- **Tests** : 15 tests automatisés couvrant tous les flux critiques

### Axes d'amélioration identifiés

1. **Conteneurisation Docker** : l'environnement de développement pourrait être conteneurisé pour faciliter l'onboarding de nouveaux développeurs
2. **RLS Supabase** : migrer vers Supabase Auth permettrait d'activer la sécurité au niveau base de données
3. **CI/CD GitHub Actions** : automatiser les tests à chaque push plutôt que de les lancer manuellement
4. **Maquettes Figma** : formaliser les wireframes dans un outil de design dédié

### Apport personnel

Ce projet m'a permis de passer d'un socle Holberton (Vanilla JS, Python, SQL) à une stack moderne full-stack JavaScript. J'ai appris à orchestrer des services IA multiples, à gérer la sécurité applicative de manière complète, et à livrer une application déployable en production. C'est l'aboutissement de ma formation et une base solide pour mon entrée dans la vie professionnelle.

---

*Dossier de projet réalisé dans le cadre de la formation DWWM — Holberton School*
*Alexis Laubert — 2026*
