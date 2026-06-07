# TripGenie — Script Oral RNCP5 DWWM (30 min)

> **Mis à jour : juin 2026 — branche feat/postgres-rls**
> **Mode d'emploi :** Lis à voix haute plusieurs fois. Les parties [comme ça] sont des indications de posture.

---

## PARTIE 1 — INTRODUCTION & ACCROCHE (2-3 min)

"Bonjour, je vais vous présenter TripGenie, mon projet de certification solo.

TripGenie, c'est une application web de génération de voyages personnalisés pilotée par intelligence artificielle. Le principe est simple : l'utilisateur décrit son voyage en langage naturel — destination, budget, style — et l'application lui génère un pack complet clé en main : vols, hôtels, itinéraire jour par jour, météo en temps réel et budget ventilé.

Le problème que je résous : les sites de voyage classiques comme Booking, Kayak ou TripAdvisor sont des agrégateurs. Ils retournent 300 résultats bruts et l'utilisateur doit choisir seul. TripGenie fait la synthèse à sa place via un pipeline IA orchestré et un algorithme de scoring multi-critères adapté au style de voyage.

J'ai identifié trois profils utilisateurs principaux :
- Sophie, cadre marketing parisienne, qui veut voyager en mode luxe sans passer des heures à planifier
- Lucas, étudiant avec 500€ de budget max, qui cherche des adresses authentiques et gratuites
- Maxime, développeur freelance qui organise des week-ends entre amis en mode party

Ces trois personas correspondent directement aux modes de voyage implémentés."

---

## PARTIE 2 — DÉMONSTRATION / PARCOURS UTILISATEUR (4-5 min)

"Je vais vous décrire le parcours utilisateur de A à Z.

L'utilisateur arrive sur la page d'accueil. Un chatbot conversationnel lui pose des questions en langage naturel : où veux-tu aller, quel budget, combien de personnes, quelles dates. En coulisse, un LLM extrait les informations structurées depuis le texte libre via POST /api/ai/onboarding.

L'application suggère ensuite 3 destinations scorées via POST /api/ai/destinations. L'utilisateur choisit, et démarre le pipeline de génération.

La génération dure en moyenne 15 à 30 secondes. À la fin, l'utilisateur reçoit un pack complet : vols avec compagnies et prix, hôtels avec étoiles et tarifs, restaurants réels (Foursquare), événements locaux (PredictHQ), météo actuelle (Open-Meteo), et un score de qualité entre 0 et 1.

Si toutes les APIs IA sont indisponibles, un bandeau orange s'affiche : 'Données de démonstration — les services IA sont temporairement indisponibles'. La transparence envers l'utilisateur est intentionnelle.

Si l'utilisateur est connecté, le pack est automatiquement sauvegardé. Il peut ensuite le retrouver dans 'Mes voyages' et le modifier via le chat conversationnel.

Il y a aussi une fonctionnalité collaborative. Maxime génère son week-end à Barcelone, partage le lien. Chaque ami voit le pack et vote sans créer de compte. La route GET /api/trips/share/:id est publique via une fonction PostgreSQL SECURITY DEFINER — elle n'expose aucune donnée utilisateur. À l'inverse, GET /api/trips est protégée par requireAuth. La distinction public/protégé est réfléchie route par route."

---

## PARTIE 3 — ARCHITECTURE TECHNIQUE (6-7 min)

"Je vais maintenant vous expliquer comment ça marche techniquement.

### Architecture 3 couches

TripGenie suit une architecture client-serveur en 3 couches séparées.

La couche présentation : React 18 avec Vite. Pour l'état global : Zustand — beaucoup plus simple que Redux. Pour les requêtes HTTP et le cache : React Query v5.

La couche logique métier : Node.js avec Express 4 en TypeScript strict. La validation des inputs est faite avec Zod v4 — schémas déclaratifs, types TypeScript inférés depuis les schémas.

