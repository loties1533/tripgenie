# TripGenie — Stack Technique & Justifications

> Mis à jour : juin 2026 — branche `feat/postgres-rls`

## Vue d'ensemble

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| **Runtime** | Node.js ≥18 | Full-stack JS = un seul langage, un seul déploiement |
| **Langage** | TypeScript (strict) | Typage statique partagé front/back via `server/lib/types.ts` |
| **Backend** | Express 4 | Léger, middleware pattern, routes modulaires |
| **Frontend** | React 18 + Vite | HMR ultra-rapide, composants réutilisables |
| **Base de données** | PostgreSQL (Supabase hébergeur) | Relationnel + JSONB + RLS natif |
| **Driver BDD** | `pg` natif (node-postgres) | Contrôle total des transactions, RLS maison possible |
| **Validation** | Zod v4 | TypeScript-natif, types inférés depuis les schémas |
| **Auth** | JWT + bcryptjs | Stateless, cookie httpOnly, bcrypt salt 10 |
| **State management** | Zustand v5 | Moins de boilerplate que Redux |
| **Data fetching** | React Query v5 | Cache + loading/error states automatiques |
| **Routing** | React Router v6 | SPA navigation sans rechargement |
| **Styles** | Tailwind CSS | Cohérence visuelle rapide, responsive intégré |
| **Tests** | Vitest + Supertest | Natif ESM, rapide, compatible ES modules |
| **Déploiement** | Render (PaaS) | Supporte les serveurs Node.js persistants (pool PostgreSQL) |
| **CI** | GitHub Actions | Tests + tsc à chaque push |
| **Doc API** | swagger-ui-express | Interface interactive sur /api/docs |

## IA & Services externes

| Service | Rôle | Fallback |
|---------|------|---------|
| Gemini 2.0 Flash | LLM principal (JSON fiable, quota large) | Claude |
| Claude Haiku | LLM secondaire | OpenRouter |
| OpenRouter | LLM tertiaire (7 modèles gratuits) | Mocks statiques |
| Tavily | Recherche web temps réel (vols, hôtels) | Données IA |
| PredictHQ | Événements structurés (concerts, festivals) | Tavily |
| Foursquare Places | Restaurants réels (1000/jour gratuit) | Yelp |
| Yelp Fusion | Restaurants fallback | `[]` |
| Open-Meteo | Météo **sans clé API** | Données IA |
| Unsplash | Photos destinations (proxifié backend) | Placeholder |

## Choix importants pour l'oral

### Pourquoi `pg` natif et pas Prisma ?
Le driver `pg` donne un contrôle total sur les transactions. C'est ce qui permet
d'implémenter le RLS avec `set_config` transaction-local — impossible proprement
avec Prisma. Le bénéfice du typage auto de Prisma ne compense pas la perte de
contrôle sur les transactions pour ce projet.

### Pourquoi Render et pas Vercel ?
Vercel est optimisé pour apps statiques/serverless. TripGenie a un serveur Express
persistant avec pool PostgreSQL — Render supporte ça nativement.

### Pourquoi Vitest et pas Jest ?
Vitest est natif ESM, compatible avec la config Vite/ES modules. Jest nécessiterait
une transpilation supplémentaire. Vitest est aussi plus rapide.
