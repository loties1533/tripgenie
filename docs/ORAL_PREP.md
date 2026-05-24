# TripGenie — Script Oral RNCP5 DWWM (30 min)

> **Mode d'emploi :** Lis ce document à voix haute plusieurs fois. Ce n'est pas un texte à réciter mot pour mot — c'est une base pour que les idées deviennent naturelles. Les parties entre crochets [comme ça] sont des indications de posture, pas à dire.

---

## PARTIE 1 — INTRODUCTION & ACCROCHE (2-3 min)

"Bonjour, je vais vous présenter TripGenie, mon projet de certification solo.

TripGenie, c'est une application web de génération de voyages personnalisés pilotée par intelligence artificielle. Le principe est simple : l'utilisateur décrit son voyage en langage naturel — destination, budget, style — et l'application lui génère un pack complet clé en main : vols, hôtels, itinéraire jour par jour, météo en temps réel et budget ventilé.

Le problème que je résous : les sites de voyage classiques comme Booking, Kayak ou TripAdvisor sont des agrégateurs. Ils retournent 300 résultats bruts et l'utilisateur doit choisir seul. TripGenie fait la synthèse à sa place via un pipeline IA et un algorithme de scoring multi-critères adapté au style de voyage.

J'ai identifié trois profils utilisateurs principaux :
- Sophie, cadre marketing parisienne, qui veut voyager en mode luxe sans passer des heures à planifier
- Lucas, étudiant avec 500€ de budget max, qui cherche des adresses authentiques et gratuites
- Maxime, développeur freelance qui organise des week-ends entre amis en mode party

Ces trois personas correspondent directement aux modes de voyage que j'ai implémentés dans l'application."

---

## PARTIE 2 — DÉMONSTRATION / PARCOURS UTILISATEUR (4-5 min)

[Si tu as une démo live, la faire ici. Sinon décrire le flux]

"Je vais vous décrire le parcours utilisateur de A à Z.

L'utilisateur arrive sur la page d'accueil. Un chatbot conversationnel lui pose des questions en langage naturel : où veux-tu aller, quel budget, combien de personnes, quelles dates. En coulisse, c'est un LLM qui extrait les informations structurées depuis le texte libre — destination, budget, mode, durée — via l'endpoint POST /api/ai/onboarding.

Ensuite, l'application suggère 3 destinations scorées via POST /api/ai/destinations. L'utilisateur choisit, et là démarre le pipeline de génération.

La génération dure en moyenne 10 à 15 secondes. À la fin, l'utilisateur reçoit un pack complet : vols avec compagnies et prix, hôtels avec étoiles et tarifs, itinéraire jour par jour, activités, météo actuelle de la destination, et un score de qualité entre 0 et 1.

Si l'utilisateur est connecté, le pack est automatiquement sauvegardé en base. Il peut ensuite le retrouver dans 'Mes voyages' et le modifier via le chat conversationnel.

Il y a aussi une fonctionnalité collaborative. Maxime génère son week-end à Barcelone, il copie le lien de partage et l'envoie sur le WhatsApp du groupe. Chaque ami clique, voit le pack, vote pour ou contre les options — sans créer de compte. Maxime voit le consensus en temps réel.

Ce n'est pas un hasard que ça fonctionne sans compte : la route GET /api/trips/share/:id est publique, il n'y a pas de middleware d'authentification dessus. C'est une décision de conception assumée — le partage doit être accessible à n'importe qui avec le lien. Les votes sont anonymes par défaut. À l'inverse, GET /api/trips — la liste des voyages personnels — est protégée par requireAuth. La distinction public/protégé est réfléchie route par route."

---

## PARTIE 3 — ARCHITECTURE TECHNIQUE (6-7 min)

"Je vais maintenant vous expliquer comment ça marche techniquement.

### Architecture 3 couches

TripGenie suit une architecture client-serveur classique en 3 couches séparées.