La couche persistance : PostgreSQL hébergé sur Supabase, accès via le **driver natif `pg`** (node-postgres). J'utilise Supabase uniquement comme hébergeur PostgreSQL — ni Supabase Auth, ni leur API PostgREST. Je gère moi-même le RLS.

### Stack Backend — points clés

**`pg` natif et pas d'ORM** — Le driver `pg` donne un contrôle total sur les transactions. C'est ce qui m'a permis d'implémenter un RLS PostgreSQL maison — impossible proprement avec Prisma. Le code SQL est paramétré (`$1`, `$2`...) — zéro injection possible.

**cookie-parser** — Middleware qui parse les cookies HTTP. Sans lui, `req.cookies` est undefined. C'est ce qui permet à mon middleware auth de lire `req.cookies.tg_token`.

**Morgan** — Logger HTTP. Méthode, route, status code, temps de réponse. Couleurs selon le status en mode dev.

**TypeScript strict** — A détecté plusieurs bugs dans du code qui tournait sans erreur visible : accès à des propriétés inexistantes sur des objets retournés par l'IA.

Côté sécurité middleware : Helmet pour les headers HTTP. CORS avec whitelist explicite. express-rate-limit global et par route.

**6 tables PostgreSQL** : users, trips, packs, trip_votes, user_preferences, trip_collaborators. Conçues manuellement, pas d'ORM.

**Services externes** : Gemini 2.0 Flash comme LLM principal, Claude Haiku en secondaire, OpenRouter en dernier recours. Tavily pour la recherche web temps réel. PredictHQ pour les événements structurés. Foursquare pour les restaurants (1000/jour gratuit), Yelp en fallback. **Open-Meteo pour la météo — sans clé API**. Unsplash via un proxy backend."

---

## PARTIE 4 — LE PIPELINE IA ORCHESTRÉ (5-6 min)

"C'est le cœur technique du projet.

TripGenie repose sur un **pipeline IA orchestré côté serveur**. Ce n'est pas un agent autonome. Un agent autonome décide lui-même quels outils appeler et dans quel ordre. Ici, les étapes sont prédéfinies et s'enchaînent toujours dans le même ordre.

**Étape 1 — Validation Zod.** Destination, budget, mode, dates validés avant de toucher à quoi que ce soit.

**Étape 2 — Recherche web parallèle avec Promise.allSettled :**
- smartFlightSearch via Tavily : vols réels
- smartEventsSearch via PredictHQ → Tavily fallback : événements
- smartHotelSearch via Tavily : hôtels
- getRealWeather via Open-Meteo (sans clé API)
- getDestinationPhoto via Unsplash
- foursquareSearch → yelpSearch fallback : restaurants

J'ai utilisé Promise.allSettled et non Promise.all. Si l'API météo est en panne, toute la génération ne s'arrête pas — le pack est généré avec les données disponibles.

**Étape 3 — assemblePack.** Ici j'ai refactorisé une fonction de 330 lignes en **6 fonctions pures testables** :
- `calcNights()` — calcul du nombre de nuits
- `buildPackPrompt()` — construction du prompt LLM adapté au mode
- `callAI()` — cascade Gemini → Claude → OpenRouter → Mocks
- `parsePackResponse()` — parsing JSON avec 5 stratégies de récupération
- `mapFlights()` + `mapActivities()` — mapping vers les types Pack
- `calcBudgetBreakdown()` — répartition selon BUDGET_RATIOS

**Étape 4 — scorepack.** Algorithme de scoring déterministe. Zéro IA.

**Étape 5 — Sauvegarde transactionnelle.** Si l'utilisateur est connecté : INSERT trip + pack dans une seule transaction `withUser()`. Si le pack échoue, ROLLBACK — jamais de trip orphelin.

**Étape 6 — Réponse JSON.** { pack, score, trip_id, isMock? }

La seule partie vraiment agentique : POST /api/ai/chat. Le LLM reçoit le pack actuel + le message et décide librement quoi modifier."

---

## PARTIE 5 — ALGORITHME DE SCORING (3 min)

