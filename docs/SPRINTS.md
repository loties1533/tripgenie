# TripGenie — Documentation Agile des Sprints

> Projet solo — Formation Holberton School  
> Période : 21 avril 2026 → 26 mai 2026  
> Méthodologie : Agile / Scrum adapté (projet solo)

---

## Rôles

| Rôle | Responsable |
|------|-------------|
| Project Manager | Alexis Laubert |
| Développeur Full-Stack | Alexis Laubert |
| SCM (Source Control Manager) | Alexis Laubert |
| QA (Quality Assurance) | Alexis Laubert |

---

## Vue d'ensemble des sprints

| Sprint | Période | Objectif principal | Statut |
|--------|---------|-------------------|--------|
| Sprint 1 | 21/04 → 30/04 | Setup, authentification, MVP de base | ✅ Terminé |
| Sprint 2 | 01/05 → 14/05 | Pipeline IA, scoring, recherche web | ✅ Terminé |
| Sprint 3 | 15/05 → 23/05 | Migration TypeScript, Docker, tests | ✅ Terminé |
| Sprint 4 | 24/05 → 26/05 | Finalisation, documentation, qualité | ✅ Terminé |

---

## Sprint 1 — Setup & MVP de base
**Période :** 21 avril → 30 avril 2026  
**Durée :** 10 jours

### Planning

| Tâche | Priorité | Statut |
|-------|----------|--------|
| Initialisation du projet Node.js / Express | MUST | ✅ |
| Mise en place de la base de données PostgreSQL (Supabase) | MUST | ✅ |
| Authentification JWT (signup, login, logout) | MUST | ✅ |
| Hashage des mots de passe avec bcryptjs | MUST | ✅ |
| Cookie httpOnly sécurisé | MUST | ✅ |
| Première intégration LLM (génération de pack) | MUST | ✅ |
| Sauvegarde des voyages en base de données | MUST | ✅ |
| Route GET /api/trips (liste des voyages) | SHOULD | ✅ |
| Documentation initiale du projet | SHOULD | ✅ |

### Objectifs du sprint
- Avoir une application fonctionnelle de bout en bout : un utilisateur peut créer un compte, se connecter et générer un premier pack voyage.
- Sécuriser l'authentification dès le départ avec JWT en cookie httpOnly.

### Résultats
- MVP fonctionnel : signup → login → génération de pack → sauvegarde
- Authentification sécurisée opérationnelle
- Base de données PostgreSQL configurée avec 3 tables (users, trips, trip_votes)
- Premier appel LLM réussi (Google Gemini)

### Review
**Démonstration :** Flux complet signup → login → génération d'un pack Ibiza → sauvegarde visible dans la liste des voyages.

**Ce qui a été livré :**
- API REST Express avec routes auth et trips
- JWT en cookie httpOnly + sameSite strict
- Connexion Supabase opérationnelle
- Génération basique d'un pack JSON par le LLM

### Rétrospective

| 👍 Ce qui a bien marché | 👎 Ce qui était difficile | 🔧 Amélioration pour le prochain sprint |
|------------------------|--------------------------|----------------------------------------|
| Architecture Express claire dès le départ | Configurer Supabase avec auth custom (pas de RLS) | Mieux structurer les services IA |
| JWT httpOnly fonctionnel rapidement | Parsing JSON du LLM instable | Ajouter une chaîne de fallback LLM |
| Modèle de données simple et efficace | Pas encore de validation des inputs | Intégrer Zod pour valider tous les endpoints |

---

## Sprint 2 — Pipeline IA & Recherche web
**Période :** 01 mai → 14 mai 2026  
**Durée :** 14 jours

### Planning

| Tâche | Priorité | Statut |
|-------|----------|--------|
| Intégration Tavily (recherche vols, hôtels, événements) | MUST | ✅ |
| Pipeline IA orchestré (analyze → search → assemble → score) | MUST | ✅ |
| Algorithme de scoring multi-critères (5 modes) | MUST | ✅ |
| Chaîne de fallback LLM (Gemini → Claude → OpenRouter → Mocks) | MUST | ✅ |
| Validation Zod sur tous les endpoints | MUST | ✅ |
| Promise.allSettled pour les recherches parallèles | MUST | ✅ |
| Intégration OpenWeatherMap (météo temps réel) | SHOULD | ✅ |
| Proxy Unsplash (photos destinations) | SHOULD | ✅ |
| Chat de modification post-génération | SHOULD | ✅ |
| Rate limiting sur les routes IA | MUST | ✅ |
| Mocks statiques (fallback dernier recours) | SHOULD | ✅ |