La couche présentation, c'est le frontend en React 18 avec Vite. J'ai choisi React pour son écosystème mature et son virtual DOM. Vite parce qu'il est natif ESM et que son HMR est ultra-rapide en développement. Pour l'état global j'utilise Zustand — beaucoup plus simple que Redux, API minimaliste. Pour les requêtes HTTP et le cache, React Query v5 qui gère automatiquement les états loading, error et le cache des données.

La couche logique métier, c'est le backend Node.js avec Express 4. J'ai fait le choix du full-stack JavaScript pour avoir un seul langage du frontend au backend, un seul runtime, un seul déploiement. La validation des inputs est faite avec Zod v4 — schémas déclaratifs, messages d'erreur précis, TypeScript-ready.

La couche persistance, c'est PostgreSQL hébergé sur Supabase. J'utilise Supabase uniquement comme hébergeur PostgreSQL — ni Supabase Auth, ni le Row Level Security. La base de données est entièrement gérée côté applicatif.

### Stack technique complète — Frontend

**TypeScript** — J'ai migré le backend de JavaScript vers TypeScript en cours de projet. Ça a détecté 8 bugs dans du code qui tournait en production sans erreur visible : accès à des propriétés inexistantes sur des objets retournés par l'IA, mauvais types de retour dans le scoring. TypeScript ne ralentit pas l'exécution — c'est un outil de compilation uniquement. En runtime c'est du JavaScript pur.

**React Router v6** — Routage côté client, navigation sans rechargement de page. C'est ce qui fait que TripGenie est une SPA — Single Page Application. L'URL change mais le serveur ne ressert pas le HTML complet à chaque fois.

**Framer Motion** — Animations déclaratives. Les transitions entre les pages et les apparitions de cartes sont définies dans le JSX directement, pas dans des fichiers CSS séparés. Ça garde la logique d'animation au même endroit que le composant.

**Sonner** — Bibliothèque de toasts, les notifications non-bloquantes en bas de l'écran. "Pack généré avec succès", "Erreur de connexion". C'est du feedback utilisateur immédiat sans bloquer l'interface.

**Recharts** — Graphiques React pour le budget breakdown. L'utilisateur voit un camembert ventilé : vol / hôtel / activités / divers. Construit sur D3, wrappé en composants React.

**Leaflet** — Carte interactive pour afficher les activités géolocalisées sur la destination. Leaflet est open source, aucune clé API requise contrairement à Google Maps.

**Tailwind CSS** — Framework CSS utilitaire. Les classes sont directement dans le HTML : `className="flex items-center gap-4 bg-white rounded-xl"`. Pas de fichiers CSS séparés à maintenir. Le build final purge toutes les classes non utilisées — le CSS livré est minimal.

### Stack technique complète — Backend

**cookie-parser** — Middleware Express qui parse les cookies HTTP entrants. Sans lui, `req.cookies` est undefined. C'est ce qui permet à mon middleware auth de lire `req.cookies.tg_token` pour extraire le JWT.

**Morgan** — Logger HTTP. Il affiche chaque requête dans le terminal : méthode, route, status code, temps de réponse. En mode `dev`, les couleurs changent selon le status — vert pour 2xx, jaune pour 4xx, rouge pour 5xx. Indispensable en développement pour voir ce qui se passe.

**nodemon + tsx** — Outils de développement uniquement. nodemon redémarre le serveur automatiquement à chaque modification de fichier. tsx compile TypeScript à la volée sans étape de build. En production, c'est `tsc` qui compile et `node` qui exécute.

Côté sécurité middleware : Helmet pour les headers HTTP — X-Frame-Options, CSP, HSTS en un seul appel. CORS avec whitelist explicite. express-rate-limit global et par route.

Côté base de données : 6 tables PostgreSQL que j'ai conçues manuellement — users, trips, packs, trip_votes, user_preferences, trip_collaborators. Pas d'ORM. Le client Supabase JS génère des requêtes paramétrées sécurisées, c'est suffisant à mon échelle.