"L'algorithme de scoring est entièrement déterministe — aucun LLM.

Score entre 0 et 1, pondération différente selon le mode :

| Mode | Hôtel | Prix | Événements | Activités | Vol | Calme |
|------|-------|------|------------|-----------|-----|-------|
| luxury | 40% | 10% | — | 30% | 20% | — |
| party | 20% | 30% | 40% | — | 10% | — |
| student | 15% | 50% | 10% | 25%* | — | — |
| group | 35% | 20% | — | 30% | 15% | — |
| relax | 30% | 10% | — | 25% | — | 35% |

*activités gratuites uniquement

Exemple en mode luxury : l'hôtel pèse 40%. Un 5 étoiles donne le score maximal. Le prix ne pèse que 10% — le budget n'est pas pénalisant.

Chaque critère est normalisé entre 0 et 1 via `normalise(value, min, max)` avant d'être combiné."

---

## PARTIE 6 — AUTHENTIFICATION JWT (3 min)

"L'authentification est entièrement custom — je n'utilise pas Supabase Auth.

Flux signup : Zod valide email/password → `auth_create_user($1,$2,$3)` (fonction SECURITY DEFINER) → bcrypt.genSalt(10) + bcrypt.hash → jwt.sign 7j → cookie httpOnly.

Pourquoi httpOnly et pas localStorage ? localStorage est accessible via JavaScript — XSS peut voler le token. Cookie httpOnly : inaccessible depuis JS navigateur. token ne peut pas être volé même en cas d'injection.

Cookie avec sameSite strict (protection CSRF) et secure en production.

Deux middlewares : requireAuth bloque si token absent/invalide (401). optionalAuth ne bloque jamais — utilisé sur /api/ai pour sauvegarder le pack si connecté.

Anti-énumération au login : même message si email inconnu ou mauvais mdp — impossible de savoir quels emails existent."

---

## PARTIE 7 — SÉCURITÉ GLOBALE (2 min)

"J'ai adressé 13 vecteurs d'attaque :

