# 📋 CAHIER DES CHARGES — TRIPGENIE
**Projet :** TripGenie — Assistant de Voyage Agentique
**Candidat :** Alexis Laubert
**Formation :** Holberton School — Titre RNCP 5 (Développeur Web et Web Mobile)
**Version :** 1.0 — Rédigé en avril 2026

---

## 1. CONTEXTE ET GENÈSE DU PROJET

### 1.1. Problème identifié
La planification d'un voyage en groupe est une tâche chronophage et frustrante. Les outils existants (Booking, Skyscanner, Google Flights) sont des **comparateurs passifs** : ils attendent que l'utilisateur sache exactement ce qu'il cherche, qu'il fasse lui-même la synthèse entre les vols, les hôtels et les activités, et qu'il coordonne avec ses amis pour obtenir un consensus.

**Résultat :** des heures perdues à comparer des onglets, des désaccords dans le groupe, et une planification souvent bâclée.

### 1.2. Vision du projet
TripGenie est une **agence de voyage de poche alimentée par l'IA**. L'utilisateur n'a pas besoin de savoir ce qu'il veut précisément. Il **discute** avec un agent intelligent, qui extrait ses préférences implicites, orchestre de manière autonome plusieurs sources de données (vols réels, événements, hôtels), et produit un **Pack de Voyage clé en main**.

---

## 2. OBJECTIFS ET PÉRIMÈTRE

### 2.1. Objectifs principaux
1. Permettre à un utilisateur de planifier un voyage complet via une conversation en langage naturel.
2. Assembler automatiquement un pack voyage cohérent (Vol + Hôtel + Activités) depuis des APIs réelles.
3. Permettre à un groupe d'amis de voter pour valider ou rejeter les éléments du pack.
4. Garantir une continuité de service même en cas de panne des APIs d'IA (Tolérance aux pannes).

### 2.2. Périmètre fonctionnel (MVP)
✅ **Inclus :**
- Chatbot d'onboarding conversationnel
- Génération d'un pack de voyage (vols, hôtels, activités)
- Système de votes collectif (👍/👎)
- Authentification utilisateur (inscription/connexion)
- Sauvegarde des voyages en base de données
- Score de qualité du pack

❌ **Hors périmètre (V1) :**
- Réservation réelle (redirection vers partenaires uniquement)
- Application mobile native
- Système de paiement
- Chat en temps réel entre membres du groupe

---

## 3. DESCRIPTION DES FONCTIONNALITÉS

### F01 — Onboarding Conversationnel
**En tant qu'** utilisateur,
**Je veux** discuter naturellement avec un assistant IA,
**Pour que** celui-ci comprenne mon projet de voyage sans que je remplisse un formulaire.

**Critères d'acceptance :**
- Le chatbot pose des questions adaptées au contexte
- Il extrait automatiquement : destination, budget, dates, nombre de voyageurs, ambiance souhaitée
- Si l'utilisateur est vague, le bot reformule et précise
- La conversation ne dépasse pas 5 échanges avant de lancer la génération

### F02 — Génération du Pack Voyage
**En tant qu'** utilisateur ayant complété l'onboarding,
**Je veux** recevoir un pack voyage complet en moins de 30 secondes,
**Pour que** je n'aie pas à chercher les infos moi-même.

**Critères d'acceptance :**
- Le pack contient : au moins 1 vol, 1 hôtel, 3 activités
- Les vols proviennent de SmartSearch (via Tavily, données réelles)
- Les événements proviennent de l'API PredictHQ (données réelles)
- Si une API est indisponible, le pack est généré avec les données disponibles
- Un score de qualité (0-10) est calculé et affiché

### F03 — Mode Survie (Résilience)
**En tant qu'** utilisateur,
**Je veux** que l'application ne m'affiche jamais une page blanche ou un message d'erreur brut,
**Pour que** mon expérience soit toujours fluide.

**Critères d'acceptance :**
- Si l'IA principale (Claude) est indisponible → basculement sur OpenRouter (13 modèles de secours)
- Si OpenRouter est indisponible → chargement de données pré-générées (Mock)
- Le temps de bascule est inférieur à 5 secondes
- L'utilisateur est informé discrètement du mode de fonctionnement dégradé