Côté IA et services externes : Google Gemini comme LLM principal, OpenRouter en fallback, Claude API en dernier recours. Tavily pour la recherche web temps réel — vols, hôtels, événements. OpenWeatherMap pour la météo. Unsplash via un proxy backend pour les photos de destination."

---

## PARTIE 4 — LE PIPELINE IA ORCHESTRÉ (5-6 min)

"C'est le cœur technique du projet, et je veux être précis sur ce point.

TripGenie repose sur un **pipeline IA orchestré côté serveur**. Ce n'est pas un agent autonome. La différence est importante : un agent autonome décide lui-même quels outils appeler et dans quel ordre. Ici, les étapes sont prédéfinies et s'enchaînent toujours dans le même ordre. C'est un pipeline fixe.

Le pipeline de génération sur POST /api/ai/generate se déroule en 6 étapes :

**Étape 1 — Validation Zod.** Destination, budget, mode, dates sont validés avant de toucher à quoi que ce soit.

**Étape 2 — Recherche web parallèle.** C'est là que j'ai fait un choix technique important. Je lance 5 recherches en parallèle avec Promise.allSettled :
- smartFlightSearch via Tavily pour les vols réels
- smartEventsSearch via Tavily pour les événements locaux
- smartHotelSearch via Tavily pour les hôtels
- getRealWeather via OpenWeatherMap
- getDestinationPhoto via Unsplash

J'ai utilisé Promise.allSettled et non Promise.all. La différence : Promise.all s'arrête si une seule promesse échoue. Si l'API météo est en panne, toute la génération s'arrête. Promise.allSettled attend toutes les promesses quelle que soit leur issue — le pack est généré avec les données disponibles, avec fallback IA si une source externe échoue. Il y a aussi un timeout global de 15 secondes sur ce bloc.

**Étape 3 — assemblePack.** Le LLM — Gemini en priorité — reçoit toutes les données réelles injectées dans son prompt et génère le pack JSON structuré. Le prompt engineering est adapté au mode : pour luxury, le prompt demande des expériences dignes d'un guide Condé Nast. Pour student, des adresses locales et des activités gratuites.

**Étape 4 — scorepack.** L'algorithme de scoring déterministe. Zéro IA à cette étape — c'est une fonction pure qui calcule un score entre 0 et 1 selon des poids définis par mode.

**Étape 5 — Sauvegarde conditionnelle.** Si l'utilisateur est connecté, INSERT dans trips avec le pack complet en JSONB.

**Étape 6 — Réponse JSON.** { pack, score, trip_id, flights_found, events_found }

La seule partie vraiment agentique du projet, c'est le chat de modification sur POST /api/ai/chat. Là, le LLM reçoit le pack actuel et le message de l'utilisateur, et décide librement quels éléments modifier — sans étapes prédéfinies. C'est lui qui choisit."

---

## PARTIE 5 — ALGORITHME DE SCORING (3 min)

"L'algorithme de scoring est entièrement déterministe — aucun LLM n'est impliqué.

Il calcule un score entre 0 et 1 basé sur 5 critères pondérés différemment selon le mode de voyage :

| Mode | Hôtel | Activités | Vols | Prix | Événements |
|------|-------|-----------|------|------|------------|
| luxury | 40% | 30% | 20% | 10% | — |
| party | 20% | — | 10% | 30% | 40% |
| student | 15% | 25% free | — | 50% | 10% |
| group | 35% | 30% | 15% | 20% | — |
| relax | 30% | 25% | — | 10% | — |

Exemple en mode luxury : l'hôtel pèse 40% du score. Un 5 étoiles donne le score maximal sur ce critère. Le prix ne pèse que 10% — le budget n'est pas pénalisant en mode luxe. Les événements ne comptent pas.

Le résultat retourné est un objet avec total et details : { total: 0.78, details: { vol: 0.82, hotel: 0.90, events: 0.30, activities: 0.75, prix: 0.50 } }"

---

## PARTIE 6 — AUTHENTIFICATION JWT (3 min)

