# 🔍 TripGenie — Débrief approfondi RNCP5 DWWM
> Croisement entre le **référentiel officiel (REAC/REV2 v04 2023)** et l'état réel du code.
> Objectif : repérer ce qui **manque**, ce qui **va poser problème au jury**, et le **plan d'action**.

---

## 0. Ce que le jury attend (rappel des règles officielles)

### Format du dossier projet
- **30 à 50 pages** (hors page de garde, sommaire, annexes), schémas compris.
- **Annexes : 30 pages max.**
- Plan imposé pour un **projet de formation** (ton cas) :
  1. Liste des compétences mises en œuvre
  2. **Expression des besoins** (objectifs + limites)
  3. **Environnement technique**
  4. **Réalisations** mettant en œuvre les compétences

### Les 8 compétences à couvrir (obligatoire)
**Activité 1 — Front-end :**
1. Installer et configurer l'environnement de travail
2. **Maquetter** des interfaces utilisateur
3. **Réaliser** des interfaces statiques
4. **Développer** la partie dynamique des interfaces

**Activité 2 — Back-end :**
5. **Mettre en place une base de données relationnelle**
6. **Développer des composants d'accès aux données (SQL et NoSQL)**
7. **Développer des composants métier côté serveur**
8. **Documenter le déploiement**

---

## 1. Croisement compétence par compétence

| # | Compétence | État TripGenie | Verdict |
|---|------------|----------------|---------|
| 1 | Installer/configurer environnement | Vite, npm, **Docker** (conteneur Postgres ✅ coche le critère "conteneurs"), Git, ESLint, `.env` | ✅ **Fort** |
| 2 | **Maquetter** les interfaces | ❌ Aucune maquette Figma, aucun schéma d'enchaînement | 🔴 **Manquant** |
| 3 | Réaliser interfaces statiques | React + Tailwind, responsive, `alt` sur images | ✅ OK (voir nuances SEO/RGAA) |
| 4 | Développer partie dynamique | React (state, fetch, chat), tests | ✅ **Fort** |
| 5 | Base de données relationnelle | 6 tables, relations, FK cascade, **Prisma migrate** | ✅ **Fort** (MCD/MPD à formaliser) |
| 6 | Composants d'accès **SQL et NoSQL** | SQL via Prisma ✅ — **NoSQL = JSONB seulement** | 🟠 **À défendre** |
| 7 | Composants métier côté serveur | Routes + services (pipeline IA, scoring), validation Zod | ✅ **Fort** |
| 8 | Documenter le déploiement | `render.yaml` existe, **mais pas de doc rédigée** | 🟠 **À produire** |

---

## 2. 🔴 Points qui VONT poser problème (par ordre de gravité)

### 2.1 — Les MAQUETTES manquent (compétence n°2, obligatoire)
**Le problème :** la compétence « Maquetter des interfaces utilisateur » est évaluée. Le dossier
validé d'Edouard a une section dédiée : *« 5.1.1 Présentation de maquettes »* + *« 5.1.2 Schéma
de l'enchaînement des maquettes »*. TripGenie n'a aucune maquette formelle.

**Ce que le jury veut voir :**
- au moins **2-3 maquettes** (Figma, Penpot ou même Excalidraw) — version desktop ET mobile
- un **schéma d'enchaînement** (zoning / wireflow) reliant les écrans

**Action :** créer a posteriori les maquettes des écrans clés (Accueil/chat, Résultats du pack,
Mes voyages) dans **Figma** (gratuit). 2-3h de travail. *Astuce : tu peux « maquetter » en
reproduisant tes écrans existants — c'est accepté tant que la démarche de conception est montrée.*

---

### 2.2 — NoSQL : la compétence n°6 dit « SQL **et** NoSQL »
**Le problème :** le référentiel exige des composants d'accès **SQL et NoSQL**. TripGenie n'utilise
que PostgreSQL.

**3 façons de répondre (de la plus simple à la plus solide) :**
1. **Défendre le JSONB** (le plus rapide) : « Mes colonnes `pack_data` sont du **stockage document
   (NoSQL-like)** : du JSON semi-structuré interrogé dans une base relationnelle. PostgreSQL fait
   le pont SQL/NoSQL. » → défendable mais un jury strict peut tiquer.
2. **Ajouter une vraie brique NoSQL** (le plus solide) : un **cache Redis** sur les destinations/photos,
   OU stocker les logs de génération dans **MongoDB**. ~Une demi-journée. Coche le critère sans ambiguïté.
3. **Note rassurante :** le dossier validé d'Edouard liste seulement *« composants d'accès aux
   données SQL »* (sans NoSQL) et a été **validé**. Donc en pratique c'est souvent toléré — mais
   ne mise pas dessus, prépare au moins l'argument JSONB.

> **Recommandation :** option 1 (argument JSONB) pour le dossier + **mentionner Redis comme
> évolution** ; option 2 si tu as le temps, pour être blindé.

