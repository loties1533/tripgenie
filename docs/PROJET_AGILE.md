# TripGenie — Documentation Projet Complète

> Projet solo — Formation Holberton School — Bordeaux  
> Période : 21 avril 2026 → 26 mai 2026  
> Méthodologie : Agile / Scrum adapté (projet solo)

---

## Table des matières

1. [Cahier des charges](#1-cahier-des-charges)
2. [Organisation & Rôles](#2-organisation--rôles)
3. [User Stories MoSCoW](#3-user-stories-moscow)
4. [Backlog produit](#4-backlog-produit)
5. [Stratégie SCM & branches](#5-stratégie-scm--branches)
6. [Stratégie QA & Tests](#6-stratégie-qa--tests)
7. [Sprint 1 — Setup & MVP de base](#7-sprint-1--setup--mvp-de-base)
8. [Sprint 2 — Pipeline IA & Recherche web](#8-sprint-2--pipeline-ia--recherche-web)
9. [Sprint 3 — TypeScript, Docker & Tests](#9-sprint-3--typescript-docker--tests)
10. [Sprint 4 — Finalisation & Documentation](#10-sprint-4--finalisation--documentation)
11. [Métriques globales](#11-métriques-globales)

---

## 1. Cahier des charges

### 1.1 Contexte et problème résolu

Les comparateurs de voyage (Booking, Kayak, TripAdvisor) sont des **agrégateurs de données brutes** : ils retournent des centaines de résultats sans faire de synthèse. L'utilisateur doit lui-même filtrer, comparer et prendre des décisions chronophages.

**TripGenie résout ce problème** en générant automatiquement un pack voyage complet et personnalisé en moins de 30 secondes, via un pipeline IA orchestré côté serveur.

### 1.2 Objectifs du projet

| Objectif | Description |
|----------|-------------|
| Fonctionnel | Générer un pack voyage complet (vols, hôtels, itinéraire, météo, budget) en langage naturel |
| Technique | Démontrer une maîtrise du développement full-stack TypeScript (React + Node.js + PostgreSQL) |
| Qualité | Livrer un MVP fonctionnel avec tests automatisés et documentation technique complète |
| Sécurité | Implémenter une authentification JWT sécurisée et protéger les données utilisateur |

### 1.3 Périmètre fonctionnel (MVP)

**Inclus dans le MVP :**
- Authentification utilisateur (signup, login, logout) via JWT en cookie httpOnly
- Génération de pack voyage complet via pipeline IA orchestré
- 5 modes de voyage : party, luxury, student, group, relax
- Scoring déterministe des packs (0–1) selon le mode
- Données temps réel : vols et hôtels (Tavily), météo (OpenWeatherMap), photos (Unsplash)
- Sauvegarde et consultation des voyages générés
- Chat de modification post-génération
- Partage public d'un voyage via lien `/share/:id`
- Vote collectif sur les éléments d'un pack (mode groupe)

**Exclus du MVP :**
- Export PDF du pack
- Application mobile native
- Intégration Google Places
- Paiement en ligne

### 1.4 Contraintes techniques

| Contrainte | Détail |
|------------|--------|
| Langage | TypeScript — full-stack (frontend + backend) |
| Runtime | Node.js ≥ 18 |
| Base de données | PostgreSQL hébergé sur Supabase |
| Déploiement | Render (PaaS) |
| Tests | Vitest + Supertest |
| Sécurité | JWT httpOnly, Zod, Helmet, rate limiting |

### 1.5 Livrables attendus

- [ ] Application web déployée et accessible en production
- [ ] Code source versionné sur GitHub (branche `final`)
- [ ] Suite de tests automatisés (≥ 70 tests)
- [ ] Documentation technique complète (README, diagrammes, API)
- [ ] Document de conception Phase 3 (PDF)
- [ ] Documentation Agile (ce document)

---

## 2. Organisation & Rôles

Projet **solo** — toutes les responsabilités sont assumées par un seul développeur.

| Rôle | Responsabilités |
|------|----------------|
| **Project Manager** | Planification des sprints, suivi de l'avancement, gestion des priorités |
| **Développeur Full-Stack** | Implémentation frontend (React), backend (Express), base de données |
| **SCM** | Gestion des branches Git, revues de code, conventions de commit |
| **QA** | Écriture et exécution des tests, validation des livrables |

### Outils utilisés

| Outil | Usage |
|-------|-------|
| Git + GitHub | Versioning, branches, historique |
| VS Code | Développement |
| Vitest + Supertest | Tests automatisés |
| Postman | Tests manuels des endpoints |
| Render | Déploiement production |
| Supabase | Base de données PostgreSQL |

---

## 3. User Stories MoSCoW

### MUST HAVE — Fonctionnalités critiques

| ID | En tant que | Je veux | Afin de |
|----|-------------|---------|---------|
| US-01 | Visiteur | Créer un compte | Accéder à mes voyages sauvegardés |
| US-02 | Utilisateur | Me connecter de façon sécurisée | Rester authentifié sans risque de vol de token |
| US-03 | Utilisateur | Décrire mon voyage en langage naturel | Recevoir un pack complet personnalisé en moins de 30s |
| US-04 | Utilisateur | Modifier le pack via le chat | Ajuster hôtels, activités ou budget sans tout régénérer |
| US-05 | Utilisateur | Consulter mes voyages sauvegardés | Retrouver et comparer mes packs précédents |
| US-06 | Utilisateur | Obtenir un score de qualité (0–1) | Comparer objectivement plusieurs packs |

### SHOULD HAVE — Importantes mais non bloquantes

| ID | En tant que | Je veux | Afin de |
|----|-------------|---------|---------|
| US-07 | Utilisateur | Supprimer un voyage | Garder ma liste propre |
| US-08 | Utilisateur | Voir la météo prévue | Mieux préparer mes bagages |
| US-09 | Utilisateur | Voir une photo de ma destination | Avoir un aperçu visuel du lieu |
| US-10 | Groupe | Partager le lien du pack | Permettre aux autres de voir le voyage sans compte |

### COULD HAVE — Souhaitables

| ID | En tant que | Je veux | Afin de |
|----|-------------|---------|---------|
| US-11 | Groupe | Voter pour/contre les éléments du pack | Construire un consensus sans réunion |
| US-12 | Utilisateur | Voir les activités sur une carte | Visualiser géographiquement l'itinéraire |
| US-13 | Utilisateur | Voir un graphique de répartition du budget | Comprendre comment mon budget est utilisé |

### WON'T HAVE (MVP) — Hors périmètre

| ID | Fonctionnalité | Raison |
|----|---------------|--------|
| US-14 | Export PDF du pack | Complexité trop élevée pour le MVP |
| US-15 | Application mobile | Hors périmètre formation web |
| US-16 | Paiement en ligne | Nécessite certification PCI-DSS |

---

## 4. Backlog produit

Toutes les tâches identifiées avant le début du projet, ordonnées par valeur métier.

| # | Tâche | Priorité | Sprint | Statut |
|---|-------|----------|--------|--------|
| 1 | Setup projet Node.js + Express + PostgreSQL | MUST | 1 | ✅ |
| 2 | Authentification JWT (signup/login/logout) | MUST | 1 | ✅ |
| 3 | Cookie httpOnly + sameSite strict | MUST | 1 | ✅ |
| 4 | Hashage bcryptjs | MUST | 1 | ✅ |
| 5 | CRUD voyages (GET, DELETE) | MUST | 1 | ✅ |
| 6 | Premier appel LLM (génération pack) | MUST | 1 | ✅ |
| 7 | Intégration Tavily (vols, hôtels, événements) | MUST | 2 | ✅ |
| 8 | Promise.allSettled — recherches parallèles | MUST | 2 | ✅ |
| 9 | Algorithme de scoring 0–1 par mode | MUST | 2 | ✅ |
| 10 | Chaîne fallback LLM (Gemini → Claude → OpenRouter → Mocks) | MUST | 2 | ✅ |
| 11 | Validation Zod sur tous les endpoints | MUST | 2 | ✅ |
| 12 | Rate limiting (global + routes IA) | MUST | 2 | ✅ |
| 13 | Proxy Unsplash (photos) | SHOULD | 2 | ✅ |
| 14 | Météo OpenWeatherMap | SHOULD | 2 | ✅ |
| 15 | Chat de modification post-génération | SHOULD | 2 | ✅ |
| 16 | Migration TypeScript complète | MUST | 3 | ✅ |
| 17 | Suite de tests Vitest + Supertest (77 tests) | MUST | 3 | ✅ |
| 18 | Containerisation Docker | SHOULD | 3 | ✅ |
| 19 | Helmet + Morgan production | MUST | 3 | ✅ |
| 20 | Génération diagrammes PNG | MUST | 4 | ✅ |
| 21 | README professionnel avec diagrammes | MUST | 4 | ✅ |
| 22 | Landing page vitrine HTML | SHOULD | 4 | ✅ |
| 23 | Nettoyage repos GitHub | SHOULD | 4 | ✅ |

---

## 5. Stratégie SCM & branches

### Modèle de branches

```
main        ← Code stable — déployé sur Render (production)
   │
   └── final ← Branche de développement principale
          │
          ├── feat/nom-feature  ← Nouvelle fonctionnalité isolée
          └── fix/nom-bug       ← Correction de bug ciblée
```

### Règles

| Branche | Règle |
|---------|-------|
| `main` | Merge depuis `final` uniquement après validation complète |
| `final` | Branche de travail courante — merge des feat/* et fix/* |
| `feat/*` | Créée depuis `final`, mergée après validation locale |
| `fix/*` | Merge rapide dans `final` après test local |

### Conventions de commit

Format : `type: description courte en français`

| Type | Usage |
|------|-------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `refactor` | Refactoring sans changement fonctionnel |
| `test` | Ajout ou modification de tests |
| `docs` | Documentation uniquement |
| `chore` | Maintenance, dépendances, nettoyage |

**Exemples :**
```
feat: ajout proxy Unsplash côté serveur
fix: corriger parsing JSON LLM pour les réponses malformées
test: ajout tests scoring relax/group/student
docs: README complet avec diagrammes intégrés
chore: suppression fichiers perso du tracking git
```

### Statistiques Git

- **107 commits** sur la durée du projet
- **15+ branches** créées (feat/*, fix/*, migration_typescript, etc.)
- Aucun push direct sur `main` — toujours via `final`

---

## 6. Stratégie QA & Tests

### Niveaux de tests

| Niveau | Outil | Fichier | Ce qui est testé |
|--------|-------|---------|-----------------|
| Tests unitaires | Vitest | `scoring.test.ts` | Algorithme de scoring sur 5 modes |
| Tests d'intégration | Vitest + Supertest | `api.test.ts` | Routes HTTP : auth, trips, votes, CORS, rate limiting |
| Tests end-to-end | Vitest + Supertest | `golden_path.test.ts` | Flux critiques : génération, chat, photos, healthcheck |
| Tests middleware | Vitest + Supertest | `middleware.test.ts` | JWT : token absent, expiré, invalide, malformé |

### Résultats

```
✓ api.test.ts           40 tests  — Routes HTTP
✓ golden_path.test.ts   15 tests  — Flux end-to-end
✓ scoring.test.ts       12 tests  — Scoring tous modes
✓ middleware.test.ts    10 tests  — JWT middleware
─────────────────────────────────────────────────
  77 tests passés en 0.4s — 0 échec
```

### Stratégie de mocks

Tous les services externes sont mockés en test pour garantir :
- Reproductibilité : même résultat à chaque run
- Rapidité : 0.4s sans dépendances réseau
- Isolation : pas besoin de vraies clés API

| Service mocké | Raison |
|--------------|--------|
| LLM (Gemini/Claude/OpenRouter) | Coût + indisponibilité |
| Supabase | Isolation base de données |
| Tavily | Quota API limité |
| OpenWeatherMap | Données variables |
| Unsplash | Quota API limité |

### Critères d'acceptation QA

- [ ] 0 test en échec avant tout merge dans `final`
- [ ] 0 `console.log` en production
- [ ] Tous les inputs validés par Zod avant traitement
- [ ] Aucune clé API exposée côté client

---

## 7. Sprint 1 — Setup & MVP de base

**Période :** 21 avril → 30 avril 2026 | **Durée :** 10 jours

### Planning

| Tâche | Priorité | Estimation | Statut |
|-------|----------|-----------|--------|
| Initialisation Node.js + Express + TypeScript | MUST | 1j | ✅ |
| Connexion PostgreSQL via Supabase | MUST | 0.5j | ✅ |
| Tables SQL : users, trips, trip_votes | MUST | 0.5j | ✅ |
| Routes auth : signup, login, logout, /me | MUST | 2j | ✅ |
| JWT signé + cookie httpOnly + sameSite strict | MUST | 1j | ✅ |
| Hashage bcryptjs des mots de passe | MUST | 0.5j | ✅ |
| Middleware requireAuth / optionalAuth | MUST | 0.5j | ✅ |
| Premier appel LLM Gemini | MUST | 2j | ✅ |
| Routes trips : GET, DELETE | MUST | 1j | ✅ |
| Sauvegarde du pack en base (pack_data JSONB) | MUST | 1j | ✅ |

### Objectifs
Avoir une application fonctionnelle de bout en bout : un utilisateur peut créer un compte, se connecter et générer un premier pack voyage sauvegardé en base.

### Résultats
- MVP fonctionnel : signup → login → génération de pack → sauvegarde
- Authentification JWT httpOnly opérationnelle
- Base de données avec 3 tables (users, trips, trip_votes)
- Premier appel LLM Gemini réussi

### Review
**Démo :** Flux complet signup → login → génération d'un pack Ibiza → visible dans la liste des voyages.

**Livré :**
- API REST Express avec routes auth et trips
- JWT en cookie httpOnly + sameSite strict
- Client Supabase singleton opérationnel

### Rétrospective

| 👍 Bien marché | 👎 Difficile | 🔧 Amélioration sprint suivant |
|---------------|-------------|-------------------------------|
| Architecture Express claire dès le départ | Supabase Auth non utilisé — RLS impossible | Ajouter une chaîne fallback LLM |
| JWT httpOnly fonctionnel rapidement | Parsing JSON du LLM instable | Intégrer Zod pour valider les inputs |
| Modèle de données simple et efficace | Pas encore de validation des inputs | Structurer le pipeline IA en modules |

---

## 8. Sprint 2 — Pipeline IA & Recherche web

**Période :** 01 mai → 14 mai 2026 | **Durée :** 14 jours

### Planning

| Tâche | Priorité | Estimation | Statut |
|-------|----------|-----------|--------|
| Module smartSearch (Tavily : vols, hôtels, événements) | MUST | 3j | ✅ |
| Promise.allSettled — 5 recherches en parallèle | MUST | 1j | ✅ |
| Algorithme de scoring déterministe 0–1 (5 modes) | MUST | 2j | ✅ |
| Chaîne fallback LLM (Gemini → Claude → OpenRouter → Mocks) | MUST | 2j | ✅ |
| Validation Zod sur tous les endpoints | MUST | 1j | ✅ |
| Rate limiting (global 100/15min + IA 10/h) | MUST | 0.5j | ✅ |
| Intégration OpenWeatherMap (météo temps réel) | SHOULD | 1j | ✅ |
| Proxy Unsplash backend (photos destinations) | SHOULD | 0.5j | ✅ |
| Chat de modification post-génération (/api/ai/chat) | SHOULD | 2j | ✅ |
| Mocks statiques (fallback dernier recours) | SHOULD | 0.5j | ✅ |

### Objectifs
Construire le pipeline IA complet et résilient. Garantir qu'une panne d'un service externe ne bloque pas la génération grâce à `Promise.allSettled` et la chaîne de fallback.

### Résultats
- Pipeline IA orchestré en 5 étapes : validation → recherches → assemblage → scoring → sauvegarde
- `Promise.allSettled` : 5 recherches parallèles, une panne n'arrête pas les autres
- Chaîne de fallback LLM complète (4 niveaux)
- Score 0–1 calculé par algorithme déterministe selon le mode
- Validation Zod active sur tous les endpoints

### Review
**Démo :** Génération d'un pack Barcelone en mode student — vols Tavily réels, météo OpenWeatherMap, score 0.73, photo Unsplash. Simulation d'une coupure Gemini → Claude prend le relais automatiquement.

**Livré :**
- `server/services/smartSearch.ts`
- `server/services/scoring.ts`
- `server/services/providers.ts`
- `server/services/mocks.ts`
- `server/middleware/limiter.ts`
- `server/services/claude/` (core, analyze, pack, chat)

### Rétrospective

| 👍 Bien marché | 👎 Difficile | 🔧 Amélioration sprint suivant |
|---------------|-------------|-------------------------------|
| Promise.allSettled très efficace pour la résilience | OpenRouter retourne parfois du JSON malformé | Migrer vers TypeScript pour typage strict |
| Scoring simple, testable et déterministe | Tavily peut être lent (>10s) — timeout nécessaire | Écrire les tests avant les features (TDD) |
| Fallback robuste : l'app ne crashe jamais | Debug difficile sans types explicites | Containeriser avec Docker |

---

## 9. Sprint 3 — TypeScript, Docker & Tests

**Période :** 15 mai → 23 mai 2026 | **Durée :** 9 jours

### Planning

| Tâche | Priorité | Estimation | Statut |
|-------|----------|-----------|--------|
| Migration complète JS → TypeScript | MUST | 3j | ✅ |
| Correction bugs détectés par le compilateur (8 bugs) | MUST | 1j | ✅ |
| Remplacement des `any` par des types explicites | MUST | 0.5j | ✅ |
| Tests routes HTTP — api.test.ts (40 tests) | MUST | 2j | ✅ |
| Tests golden path E2E — golden_path.test.ts (15 tests) | MUST | 1j | ✅ |
| Tests scoring — scoring.test.ts (12 tests) | MUST | 0.5j | ✅ |
| Tests middleware JWT — middleware.test.ts (10 tests) | MUST | 0.5j | ✅ |
| Mocks Supabase + LLM + services externes | MUST | 1j | ✅ |
| Dockerfile multi-stage + docker-compose | SHOULD | 1j | ✅ |
| Helmet (headers HTTP sécurisés) | MUST | 0.5j | ✅ |
| Morgan activé en production (logs HTTP) | SHOULD | 0.25j | ✅ |
| Suppression console.log en production | SHOULD | 0.25j | ✅ |

### Objectifs
Garantir la qualité du code avec TypeScript et 77 tests automatisés. Containeriser l'application pour un déploiement reproductible. Atteindre 0 bug critique.

### Résultats
- **77 tests** passent en 0.4 secondes
- Migration TypeScript complète — **8 bugs** détectés et corrigés à la compilation
- Docker fonctionnel (multi-stage build, 1 container)
- Helmet + Morgan activés
- Tous les services externes mockés en tests

### Review
**Démo :** `npm test` — 77 tests en 0.4s, zéro échec. Présentation de la couverture : routes HTTP, flux E2E, scoring sur 5 modes, middleware JWT (absent / expiré / invalide).

**Livré :**
- `tests/api.test.ts` (40 tests)
- `tests/golden_path.test.ts` (15 tests)
- `tests/scoring.test.ts` (12 tests)
- `tests/middleware.test.ts` (10 tests)
- `Dockerfile` + `docker-compose.yml`
- Migration TypeScript de tout le backend

### Rétrospective

| 👍 Bien marché | 👎 Difficile | 🔧 Amélioration sprint suivant |
|---------------|-------------|-------------------------------|
| TypeScript a détecté 8 bugs réels avant runtime | Migration JS → TS chronophage (3 jours) | Finir la documentation technique |
| Vitest ultra-rapide : 77 tests en 0.4s | Configurer les mocks Supabase correctement | Intégrer les diagrammes PNG dans les docs |
| Docker simplifie le déploiement reproductible | Docker-compose réseau entre containers | Créer la landing page vitrine |

---

## 10. Sprint 4 — Finalisation & Documentation

**Période :** 24 mai → 26 mai 2026 | **Durée :** 3 jours

### Planning

| Tâche | Priorité | Estimation | Statut |
|-------|----------|-----------|--------|
| Génération diagrammes PNG via Mermaid CLI | MUST | 0.5j | ✅ |
| Correction DIAGRAMS.md (ERD 3 tables, fallback LLM) | MUST | 0.5j | ✅ |
| Refonte README (diagrammes, BDD corrigée, routes API) | MUST | 1j | ✅ |
| Landing page HTML vitrine standalone | SHOULD | 1j | ✅ |
| Nettoyage repos Holberton (README + gitignore) | SHOULD | 0.5j | ✅ |
| Suppression fichiers perso du tracking git | MUST | 0.25j | ✅ |
| Document de conception Phase 3 PDF finalisé | MUST | 0.5j | ✅ |
| Documentation Agile complète (ce document) | MUST | 0.5j | ✅ |

### Objectifs
Livrer une documentation complète et professionnelle pour la soutenance. Nettoyer tous les repos GitHub. Soumettre les livrables Phase 3 et Phase 4.

### Résultats
- 6 diagrammes PNG générés et intégrés (architecture, ERD, seq_generate, seq_auth, scoring, llm_fallback)
- Landing page `docs/landing.html` complète
- README refait avec diagrammes, BDD correcte (3 tables), 77 tests
- Repos Holberton nettoyés
- PDF Phase 3 soumis sur l'intranet

### Review
**Démo :** Landing page `docs/landing.html` — architecture, ERD, séquences, scoring, fallback LLM, stack. README GitHub avec tous les diagrammes embarqués.

**Livré :**
- `docs/landing.html`
- `docs/DIAGRAMS.md` + `docs/DIAGRAMS_VISUAL.md`
- `docs/assets/diagrams/` — 6 PNG
- `docs/PROJET_AGILE.md` (ce document)
- README final sur branche `final`

### Rétrospective

| 👍 Bien marché | 👎 Difficile | 🔧 Pour un prochain projet |
|---------------|-------------|---------------------------|
| Diagrammes Mermaid → PNG automatisés via npm | ERD Mermaid toujours portrait — recréé en code | Documenter au fur et à mesure, pas à la fin |
| Landing page HTML dark mode sans dépendances | Retrouver l'ordre chronologique a posteriori | Créer les sprints en temps réel (Trello/Notion) |
| README professionnel apprécié | Nettoyer l'historique git prend du temps | Adopter les conventions de commit dès le jour 1 |

---

## 11. Métriques globales

| Métrique | Valeur |
|----------|--------|
| Durée totale | 35 jours |
| Nombre de sprints | 4 |
| Commits total | 107 |
| Tests automatisés | 77 (0.4s, 0 échec) |
| Branches créées | 15+ |
| Services externes intégrés | 6 |
| LLM en chaîne de fallback | 3 + mocks |
| Pages déployées | 1 (Render) |
| User Stories livrées | 13 / 16 (81%) |
| Bugs détectés par TypeScript | 8 |

### Vélocité par sprint

| Sprint | Tâches planifiées | Tâches livrées | Vélocité |
|--------|------------------|---------------|---------|
| Sprint 1 | 10 | 10 | 100% |
| Sprint 2 | 11 | 11 | 100% |
| Sprint 3 | 12 | 12 | 100% |
| Sprint 4 | 8 | 8 | 100% |

---

## Liens

| Ressource | Lien |
|-----------|------|
| Application en production | https://tripgenie.onrender.com |
| Repository GitHub | https://github.com/loties1533/tripgenie |
| Branche principale | `final` |
| Documentation diagrammes | `docs/DIAGRAMS_VISUAL.md` |
| Landing page vitrine | `docs/landing.html` |

---

*TripGenie — Documentation Agile complète — Holberton School — Mai 2026*