"L'authentification est entièrement custom — je n'utilise pas Supabase Auth.

Le flux : l'utilisateur envoie son email et mot de passe. Côté serveur, bcryptjs.compare vérifie le mot de passe contre le hash en base. Si correct, jwt.sign crée un token signé avec JWT_SECRET, expiration 7 jours. Ce token est envoyé dans un cookie httpOnly.

Pourquoi httpOnly et pas localStorage ? localStorage est accessible via JavaScript. Une injection de script XSS peut voler le token. Un cookie httpOnly est inaccessible depuis JS navigateur — le token ne peut pas être volé même en cas d'injection.

Le cookie a aussi sameSite strict — protection CSRF — et secure en production — HTTPS uniquement.

J'ai deux middlewares d'authentification :
- requireAuth : bloque la requête si token absent ou invalide, retourne 401. Utilisé sur /api/trips.
- optionalAuth : ne bloque jamais. Si le token est valide, req.user est renseigné. Utilisé sur /api/ai pour sauvegarder le pack si l'utilisateur est connecté.

Le middleware supporte deux sources de token : le cookie httpOnly en production, et le header Authorization Bearer en fallback — ce qui permet à Supertest de tester sans navigateur."

---

## PARTIE 7 — SÉCURITÉ GLOBALE (2 min)

"J'ai adressé 8 vecteurs d'attaque :

- Vol de token JWT → cookie httpOnly + sameSite strict
- XSS → token inaccessible JS, Helmet headers
- CSRF → sameSite strict sur le cookie
- Exposition de clé API → proxy backend pour Unsplash, variables d'env serveur uniquement
- Spam / DDoS → express-rate-limit global 100 req/15min/IP, routes IA 10 req/heure/IP
- Injection SQL → client Supabase avec requêtes paramétrées
- Inputs malveillants → validation Zod sur tous les endpoints
- Accès données inter-utilisateurs → .eq('user_id', req.user.id) sur chaque requête SQL"

---

## PARTIE 8 — BASE DE DONNÉES (2 min)

"Le schéma PostgreSQL comprend 6 tables que j'ai conçues manuellement, MCD et MLD réalisés à la main.

La table centrale est trips. Elle contient les clés étrangères vers users, le champ mode qui détermine le scoring et le prompt engineering, pack_data en JSONB pour stocker le pack complet sérialisé, et score en NUMERIC entre 0 et 1.

Pourquoi JSONB ? Le pack voyage est une structure complexe et variable — vols, hôtels, itinéraire, activités — qui évolue à chaque génération. JSONB permet de stocker cette structure sans avoir à créer 15 tables normalisées pour chaque sous-élément. Et PostgreSQL permet des requêtes à l'intérieur du JSONB si nécessaire.

Point important sur la sécurité : le Row Level Security de Supabase ne fonctionne qu'avec Supabase Auth. Comme j'utilise un JWT custom, les policies RLS sont inactives. C'est un compromis documenté et assumé — la sécurité est appliquée au niveau applicatif avec .eq('user_id', req.user.id) sur chaque requête."

---

## PARTIE 9 — TESTS (2 min)

"J'ai 77 tests automatisés en 4 fichiers, qui s'exécutent en 0.4 secondes.

J'ai choisi Vitest plutôt que Jest parce que Vitest est natif ESM, compatible avec la configuration Vite et ES modules du projet. Jest nécessiterait une configuration de transpilation supplémentaire.

Les 4 fichiers :
- api.test.ts : 40 tests — toutes les routes HTTP, auth, trips, votes, rate limiting, CORS
- golden_path.test.ts : 15 tests — les flux critiques end-to-end, generate, chat, healthcheck
- scoring.test.ts : 14 tests — l'algorithme de scoring, tous les modes, edge cases
- middleware.test.ts : 8 tests — requireAuth et optionalAuth, tokens valides, expirés, malformés