---

### 2.3 — Un TEST échoue (flaky) 🔴 concret
**Le problème :** `tests/golden_path.test.ts > POST /api/ai/generate (flux nominal)` **timeout à
5000ms** par intermittence. Cause : la route `/generate` appelle **Foursquare/Yelp/PredictHQ** qui
ne sont **pas mockés** dans ce fichier → vrais appels réseau → lenteur aléatoire.

**Pourquoi c'est grave pour le jury :** « 282 tests verts » est un argument fort. Un test rouge le
jour J casse l'argument et fait mauvais effet.

**Correctif (2 options) :**
- **Mocker** foursquare/yelp/predictHQ dans `golden_path.test.ts` (propre), OU
- augmenter le `testTimeout` pour ce test (rapide mais cache le vrai souci).

> Je peux appliquer le correctif propre tout de suite si tu veux.

---

### 2.4 — Code commenté en FRANÇAIS (critère anglais B1)
**Le problème :** plusieurs critères exigent *« le code est documenté, y compris en anglais
(niveau B1) »*. Ton code est commenté en français (116 lignes repérées).

**Action minimale :** documenter **au moins un module représentatif en anglais** (ex. `scoring.ts`
ou `ai.ts`) avec des commentaires/JSDoc anglais, + nommer fonctions/variables en anglais (déjà
souvent le cas). Pas besoin de tout traduire — montrer la **capacité**.

---

### 2.5 — Deux branches divergentes (risque de confusion)
**Le problème :** `mvp-DEMODAY` a **3 commits d'avance** sur `feat/postgres-rls` (chat fixes,
migration Prisma, retrait PDF). Le jour du jury, présenter la mauvaise branche = bugs ou features
manquantes.

**Action :** **décide d'UNE branche de présentation** (recommandé : `mvp-DEMODAY`) et assure-toi
qu'elle a TOUT. Reporte les correctifs non-Prisma (chat, PDF) sur `postgres-rls` via `cherry-pick`
si tu veux garder les deux à jour (commandes en §6).

---

## 3. 🟠 Points à renforcer (importants mais pas bloquants)