- Vol de token JWT → cookie httpOnly + sameSite strict
- XSS → token inaccessible JS, Helmet CSP
- CSRF → sameSite strict
- Exposition de clé API → proxy backend Unsplash, variables d'env serveur
- Spam / DDoS → rate-limit 10/h/IP sur IA, 10/15min/IP sur auth
- Injection SQL → requêtes paramétrées `$1, $2...` partout via `pg`
- Injection de colonnes SQL → allowlist de colonnes sur PUT/UPSERT
- Inputs malveillants → Zod sur tous les endpoints
- IDOR → 404 si ressource non possédée (pas 403 qui confirmerait l'existence)
- Accès inter-utilisateurs → **double barrière** : WHERE user_id=$1 + RLS PostgreSQL
- Injection de prompt → sanitizeInput() 300 chars + validation current_pack 50ko
- Headers HTTP dangereux → Helmet
- Démarrage sans JWT_SECRET → fail-fast au boot (throw si absent)"

---

## PARTIE 8 — BASE DE DONNÉES ET RLS (3 min)

"Le schéma PostgreSQL comprend 6 tables conçues manuellement.

Pourquoi JSONB pour pack_data ? Le pack varie selon le mode : un pack party a des clubs, un pack luxury a des yachts. JSONB stocke la structure complète flexible + les métadonnées en colonnes typées.

**Le point le plus fort du projet : le RLS 'maison'.**

Le RLS Supabase natif ne fonctionnait pas — les policies utilisaient `auth.uid()` (Supabase Auth qu'on n'utilise pas), et la connexion via SERVICE_KEY a l'attribut BYPASSRLS — le RLS était ignoré.

J'ai recréé un RLS que je gère moi-même :
1. Rôle PostgreSQL dédié `tripgenie_app` SANS BYPASSRLS
2. `withUser(userId, fn)` ouvre une transaction et pose `set_config('app.current_user_id', userId, true)`
3. Les policies PostgreSQL lisent `current_setting('app.current_user_id')` pour filtrer
4. **Fail-closed** : sans variable posée → aucune ligne renvoyée

Pourquoi `set_config` et pas `SET LOCAL` ? SET LOCAL n'accepte pas de paramètre lié `$1` — il faudrait concaténer l'UUID (risque injection). `set_config` est transaction-local — meurt au COMMIT/ROLLBACK, ne fuite pas vers les autres connexions du pool.

J'ai **deux barrières** : filtre applicatif `WHERE user_id = $1` ET RLS PostgreSQL. Défense en profondeur."

---

## PARTIE 9 — TESTS (2 min)

"J'ai **254 tests automatisés en 15 fichiers**, qui s'exécutent en 2.2 secondes.

Organisation en 4 couches :
- Unit (27 tests) : scoring, fonctions pures de pack.ts — sans I/O
- Services (42 tests) : Foursquare, Yelp, PredictHQ — fetch mocké
- Sécurité (52 tests) : JWT (expiration, alg:none attack, IDOR), inscription, connexion, Zod
- Intégration (133 tests) : pipeline complet via Supertest HTTP

Tous les services externes sont mockés : LLM, pg/withUser, Tavily, Open-Meteo, rate limiters. Pourquoi ? Déterminisme, vitesse, coût.

Honnêteté sur les limites : `vi.mock('../server/db/pg.js')` remplace `withUser` par un faux client. Les tests prouvent que la route appelle la bonne requête SQL, pas que PostgreSQL refuse l'accès inter-utilisateurs. La vraie preuve d'isolation est `scripts/test-rls.ts` qui tourne contre la vraie base."

---

## PARTIE 10 — CI/CD ET DÉPLOIEMENT (1-2 min)

"CI/CD en deux parties :

**CI (GitHub Actions)** : à chaque push sur feat/postgres-rls ou main, une machine Ubuntu s'allume, lance `npm ci`, `npx tsc --noEmit`, `npm run test:all` (254 tests). Si tout est vert → job build compile le serveur et le client React.

**CD (Render)** : héberge l'app 24/7. Quand on merge vers main, Render détecte le commit, exécute `npm install && npx tsc && npm run client:build` puis `npm start`. L'app tourne sur https://tripgenie.onrender.com.

La différence CI/CD : CI = machine temporaire qui vérifie. CD = serveur permanent qui fait tourner."

---

## PARTIE 11 — FLUX DES FICHIERS (2-3 min)

> Réponse à : *"Décris ce qui se passe quand l'utilisateur clique sur Générer."*

```
Home.tsx → lib/api.ts → POST /api/ai/generate
  → index.ts (cookie-parser, Morgan, Helmet, CORS)
  → middleware/limiter.ts (rate limit IA : 10/h)
  → middleware/auth.ts (optionalAuth : décode JWT si présent)
  → routes/ai.ts (validation Zod)
  → Promise.allSettled([smartFlightSearch, smartEventsSearch, smartHotelSearch])
  → foursquareSearch() → yelpSearch() fallback
  → getRealWeather() (Open-Meteo)
  → getDestinationPhoto() (Unsplash proxy)
  → services/claude/pack.ts : assemblePack()
      calcNights() → buildPackPrompt() → callAI() → parsePackResponse()
      Gemini → Claude → OpenRouter → Mocks
      mapFlights() + mapActivities() + calcBudgetBreakdown()
  → services/scoring.ts : scorepack() → score 0-1
  → db/pg.ts : withUser() → INSERT trip + pack (1 transaction RLS)
  → res.json({ pack, score, trip_id, isMock? })
→ lib/api.ts reçoit la réponse
→ store/index.ts met à jour l'état Zustand
→ PackResults.tsx affiche le pack (bandeau orange si isMock)
```

**Fichiers clés :**
- `server/index.ts` — point d'entrée, fail-fast JWT_SECRET, montage routes + Swagger
- `server/routes/ai.ts` — orchestration pipeline
- `server/services/claude/pack.ts` — 6 fonctions pures + assemblePack
- `server/services/claude/core.ts` — callAI() cascade LLM + parseJSON() 5 stratégies
- `server/db/pg.ts` — pool pg natif, query(), withUser() RLS
- `server/docs/openapi.ts` — spec OpenAPI 3.0.3 (27 endpoints, /api/docs)

---

## QUESTIONS JURY — RÉPONSES PRÉPARÉES

**"Pourquoi JavaScript côté serveur et pas Python/Flask ?"**
Full-stack JS = un seul langage, un seul runtime, un seul déploiement.

**"Pourquoi pas un ORM ?"**
Le driver `pg` natif donne un contrôle total sur les transactions — indispensable pour le RLS avec `set_config` transaction-local. Prisma ne sait pas faire ça proprement.

**"C'est quoi un pipeline IA orchestré ?"**
Étapes prédéfinies dans un ordre fixe. Différent d'un agent autonome qui choisit ses outils. La seule partie agentique : le chat de modification.

**"Pourquoi Promise.allSettled ?"**
Promise.all s'arrête si une seule promesse échoue. allSettled continue avec les données disponibles.

**"Pourquoi httpOnly ?"**
localStorage accessible via JS → vol par XSS. Cookie httpOnly inaccessible depuis le navigateur.

**"Votre RLS est activé ?"**
Oui — RLS maison. Les policies Supabase utilisaient auth.uid() qu'on n'utilise pas, et la SERVICE_KEY a BYPASSRLS. J'ai créé un rôle sans BYPASSRLS + variable de session transaction-locale via withUser(). Fail-closed : sans contexte, zéro ligne renvoyée.

**"Pourquoi set_config et pas SET LOCAL ?"**
SET LOCAL n'accepte pas de paramètre lié $1 → injection SQL possible. set_config est transaction-local — meurt au COMMIT/ROLLBACK.

**"Vos tests prouvent que le RLS isole ?"**
Honnêtement : vi.mock remplace withUser. Les tests prouvent la plomberie HTTP, pas l'isolation BDD. La vraie preuve : scripts/test-rls.ts contre la vraie base.

**"Pourquoi Vitest ?"**
Natif ESM, compatible Vite/ES modules. Jest nécessiterait une transpilation supplémentaire.

**"Ton code est en .js ou .ts ?"**
Tout TypeScript strict côté serveur (target ES2022, NodeNext). Vite transpile automatiquement côté client. En runtime c'est du JavaScript pur.

---

## FORMULATIONS CLÉS À RETENIR

- *"TripGenie repose sur un pipeline IA orchestré côté serveur, avec une composante conversationnelle agentique pour la modification post-génération."*
- *"Promise.allSettled garantit que la panne d'un service externe ne bloque pas toute la génération."*
- *"Le scoring est déterministe — aucun LLM. Même entrée = même sortie. Testable unitairement."*
- *"Le cookie httpOnly est inaccessible depuis JavaScript — immunisé contre le XSS."*
- *"Le RLS est actif — rôle sans BYPASSRLS, variable de session transaction-locale, fail-closed par défaut."*
- *"254 tests en 15 fichiers, 2.2 secondes — tous les services externes sont mockés."*
- *"assemblePack était une god function de 330 lignes — refactorisée en 6 fonctions pures testables."*

---

## TIMING INDICATIF

| Section | Durée |
|---|---|
| Introduction + accroche | 2-3 min |
| Parcours utilisateur / démo | 4-5 min |
| Architecture 3 couches + stack | 6-7 min |
| Pipeline IA orchestré | 5-6 min |
| Scoring | 3 min |
| Auth JWT | 3 min |
| Sécurité | 2 min |
| BDD + RLS | 3 min |
| Tests | 2 min |
| CI/CD + déploiement | 1-2 min |
| **Total présentation** | **~30 min** |
| Questions jury | 5-10 min |