Tous les services externes sont mockés : LLM, Supabase, Tavily, météo, rate limiters. Pourquoi mocker ? Déterminisme — un LLM varie à chaque appel, impossible d'écrire des assertions fiables. Vitesse — 0.4s avec mocks vs plusieurs minutes avec de vraies APIs. Coût — chaque appel LLM consomme des tokens."

---

## PARTIE 10 — DÉPLOIEMENT (1 min)

"Le déploiement est configuré sur Render via un fichier render.yaml déclaratif. Build : npm install && npm run build. Start : npm start. La branche de production est main, la branche de livraison finale est final. Le déploiement est prévu début juillet."

---

## PARTIE 11 — BILAN & APPRENTISSAGES (1-2 min)

"Ce projet m'a permis de mettre en pratique des concepts vus en formation dans un contexte réel :

La migration TypeScript a détecté 8 bugs dans du code qui tournait en production sans erreur visible — accès à des propriétés inexistantes, mauvais types de retour. Ça justifie le coût de la migration.

La gestion des APIs externes avec Promise.allSettled m'a appris que la robustesse d'un système, c'est sa capacité à fonctionner en mode dégradé — pas juste quand tout va bien.

Et l'algorithme de scoring m'a montré qu'on n'a pas toujours besoin d'IA pour produire de la valeur. Un algorithme déterministe bien pensé est plus rapide, plus prévisible, et plus testable qu'un LLM."

---

## PARTIE 12 — FLUX DES FICHIERS : COMMENT UNE REQUÊTE TRAVERSE L'APP (3-4 min)

> Cette section répond à la question jury : *"Décris-moi ce qui se passe côté code quand l'utilisateur clique sur Générer."*

### Côté frontend — de la page au serveur

```
client-react/src/pages/Home.jsx
  └─ appelle api.js → fetch POST /api/ai/generate { destination, mode, budget... }
       └─ avec credentials: 'include' pour envoyer le cookie automatiquement
```

`Home.jsx` est la page d'accueil. Elle gère le formulaire d'onboarding et appelle les fonctions centralisées dans `client-react/src/lib/api.js`. Toutes les requêtes HTTP partent de ce fichier unique — c'est le seul endroit qui connaît l'URL du backend.

L'état global (utilisateur connecté, trip courant) est dans `client-react/src/store/index.js` avec Zustand. Les composants lisent et écrivent dans ce store sans se passer des props manuellement.

### Côté backend — de la requête à la réponse

**1. `server/index.ts` — point d'entrée**
C'est ici que l'app Express est configurée. Il enregistre dans l'ordre : cookie-parser, Morgan, Helmet, CORS, les rate limiters globaux, puis toutes les routes. L'ordre est important — les middlewares s'exécutent dans l'ordre où ils sont déclarés.

**2. `server/routes/ai.ts` — routeur IA**
La requête arrive sur `POST /api/ai/generate`. Express la fait passer par le middleware `optionalAuth` qui tente de décoder le cookie JWT. Si l'utilisateur est connecté, `req.user` est renseigné. Sinon, ça continue quand même.

**3. `server/middleware/auth.ts` — middleware d'authentification**
Contient `requireAuth` et `optionalAuth`. Lit d'abord `req.cookies.tg_token`, puis `req.headers.authorization` en fallback. Vérifie la signature JWT avec `jwt.verify()`. En cas d'erreur, soit bloque (requireAuth) soit continue silencieusement (optionalAuth).

**4. `server/routes/ai.ts` — validation Zod**
Avant de faire quoi que ce soit, le schéma Zod valide tous les champs. Si `destination` est absent ou `budget` est négatif, on retourne immédiatement un 400 avec un message précis. Rien ne touche la base de données ni les APIs sans validation.

**5. `server/services/scoring.ts` + `server/services/claude/index.ts` — logique métier**
Le routeur délègue à des services. Il ne contient pas de logique métier — juste de l'orchestration. `assemblePack()` est dans `server/services/claude/pack.ts`. `scorepack()` est dans `server/services/scoring.ts`. Chaque fichier a une responsabilité unique.