| Sujet | État | À faire pour le dossier |
|-------|------|--------------------------|
| **MCD / MPD** (Merise) | ERD mermaid existant | Formaliser un **MCD** (entités/associations) + **MPD** (tables/types) + script `CREATE TABLE` (la migration Prisma SQL sert de preuve) |
| **Jeu d'essai** | tests existants | Rédiger **le jeu d'essai de la fonctionnalité la plus représentative** (`/generate`) : entrées → sorties attendues → sorties obtenues → analyse des écarts |
| **Veille sécurité** | informelle | Section « veille » : sources suivies (OWASP, ANSSI, Snyk), 1-2 vulnérabilités étudiées (ex. XSS, injection) et comment tu t'en protèges |
| **Accessibilité (RGAA)** | 5 aria, alt sur images ✅ | Renforcer : labels de formulaires, contraste, navigation clavier complète. Documenter dans une sous-section |
| **Éco-conception** | implicite (purge CSS, lazy) | Mentionner : build optimisé, images compressées (webp), requêtes parallèles, pas de polling inutile |
| **SEO / référencement** | SPA authentifiée | Cadrer : « le critère dépend du public ; mon app est authentifiée donc le SEO n'apporte rien — j'ai néanmoins des balises meta de base ». Honnête et défendable |
| **Déploiement documenté** | `render.yaml` | Rédiger la **procédure** (build, variables d'env, migration `prisma migrate deploy`, start) + commenter le script |
| **RGPD** | données perso (email) | Mentionner : mot de passe haché, suppression de compte (cascade), pas de revente, finalité claire |

---

## 4. ✅ Tes points FORTS (à mettre en avant)

1. **Sécurité solide** : JWT httpOnly, bcrypt, Zod partout, rate-limit, isolation `user_id`
   **prouvée par un test** (User B → 404), tests d'attaque (alg:none, IDOR, token expiré). → coche
   massivement « sécurisée » du titre.
2. **Conteneurisation Docker** → coche explicitement le critère « les conteneurs implémentent les
   services requis » (compétence n°1).
3. **ORM Prisma + migrations versionnées** → réponse moderne et propre à la compétence n°5.
4. **Pipeline IA + dégradation gracieuse** (`allSettled`, fallbacks) → démarche de résolution de
   problème + robustesse (compétences transversales).
5. **281/282 tests** (une fois le flaky corrigé : 282) → qualité logicielle démontrable.
6. **Architecture 3 couches claire** → facile à expliquer, coche la séparation des responsabilités.

---

## 5. Plan d'action priorisé (avant le jury)

### 🔴 Priorité 1 — Bloquants (à faire absolument)
- [ ] **Corriger le test flaky** golden_path (mocker fsq/yelp/predictHQ)
- [ ] **Créer 2-3 maquettes** Figma + schéma d'enchaînement
- [ ] **Écrire LE dossier projet** (30-50 p) au format imposé — structure en §7
- [ ] **Choisir la branche de présentation** et la compléter

### 🟠 Priorité 2 — Importants
- [ ] Préparer l'**argument NoSQL** (JSONB) + éventuellement Redis
- [ ] Documenter **un module en anglais** (B1)
- [ ] Formaliser **MCD/MPD** + script de création
- [ ] Rédiger le **jeu d'essai** de `/generate`
- [ ] Section **veille sécurité** + vulnérabilités

### 🟢 Priorité 3 — Bonus (points faciles)
- [ ] Procédure de **déploiement** rédigée
- [ ] Paragraphes **RGPD**, **éco-conception**, **RGAA**

---

## 6. Stratégie Git (mettre les branches au propre)

Tu as committé sur `mvp-DEMODAY`. Pour reporter les correctifs **non-Prisma** sur `postgres-rls` :

```bash
# Pousser d'abord mvp-DEMODAY (ta branche de démo)
git push --set-upstream origin mvp-DEMODAY

# Reporter le commit "chat fixes" sur postgres-rls (il n'est pas Prisma-spécifique)
git checkout feat/postgres-rls
git cherry-pick 5a4ada7        # commit "refactoriser le questionnaire guidé"
# (le retrait PDF + smartSearch sont dans le gros commit Prisma 3ca9c75,
#  à réappliquer à la main si tu veux les avoir aussi sur postgres-rls)
git push
```

> **Conseil :** ne te disperse pas. Choisis **`mvp-DEMODAY` comme branche unique de présentation**.
> La branche `postgres-rls` devient un « bonus sécurité » que tu mentionnes à l'oral.

---

## 7. Structure recommandée du DOSSIER PROJET
> Calquée sur le dossier validé d'Edouard (ML-Explorer), adaptée à TripGenie.

```
1. Introduction (contexte perso, pourquoi ce projet)
2. Liste des compétences mises en œuvre
   2.1 Techniques (les 8 compétences DWWM)
   2.2 Transversales (agile, résolution de problème, veille)
3. Expression des besoins
   3.1 Contexte et objectif (le problème : agrégateurs vs synthèse)
   3.2 Besoins fonctionnels (auth, génération, sauvegarde, partage)
   3.3 Diagramme du cheminement de l'application (parcours utilisateur)
   3.4 Besoins non fonctionnels (sécurité, perf, accessibilité)
   3.5 Contraintes + critères de réussite
   3.6 Organisation / planning (les 6 sprints — voir doc 02)
4. Environnement technique
   4.1 Langages / frameworks / BDD (+ justifications)
   4.2 Outils de développement (VS Code, Git, Docker, Prisma Studio)
   4.3 Plateformes / services (Render, Gemini, Tavily, etc.)
5. Réalisations
   5.1 FRONT-END
       5.1.1 Maquettes (desktop + mobile)        ← À CRÉER
       5.1.2 Schéma d'enchaînement des maquettes  ← À CRÉER
       5.1.3 Captures d'écran (responsive)
       5.1.4 Init projet + dépendances + structure
       5.1.5 Composants + routes
       5.1.6 Responsive + accessibilité
       5.1.7 Tests front
   5.2 BACK-END
       5.2.1 Init + config Express
       5.2.2 Base de données (MCD, MPD, script)   ← À FORMALISER
       5.2.3 Routes + middlewares + extraits de code
       5.2.4 Composants d'accès données (SQL + JSONB/NoSQL)
       5.2.5 Composants métier (pipeline IA, scoring)
       5.2.6 Test de l'API
   5.3 SÉCURITÉ
       variables d'env, CORS, bcrypt, JWT httpOnly, Zod, isolation
   5.4 Tests (unitaires, sécurité, intégration — 282)
   5.5 Jeu d'essai de la fonctionnalité représentative  ← À RÉDIGER
   5.6 Veille + vulnérabilités de sécurité              ← À RÉDIGER
   5.7 Déploiement (procédure + scripts)                ← À RÉDIGER
6. Conclusion (bilan, difficultés, améliorations)
7. Annexes (schémas, captures supplémentaires)
```

---

## 8. Verdict global

**TripGenie est un projet largement au-dessus du niveau attendu sur le plan technique** (sécurité,
tests, ORM, IA, architecture). Les risques ne sont **pas dans le code** mais dans les **livrables
documentaires** exigés par le référentiel :

- ❌ **Maquettes** (le seul vrai trou de compétence)
- 🟠 **NoSQL** (à défendre ou compléter)
- 🟠 **Le dossier écrit** (30-50 p) reste à produire
- 🔴 **1 test à stabiliser**

> **En une phrase :** ton code dépasse les attentes ; concentre ton énergie sur les **maquettes**,
> le **dossier écrit** et la **correction du test flaky**, et tu seras en très bonne position.