### Objectifs du sprint
- Construire le pipeline IA complet et résilient : les 5 recherches parallèles via Tavily, la génération par LLM, et le scoring déterministe.
- Garantir qu'une panne d'un service externe ne bloque pas la génération.

### Résultats
- Pipeline IA orchestré en 5 étapes fonctionnel
- `Promise.allSettled` : les 5 recherches tournent en parallèle, une panne n'arrête pas les autres
- Chaîne de fallback LLM complète (4 niveaux)
- Score 0-1 calculé par algorithme déterministe selon le mode de voyage
- Validation Zod active sur tous les endpoints

### Review
**Démonstration :** Génération d'un pack complet pour Barcelone en mode student — vols Tavily réels, météo OpenWeatherMap, score 0.73, photo Unsplash, fallback Claude activé lors d'une coupure Gemini simulée.

**Ce qui a été livré :**
- `smartSearch.ts` — recherche vols / hôtels / événements via Tavily
- `scoring.ts` — algorithme de scoring pur (0 IA)
- `providers.ts` — abstraction multi-LLM
- `mocks.ts` — fallback ultime
- `limiter.ts` — rate limiting par route

### Rétrospective

| 👍 Ce qui a bien marché | 👎 Ce qui était difficile | 🔧 Amélioration pour le prochain sprint |
|------------------------|--------------------------|----------------------------------------|
| Promise.allSettled très efficace pour la résilience | OpenRouter retourne parfois du JSON malformé | Migrer vers TypeScript pour détecter les bugs à la compilation |
| Algorithme de scoring simple et testable | Tavily peut être lent (>10s) — timeout nécessaire | Ajouter une suite de tests complète |
| Chaîne de fallback robuste | Debugging difficile sans typage strict | Containeriser avec Docker pour la portabilité |

---

## Sprint 3 — TypeScript, Docker & Tests
**Période :** 15 mai → 23 mai 2026  
**Durée :** 9 jours

### Planning

| Tâche | Priorité | Statut |
|-------|----------|--------|
| Migration complète vers TypeScript | MUST | ✅ |
| Correction des bugs détectés par le compilateur TypeScript | MUST | ✅ |
| Suite de tests Vitest + Supertest | MUST | ✅ |
| Tests routes HTTP (auth, trips, votes, rate limiting) | MUST | ✅ |
| Tests golden path end-to-end | MUST | ✅ |
| Tests algorithme de scoring | MUST | ✅ |
| Tests middleware JWT | MUST | ✅ |
| Mocks des services externes pour les tests | MUST | ✅ |
| Containerisation Docker (multi-stage build) | SHOULD | ✅ |
| Ajout Helmet (headers de sécurité HTTP) | MUST | ✅ |
| Suppression des console.log en production | SHOULD | ✅ |
| Nettoyage du code (types any → types explicites) | SHOULD | ✅ |

### Objectifs du sprint
- Garantir la qualité du code avec TypeScript et une suite de tests complète.
- Containeriser l'application pour simplifier le déploiement.
- Atteindre 0 bug critique avant la livraison finale.

### Résultats
- **77 tests** passent en 0.4 secondes
- Migration TypeScript complète — 8 bugs détectés et corrigés à la compilation
- Docker fonctionnel (multi-stage build, 1 seul container)
- Helmet activé + Morgan en production
- Tous les services externes mockés dans les tests

### Review
**Démonstration :** `npm test` — 77 tests en 0.4s, zéro échec. Présentation de la couverture : routes HTTP, flux end-to-end, scoring sur 5 modes, middleware JWT (token absent / expiré / invalide).

**Ce qui a été livré :**
- `tests/api.test.ts` — 40 tests routes HTTP
- `tests/golden_path.test.ts` — 15 tests flux critiques
- `tests/scoring.test.ts` — 12 tests algorithme
- `tests/middleware.test.ts` — 10 tests JWT
- `Dockerfile` + `docker-compose.yml`