**6. `server/services/claude/core.ts` — appel LLM multi-provider**
C'est ici que le fallback Gemini → OpenRouter → Claude est implémenté. `callAI()` essaie chaque provider dans l'ordre. Si Gemini retourne une erreur, il passe à OpenRouter. Cette logique est encapsulée ici — le reste de l'app appelle juste `callAI()` sans savoir quel LLM répond réellement.

**7. `server/db/supabase.ts` — client base de données**
Singleton. Exporté une fois, importé partout. Contient l'instance Supabase initialisée avec `SUPABASE_URL` et `SUPABASE_KEY` depuis les variables d'environnement. Jamais instancié deux fois.

**8. `server/lib/AppError.ts` — gestion des erreurs**
Toutes les erreurs passent par `next(new AppError(message, statusCode))`. Le handler global en bas de `index.ts` les intercepte et retourne `{ error: message }` avec le bon status HTTP. Ça évite les `try/catch` qui retournent `res.status(500)` partout dans le code.

### Résumé du flux complet

```
Home.jsx → api.js → POST /api/ai/generate
  → index.ts (cookie-parser, Morgan, Helmet, CORS)
  → limiter.js (rate limit IA)
  → auth.ts (optionalAuth : décode JWT si présent)
  → routes/ai.ts (validation Zod)
  → Promise.allSettled([smartSearch, météo, photo])
  → services/claude/pack.ts (assemblePack → callAI → Gemini)
  → services/scoring.ts (scorepack → score 0-1)
  → db/supabase.ts (INSERT trips si connecté)
  → res.json({ pack, score, trip_id })
→ api.js reçoit la réponse
→ store/index.js met à jour l'état global
→ Home.jsx re-render avec le pack affiché
```

---

## QUESTIONS JURY — RÉPONSES PRÉPARÉES

### Architecture & Choix techniques

**"Pourquoi JavaScript côté serveur et pas Python/Flask ?"**
Full-stack JS = un seul langage, un seul runtime, une seule configuration de tests, un seul déploiement. Flask aurait nécessité un déploiement séparé et une communication inter-services supplémentaire.

**"Pourquoi pas un ORM comme Prisma ?"**
Le client Supabase JS génère des requêtes paramétrées sécurisées. Prisma aurait ajouté de la complexité — migrations déclaratives, génération de client, schéma Prisma en plus du schéma SQL — sans bénéfice réel à mon échelle.

**"C'est quoi un pipeline IA orchestré ?"**
Un pipeline où les étapes sont prédéfinies et s'enchaînent dans un ordre fixe. Différent d'un agent autonome qui décide lui-même. Chez moi : validation → recherche web parallèle → assemblePack → scorepack → sauvegarde. Toujours dans cet ordre, toujours ces étapes.

**"Pourquoi Promise.allSettled et pas Promise.all ?"**
Promise.all échoue si une seule promesse échoue. Si l'API météo est en panne, toute la génération s'arrête. Promise.allSettled attend toutes les promesses quelle que soit leur issue — le pack est généré avec les données disponibles.

### Sécurité

**"Pourquoi httpOnly et pas localStorage ?"**
localStorage est accessible via JavaScript — une injection XSS peut voler le token. Un cookie httpOnly est inaccessible depuis le navigateur JS. Le token ne peut pas être volé même en cas d'injection de script.

**"Comment tu protèges les données utilisateurs ?"**
Trois niveaux : JWT en cookie httpOnly (vol de token impossible par XSS), validation Zod sur chaque input (injection impossible), filtrage par user_id sur chaque requête SQL (isolation inter-utilisateurs).

**"Ton RLS Supabase est activé ?"**
Non, et c'est un compromis documenté. Le RLS ne fonctionne qu'avec Supabase Auth. Comme j'utilise un JWT custom, la sécurité est gérée au niveau applicatif avec des filtres SQL systématiques. En production à grande échelle, je passerais à Supabase Auth + RLS pour une défense en profondeur.

### Base de données