### F04 — Système de Votes Collectif
**En tant que** membre d'un groupe de voyageurs,
**Je veux** pouvoir voter 👍 ou 👎 sur chaque élément du pack,
**Pour que** le groupe puisse construire un consensus sans devoir se retrouver physiquement.

**Critères d'acceptance :**
- Chaque élément (vol, hôtel, activité) dispose d'un bouton de vote
- Les votes sont sauvegardés en base de données (persistant)
- Un vote est lié à un voyage via une clé étrangère (intégrité référentielle)
- Toute personne ayant le lien peut voter (sans compte obligatoire)

### F05 — Authentification Utilisateur
**En tant qu'** utilisateur,
**Je veux** créer un compte et me connecter,
**Pour que** mes voyages soient sauvegardés et accessibles lors de ma prochaine visite.

**Critères d'acceptance :**
- Inscription avec email + mot de passe (hashé en Bcrypt, 12 rounds)
- Connexion avec génération d'un token JWT (valable 7 jours)
- Les routes privées rejettent les requêtes sans token valide (HTTP 401)

---

## 4. ARCHITECTURE TECHNIQUE

### 4.1. Stack retenue

| Composant | Technologie | Justification |
|---|---|---|
| Frontend | React 18 + Vite + TailwindCSS | SPA réactive, design premium, build rapide |
| État global | Zustand | Moins verbeux que Redux, persistance intégrée |
| Backend | Node.js 20 + Express.js | Full-JS, asynchrone natif |
| Base de données | PostgreSQL via Supabase | Robustesse relationnelle + JSONB flexible |
| Authentification | JWT + Bcrypt.js | Standards industrie |
| IA | Claude (Anthropic) + OpenRouter | LLM avec fallback multi-modèles |
| Vols | Tavily (SmartSearch) | Recherche agentique flexible (données réelles) |
| Événements | API PredictHQ | Événements locaux en temps réel |

### 4.2. Modèle de données

**Tables principales :**
- `users` (id UUID PK, email UNIQUE, password, name)
- `trips` (id UUID PK, user_id FK, destination, pack_data JSONB, score)
- `packs` (id UUID PK, trip_id FK, rank, flight_data JSONB, hotel_data JSONB)
- `trip_votes` (id UUID PK, trip_id FK, item_id, vote_type BOOLEAN)
- `trip_collaborators` (trip_id FK + user_id FK = PK composée ← **Many-to-Many**)
- `user_preferences` (user_id FK PK, default_mode, preferred_prefs)

**Règles d'intégrité :**
- Toutes les suppressions en cascade (`ON DELETE CASCADE`)
- Identifiants UUID (`uuid_generate_v4()`) — sécurité anti-énumération

### 4.3. Sécurité
- **Aucune clé API** exposée côté frontend (proxy backend systématique)
- **Rate Limiting** : 100 req/15min global, 5 req/min sur les routes IA
- **CORS** restrictif (liste blanche des origines autorisées)
- **Helmet.js** : headers HTTP sécurisés

---

## 5. CONTRAINTES

### 5.1. Contraintes techniques
- **Performance** : Le pack doit être généré en moins de 30 secondes
- **Disponibilité** : L'app doit fonctionner même sans connexion aux APIs (Mode Survie)
- **Compatibilité** : Support des navigateurs modernes (Chrome 90+, Firefox 88+, Safari 14+)

### 5.2. Contraintes budgétaires
- Toutes les APIs utilisées en version gratuite pour la V1
- Hébergement Supabase en plan gratuit (500MB max)

---

## 6. CRITÈRES DE VALIDATION (Definition of Done)

Un élément est considéré comme "terminé" lorsque :
- [ ] La fonctionnalité est implémentée et fonctionnelle manuellement
- [ ] Au moins un test automatisé (CLI ou Vitest) valide son comportement
- [ ] Le code est committé sur la branche et pushé sur GitHub
- [ ] L'élément est documenté dans le `MASTER_PLAN.md`

---

## 7. LIVRABLES ATTENDUS

| Livrable | Description | Format |
|---|---|---|
| Code source | Application complète Frontend + Backend | GitHub (branche `feat-quality-and-tests`) |
| Tests | Suite CLI + Vitest | `tests/` et `server/tests/` |
| Base de données | Schéma SQL complet | `server/db/schema.sql` |
| Documentation | Dossier Professionnel + Master Plan | `.md` dans le repo |
| Démo | Application fonctionnelle en live | Serveur local (npm run dev) |