### Rétrospective

| 👍 Ce qui a bien marché | 👎 Ce qui était difficile | 🔧 Amélioration pour le prochain sprint |
|------------------------|--------------------------|----------------------------------------|
| TypeScript a détecté 8 bugs réels avant runtime | Migration JS → TS chronophage | Finaliser la documentation technique |
| Vitest très rapide (0.4s pour 77 tests) | Configurer les mocks Supabase correctement | Intégrer les vrais diagrammes PNG dans les docs |
| Docker simplifie le déploiement | docker-compose réseau entre containers | Créer la landing page vitrine |

---

## Sprint 4 — Finalisation & Documentation
**Période :** 24 mai → 26 mai 2026  
**Durée :** 3 jours

### Planning

| Tâche | Priorité | Statut |
|-------|----------|--------|
| Génération des diagrammes PNG (Mermaid CLI) | MUST | ✅ |
| Mise à jour DIAGRAMS.md (ERD corrigé, fallback LLM) | MUST | ✅ |
| Refonte complète du README (diagrammes, BDD, routes API) | MUST | ✅ |
| Création de la landing page HTML vitrine | SHOULD | ✅ |
| Suppression des fichiers personnels du tracking git | MUST | ✅ |
| Amélioration du .gitignore | SHOULD | ✅ |
| Nettoyage des repos Holberton (README, gitignore, dist) | SHOULD | ✅ |
| Document de conception Phase 3 finalisé (PDF) | MUST | ✅ |

### Objectifs du sprint
- Livrer une documentation complète et professionnelle pour la soutenance.
- Nettoyer tous les repos GitHub pour la CareerCraft.
- Avoir une landing page vitrine présentable pour la MR.

### Résultats
- 6 diagrammes PNG générés et intégrés dans le README et la landing page
- Landing page `docs/landing.html` complète (dark mode, toutes sections)
- README refait avec BDD corrigée (3 tables réelles), 77 tests, diagrammes
- Repos Holberton nettoyés (README + gitignore + dist supprimés)
- PDF Phase 3 soumis sur l'intranet Holberton

### Review
**Démonstration :** Présentation de la landing page `docs/landing.html` — architecture, ERD, séquences, scoring, fallback LLM, stack complète. README GitHub final avec tous les diagrammes embarqués.

**Ce qui a été livré :**
- `docs/landing.html` — page vitrine complète
- `docs/DIAGRAMS.md` + `docs/DIAGRAMS_VISUAL.md`
- `docs/assets/diagrams/` — 6 PNG (architecture, ERD, seq_generate, seq_auth, scoring, llm_fallback)
- README final sur branche `final`

### Rétrospective

| 👍 Ce qui a bien marché | 👎 Ce qui était difficile | 🔧 Pour un prochain projet |
|------------------------|--------------------------|---------------------------|
| Diagrammes Mermaid → PNG automatisés via npm run diagrams | ERD Mermaid toujours en portrait (forcé de recréer en reportlab) | Documenter au fur et à mesure, pas tout à la fin |
| Landing page HTML standalone sans dépendances | Nettoyer l'historique git prend du temps | Créer les sprints en temps réel sur Trello ou Notion |
| README professionnel avec diagrammes embarqués | Retrouver l'ordre chronologique des features a posteriori | Adopter les conventions de commit dès le début |

---

## Métriques globales

| Métrique | Valeur |
|----------|--------|
| Durée totale | 35 jours |
| Nombre de commits | ~80 |
| Tests automatisés | 77 (0.4s) |
| Branches utilisées | main, final, feat/*, fix/* |
| Services externes intégrés | 6 (Gemini, Claude, OpenRouter, Tavily, OpenWeatherMap, Unsplash) |
| LLM en fallback | 3 + mocks statiques |
| Score couverture | Routes HTTP, E2E, scoring, middleware JWT |

---

## Stratégie de branches

| Branche | Rôle |
|---------|------|
| `main` | Code stable — déployé sur Render |
| `final` | Branche de développement principale |
| `feat/*` | Fonctionnalités isolées |
| `fix/*` | Corrections de bugs |

---

*TripGenie — Documentation Agile — Holberton School — Mai 2026*