**"Pourquoi JSONB pour pack_data ?"**
Le pack voyage est une structure complexe et variable. Créer 15 tables normalisées pour chaque sous-élément (vols, hôtels, activités, météo) aurait ajouté de la complexité sans bénéfice. JSONB permet de stocker la structure complète et PostgreSQL permet des requêtes à l'intérieur du JSONB.

**"JSONB ou JSON, quelle différence ?"**
JSON stocke le texte brut et le reparse à chaque lecture. JSONB stocke une représentation binaire indexable — plus rapide en lecture, supporte les index GIN pour des requêtes dans la structure.

### IA & Scoring

**"Pourquoi un algorithme de scoring et pas le LLM qui note ?"**
Le scoring déterministe est prévisible, testable et instantané. Un LLM donnerait des scores différents à chaque appel — impossible d'écrire des assertions fiables et d'assurer la cohérence.

**"C'est quoi la différence entre ton pipeline et un agent IA ?"**
Un agent autonome choisit ses outils, leur ordre, peut itérer. Mon pipeline est fixe : les étapes sont codées en dur dans l'ordre. La seule partie agentique est le chat de modification où le LLM décide librement ce qu'il modifie dans le pack.

**"Qu'est-ce qui se passe si Gemini est en panne ?"**
La fonction callAI() essaie Gemini en premier. En cas d'erreur, elle bascule sur OpenRouter, puis sur Claude API, puis sur des données statiques hardcodées. L'application ne retourne jamais d'erreur 500 pour une panne LLM.

### Tests

**"Pourquoi Vitest et pas Jest ?"**
Vitest est natif ESM, compatible avec la configuration Vite/ES modules du projet. Jest nécessiterait une configuration de transpilation supplémentaire. Et Vitest est significativement plus rapide — 77 tests en 0.4 secondes.

**"Pourquoi tu mockes tout ?"**
Déterminisme — un LLM varie à chaque appel. Vitesse — 0.4s avec mocks. Coût — chaque appel LLM consomme des tokens. Isolation — pas besoin de fichier .env avec de vraies clés en CI.

**"T'as testé quoi exactement ?"**
Routes HTTP auth, trips, votes. Flux critiques end-to-end : génération, chat, photos, healthcheck. Algorithme de scoring sur tous les modes et les edge cases. Middleware auth : token absent, expiré, malformé, mauvais secret, valide.

### Formation Holberton

**"Quel lien avec les exercices Holberton ?"**
- SQL → tables PostgreSQL, clés primaires UUID, clés étrangères CASCADE
- ES6 Promises → Promise.allSettled pour les 5 recherches parallèles
- RESTful API → routes Express avec status codes HTTP corrects
- Authentication → JWT + bcryptjs, mêmes principes que Basic_authentication et Session_authentication
- HBnB Part 4 → JS vanilla + JWT cookie + Fetch API, directement transposé en React + cookie httpOnly
- TDD → Vitest + Supertest, mocks, golden path, edge cases

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
| BDD | 2 min |
| Tests | 2 min |
| Déploiement + bilan | 2-3 min |
| **Total présentation** | **~30 min** |
| Questions jury | 5-10 min |

---

## FORMULATIONS CLÉS À RETENIR

Ces phrases doivent sortir naturellement — apprends-les :

- *"TripGenie repose sur un **pipeline IA orchestré côté serveur**, avec une composante conversationnelle agentique pour la modification post-génération."*
- *"J'ai utilisé Promise.allSettled et non Promise.all pour que l'échec d'un service externe ne bloque pas toute la génération."*
- *"Le scoring est déterministe — aucun LLM n'est impliqué. C'est une fonction pure avec des poids définis par mode de voyage."*
- *"Le cookie httpOnly est inaccessible depuis JavaScript navigateur — le token ne peut pas être volé par XSS."*
- *"Le RLS Supabase est inactif — c'est un compromis documenté et assumé, pas un oubli."*
- *"77 tests automatisés en 0.4 secondes — tous les services externes sont mockés."*
