# 🗺️ MASTER PLAN — TRIPGENIE
**Candidat :** Alexis Laubert | **Titre visé :** RNCP 5 - Développeur Web et Web Mobile
**Date de soutenance :** Juin 2026 | **Branche active :** `feat-quality-and-tests`

> Ce document est **LA référence unique** du projet. Il remplace tous les autres `.md` dispersés.
> Il contient : l'état des fonctionnalités, les tests à valider, et les arguments à tenir face au jury.

---

## 📦 ÉTAT DES FONCTIONNALITÉS (Review complète)

| # | Fonctionnalité | Fichier clé | Status | Testé ? |
|---|---|---|:---:|:---:|
| 1 | **Chatbot Onboarding (IA)** | `server/routes/ai.js` → `/onboarding` | ✅ OK | ✅ `test_api_v1.js` |
| 2 | **Génération de Pack (IA + APIs)** | `server/routes/ai.js` → `/generate` | ✅ OK | ⚠️ Test manuel seulement |
| 3 | **Fallback IA (Mode Survie)** | `server/services/claude.js` | ✅ OK | ✅ `claude.test.js` |
| 4 | **Recherche de Vols (Amadeus)** | `server/services/amadeus.js` | ⚠️ Partiel | ❌ Pas de test isolé |
| 5 | **Événements locaux (PredictHQ)** | `server/services/predicthq.js` | ⚠️ Partiel | ❌ Pas de test isolé |
| 6 | **Scoring du Pack** | `server/services/scoring.js` | ✅ OK | ❌ Pas de test |
| 7 | **Système de Votes (Groupe)** | `server/routes/votes.js` | ✅ OK | ⚠️ Bloqué par FK UUID |
| 8 | **Health Check API** | `server/index.js` → `/health` | ✅ OK | ✅ `test_api_v1.js` |
| 9 | **Authentification (JWT/Bcrypt)** | `server/routes/auth.js` | ✅ OK | ❌ Pas de test |
| 10 | **Sauvegarde des Voyages (Supabase)** | `server/routes/trips.js` | ✅ OK | ❌ Pas de test |
| 11 | **Parsing JSON de l'IA** | `server/services/claude.js` → `parseJSON` | ✅ OK | ✅ `claude.test.js` |
| 12 | **Interface Résultats (React)** | `client-react/src/components/results/` | ✅ OK | ❌ Pas de test |

---

## 🎯 PLAN D'ACTION PRIORITAIRE (Ce qu'on fait avant la soutenance)

### 🔴 PRIORITÉ 1 — Blinder les tests manquants
Ces fonctionnalités marchent mais ne sont pas prouvées. Pour le RNCP, **la preuve est tout**.

- [ ] **Test du Scoring** : Ajouter dans `tests/test_services.js` un test qui vérifie que `scorepack()` renvoie un score > 0.
- [ ] **Test de l'Auth** : Ajouter dans `tests/test_api_v1.js` un test `POST /api/auth/register` et `POST /api/auth/login`.
- [ ] **Test des Votes (débloquer)** : Créer un voyage de test en base via Supabase Dashboard, noter son UUID, l'utiliser dans les tests.

### 🟡 PRIORITÉ 2 — Solidifier ce qui est "Partiel"
- [ ] **Amadeus** : Vérifier que si Amadeus échoue (quota), le fallback SmartSearch s'active. Documenter.
- [ ] **PredictHQ** : Vérifier que si l'API échoue, les événements sont ignorés silencieusement (sans crash).

### 🟢 PRIORITÉ 3 — Documentation
- Ce fichier (`MASTER_PLAN.md`) est le **seul** qu'on met à jour.
- Le `Dossier_Professionnel_V1.md` est le document de soutenance final.
- Ne plus créer de nouveaux fichiers `.md`.

---

## 🛠️ STACK TECHNIQUE ET JUSTIFICATIONS

| Techno | Rôle | Pourquoi ce choix |
|---|---|---|
| **React 18 + Vite** | Interface utilisateur | SPA ultra-réactive, gestion d'état complexe du chat |
| **Zustand** | Gestion d'état global | Plus simple que Redux, persistance locale intégrée |
| **TailwindCSS** | Styling | Design premium sur-mesure, mobile-first |
| **Node.js + Express** | Serveur / API REST | Full-JS, asynchrone natif (idéal pour appels IA lents) |
| **JWT + Bcrypt** | Sécurité | Standards de l'industrie pour auth et hashage |
| **PostgreSQL (Supabase)** | Base de données | Robustesse SQL + stockage JSONB pour packs IA |
| **Claude / OpenRouter** | IA | Fallback sur 13 modèles gratuits |
| **Amadeus** | Vols réels | Standard de l'industrie du voyage |
| **PredictHQ** | Événements locaux | Enrichit les packs avec des événements réels |

---

## 🎓 CONFORMITÉ RNCP 5

### Activité Type 1 : Front-End
| Compétence | Preuve | ✓ |
|---|---|:---:|
| Interfaces dynamiques | React + Zustand + Framer Motion | ✅ |
| Consommer une API | Appels `fetch` vers le serveur Express | ✅ |
| Stockage de données côté client | Zustand avec `persist` (localStorage) | ✅ |

### Activité Type 2 : Back-End
| Compétence | Preuve | ✓ |
|---|---|:---:|
| Base de données relationnelle | `schema.sql` (UUID, FK, Cascade) | ✅ |
| API sécurisée | Express + JWT + Helmet + Rate Limiting | ✅ |
| Table Many-to-Many | `trip_collaborators` avec PK composée | ✅ |
| Tolérance aux pannes | Mode Survie + Cascade de fallbacks IA | ✅ |

---

## 💡 ARGUMENTS DÉFENSE ORALE

**Q : "Pourquoi Supabase ?"**
> *"C'est un hébergeur pour PostgreSQL. J'ai conçu le schéma en SQL brut (`schema.sql`) avec les FK, UUID et cascades. Supabase = disponibilité, comme un MySQL hébergé."*

**Q : "Vous avez testé votre application ?"**
> *"Oui : tests unitaires Vitest pour le parsing IA, et une suite CLI (style Holberton) qui valide chaque endpoint en ligne de commande avec `node tests/test_api_v1.js`."*

**Q : "Et si l'API IA tombe pendant la démo ?"**
> *"3 niveaux de résilience : cascade sur 13 modèles OpenRouter → si tout échoue, Mode Survie avec données pré-générées → la démo ne se bloque jamais."*

**Q : "React depuis longtemps ?"**
> *"React est une nouveauté de ce projet. Mon socle est le Vanilla JS + SQL (HBnB, Holberton). J'ai choisi React car la complexité de l'état (chat, résultats, auth) aurait été ingérable en Vanilla."*

---

## 📁 STRUCTURE DOC SIMPLIFIÉE

```
📁 tripgenie/
├── MASTER_PLAN.md              ← CE FICHIER (référence unique, boussole)
├── Dossier_Professionnel_V1.md ← Document de soutenance (20-30 pages)
├── README.md                   ← Présentation GitHub publique
├── DEPLOY.md                   ← Guide technique de déploiement
└── docs/
    ├── TRIPGENIE_EXPLICATION_DETAILLEE.md  ← "Comment ça marche" (vulgarisé)
    └── TRIPGENIE_TECHNICAL_REVIEW.md      ← Revue technique approfondie

⚠️ ARCHIVES (ne plus modifier) :
HBTN_ETAPE_1_RAPPORT.md, DPJ_TripGenie_Proposition.md,
SECURITY_OVERVIEW.md, TECH_STACK.md, RNCP_CONFORMITE_CHECKLIST.md
```
