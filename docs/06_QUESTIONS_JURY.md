# 🎤 TripGenie — Banque de questions jury + réponses
> RNCP5 DWWM / Holberton · branche `mvp-DEMODAY` (Prisma)
> *Tout type de question, avec réponse claire et prête à dire. Entraîne-toi à voix haute.*

> **Méthode de réponse en 3 temps :** (1) ce que c'est / ce que ça fait, (2) **pourquoi** ce choix,
> (3) le détail seulement si on te le demande. Ne récite jamais le code ligne par ligne.

---

## A. PROJET & CONTEXTE

**A1. Présente ton projet en 1 minute.**
> TripGenie est une application web de génération de voyages pilotée par IA. L'utilisateur
> décrit son voyage en langage naturel et reçoit un pack complet clé en main — vols, hôtels,
> itinéraire, activités, météo, budget — adapté à son style. Le problème : les sites classiques
> sont des agrégateurs qui renvoient 300 résultats bruts ; moi je fais la synthèse via un
> pipeline IA et un scoring multi-critères.

**A2. Quel problème résous-tu concrètement ?**
> La surcharge de choix. Sur Booking ou Kayak, l'utilisateur compare seul des centaines
> d'options. TripGenie décide à sa place selon ses critères et son mode de voyage.

**A3. Qui sont tes utilisateurs ?**
> Trois personas : Sophie (cadre, mode luxe), Lucas (étudiant, petit budget), Maxime (week-ends
> entre amis, mode fête). Ils correspondent directement aux modes de voyage implémentés.

**A4. Pourquoi ce projet ?**
> Il combine ce que je voulais démontrer : un front riche, un back structuré avec une vraie
> logique métier, une base relationnelle, de la sécurité, des tests, et une intégration d'APIs
> externes — dont l'IA, qui est un sujet d'actualité.

**A5. C'est quoi ta valeur ajoutée vs ChatGPT qui peut aussi planifier un voyage ?**
> ChatGPT donne du texte. Moi je structure : données réelles (vols, restos, événements via
> APIs), un scoring déterministe, une sauvegarde, du partage collaboratif avec votes, et une
> dégradation gracieuse si une source tombe. C'est un produit, pas une conversation.

---

## B. ARCHITECTURE

**B1. Décris ton architecture.**
> Client-serveur en 3 couches : présentation (React), logique métier (Express), persistance
> (Prisma + PostgreSQL). Chaque couche ne parle qu'à sa voisine : le front ne touche jamais
> la base, il passe par l'API qui renvoie du JSON.

**B2. Pourquoi séparer front et back ?**
> Séparation des responsabilités : je peux faire évoluer, tester et déployer chaque couche
> indépendamment. Et l'API pourrait servir d'autres clients (mobile) sans changer le back.

**B3. C'est quoi une SPA ?**
> Single Page Application : un seul fichier HTML chargé, React gère ensuite toute la navigation
> côté client sans rechargement. J'ai choisi ça car TripGenie est derrière authentification —
> pas de besoin SEO — et je veux garder l'état (génération en cours, chat) en mémoire.

**B4. Pourquoi pas Next.js / du SSR ?**
> Le SSR sert surtout au SEO et aux pages publiques. Mon app est authentifiée, Google ne s'y
> connecte pas. React + Express séparés rendent les couches plus claires à expliquer et à tester.

**B5. Comment tes couches communiquent ?**
> En HTTP/JSON. Le front appelle l'API via une façade unique (`src/lib/api.ts`) avec le cookie
> envoyé automatiquement. L'API répond en JSON avec un code HTTP sémantique.

---

## C. FRONTEND

**C1. Pourquoi React ?**
> Écosystème mature, composants réutilisables, virtual DOM performant, et une logique
> déclarative : je décris l'UI en fonction de l'état, React se charge des mises à jour.

**C2. Comment gères-tu l'état global ?**
> Avec Zustand : trois stores (auth, chat, recherche). Plus simple que Redux — pas de
> boilerplate, une API minimaliste. Et un middleware `persist` pour garder certaines données.

**C3. C'est quoi React Query, pourquoi ?**
> Une librairie de gestion des requêtes serveur : elle gère automatiquement le cache, les états
> loading/error et le refetch. Ça m'évite de coder ces états à la main partout.

**C4. Comment fonctionne le routing ?**
> React Router v6 : chaque URL correspond à une page, sans rechargement. La navigation change
> l'URL et React affiche le bon composant.

**C5. Pourquoi Tailwind ?**
> Des classes utilitaires directement dans le JSX → cohérence visuelle rapide, pas de fichiers
> CSS à maintenir, et le build purge les classes inutilisées (CSS final minimal).

**C6. Comment tu gères le responsive ?**
> Les classes Tailwind avec préfixes (`sm:`, `lg:`). Exemple concret : le chat de modification
> passe en bottom-sheet sur mobile au lieu d'un panneau latéral.

**C7. Comment tu sécurises le front (clés API) ?**
> Aucune clé API côté client. Les services sensibles (Unsplash) passent par un proxy backend.
> Les clés vivent dans les variables d'environnement serveur.

---

## D. BACKEND

**D1. Pourquoi Node/Express ?**
> Full-stack JavaScript : un seul langage front et back, un seul runtime, un seul déploiement.
> Express est léger et repose sur un pattern de middlewares clair.

**D2. C'est quoi un middleware ?**
> Une fonction qui s'exécute entre la requête et la réponse, avec accès à `req`, `res` et `next`.
> J'en ai pour la sécurité (helmet), l'auth (requireAuth), les logs (morgan), le rate-limit.

**D3. C'est quoi une API REST ?**
> Une API qui expose des ressources via des URLs et les verbes HTTP : GET (lire), POST (créer),
> PUT (modifier), DELETE (supprimer), avec des codes de statut standardisés.

**D4. Donne des exemples de codes HTTP que tu utilises.**
> 200 OK, 201 créé, 400 validation échouée, 401 non authentifié, 403 interdit, 404 introuvable,
> 409 conflit (email déjà pris), 429 trop de requêtes.

**D5. Comment valides-tu les données entrantes ?**
> Avec Zod : un schéma déclaratif par route, `safeParse(req.body)` avant toute logique. Si
> invalide → 400 avec un message précis. Aucune donnée non validée n'atteint la base.

**D6. Comment gères-tu les erreurs ?**
> Chaque route est en `try/catch`, et en cas d'erreur j'appelle `next(err)` qui remonte vers un
> gestionnaire d'erreurs global (`globalErrorHandler`) qui renvoie un JSON propre + le bon code.

**D7. C'est quoi async/await ?**
> Une syntaxe pour écrire du code asynchrone de façon lisible, comme du synchrone. `await` met en
> pause jusqu'à ce qu'une promesse se résolve. Indispensable pour les appels base et API externes.

**D8. Différence Promise.all et Promise.allSettled ?**
> `all` rejette dès qu'une promesse échoue. `allSettled` attend toutes les promesses quelle que
> soit leur issue. J'utilise `allSettled` pour les recherches parallèles : si la météo tombe, le
> reste continue → le pack se génère quand même.

---

## E. BASE DE DONNÉES

**E1. Quel SGBD et pourquoi ?**
> PostgreSQL : relationnel, robuste, gère le JSON (colonnes JSONB pour mes packs), les contraintes
> et les transactions. En local je le fais tourner dans Docker pour une démo reproductible.

**E2. Décris ton modèle de données.**
> 6 entités : User, Trip, Pack, TripVote, UserPreference, TripCollaborator. Un User a plusieurs
> Trips, un Trip a plusieurs Packs, un Pack a plusieurs Votes. User↔Trip via collaborateurs est
> du many-to-many. User↔UserPreference est du un-à-un.

**E3. C'est quoi une clé étrangère ?**
> Une colonne qui référence la clé primaire d'une autre table. Ex : `trips.user_id` référence
> `users.id`. Avec `ON DELETE CASCADE` : si je supprime un user, ses trips partent avec.

**E4. C'est quoi une relation many-to-many ? Comment tu l'as faite ?**
> Une relation où chaque côté peut avoir plusieurs correspondants. Je la matérialise par une
> table de jointure `trip_collaborators` avec une clé primaire composée (trip_id, user_id) —
> ce qui empêche d'inviter deux fois la même personne.

**E5. C'est quoi un ORM ?**
> Object-Relational Mapping : il fait le pont entre mes objets JS et les tables SQL.
> `prisma.trip.findMany()` génère le `SELECT` correspondant et me renvoie des objets typés.

**E6. Pourquoi Prisma plutôt que du SQL brut ?**
> Schéma déclaratif unique (`schema.prisma`), migrations versionnées automatiques, et un client
> 100 % typé qui détecte les erreurs à la compilation. Le SQL généré reste paramétré → pas
> d'injection. (Sur une autre branche, j'ai aussi fait du SQL brut + RLS pour comprendre les deux.)

**E7. C'est quoi une migration ?**
> Un fichier décrivant un changement de structure de la base (créer une table, ajouter une
> colonne). `prisma migrate` les génère, les applique et les versionne dans Git. Avant, je jouais
> le SQL à la main — risque d'oubli ; maintenant c'est tracé et automatique.

**E8. C'est quoi une transaction ?**
> Un groupe d'opérations traité comme un tout : tout réussit (COMMIT) ou tout est annulé
> (ROLLBACK). C'est l'atomicité d'ACID. Je l'utilise pour créer un trip et son pack ensemble :
> si le pack échoue, le trip n'est pas créé non plus — pas d'état incohérent.

**E9. Comment évites-tu l'injection SQL ?**
> Les requêtes Prisma sont paramétrées : les valeurs ne sont jamais concaténées dans la chaîne
> SQL, elles sont passées séparément. Donc une saisie malveillante reste une simple donnée.

**E10. Ta base est-elle normalisée ?**
> Oui, en 3e forme normale : pas de redondance, chaque donnée à un seul endroit. Les packs sont
> en table séparée des trips, les préférences en relation 1-1, les collaborateurs en table de
> jointure. Le JSONB sert uniquement au pack sérialisé (donnée semi-structurée de l'IA).

---

## F. SÉCURITÉ

**F1. Comment fonctionne ton authentification ?**
> À la connexion, je vérifie le mot de passe avec bcrypt, je signe un JWT et je l'envoie dans un
> cookie httpOnly. Les requêtes suivantes envoient le cookie automatiquement ; le middleware le
> lit et vérifie le token.

**F2. C'est quoi un JWT ?**
> JSON Web Token : un jeton signé contenant des informations (id, email) et une signature.
> Le serveur le vérifie sans stocker de session — c'est stateless.

**F3. Pourquoi un cookie httpOnly et pas localStorage ?**
> localStorage est lisible en JavaScript → vulnérable au XSS : un script injecté volerait le
> token. Un cookie httpOnly est inaccessible au JS du navigateur → le token ne peut pas être volé.

**F4. C'est quoi le XSS ? Comment tu t'en protèges ?**
> Cross-Site Scripting : l'injection de script malveillant dans la page. Je m'en protège par le
> cookie httpOnly (token involable), Helmet (headers de sécurité), et React qui échappe le HTML
> par défaut.

**F5. C'est quoi le CSRF ? Ta parade ?**
> Cross-Site Request Forgery : un autre site déclenche une requête authentifiée à ta place.
> Parade : `sameSite: 'strict'` sur le cookie → il n'est jamais envoyé depuis un autre site.

**F6. Pourquoi bcrypt et pas un hash simple (MD5/SHA) ?**
> bcrypt est lent volontairement et salé → résistant au brute-force et aux rainbow tables. MD5
> est rapide donc cassable. Un hash est à sens unique : on ne déchiffre jamais le mot de passe,
> on compare avec `bcrypt.compare`.

**F7. Comment isoles-tu les données entre utilisateurs ?**
> Chaque requête protégée filtre par `where: { user_id }`, l'id venant du JWT vérifié. J'ai un
> test qui le prouve : l'utilisateur B reçoit un 404 sur le voyage de l'utilisateur A.

**F8. Comment tu protèges contre le spam / DDoS ?**
> express-rate-limit : 100 requêtes/15min en global, et des limites plus strictes sur les routes
> coûteuses (IA : 5/min, car chaque appel LLM a un coût).

**F9. As-tu pensé à l'OWASP Top 10 ?**
> Oui : injection (Zod + requêtes paramétrées), authentification cassée (JWT + bcrypt), exposition
> de données (cookie httpOnly, select explicite sur le partage), mauvaise config (Helmet, CORS
> whitelist), et contrôle d'accès (isolation par user_id).

**F10. Une route publique n'expose-t-elle pas de données sensibles ?**
> Non : le partage public (`/trips/share/:id`) utilise un `select` explicite qui ne renvoie que
> le voyage et l'id des packs — aucun user_id, email ni hash. Le `select` agit comme un périmètre
> de sécurité.

**F11. (Branche RLS) C'est quoi le Row Level Security ?**
> Une sécurité au niveau de la base : des policies PostgreSQL filtrent les lignes selon un
> contexte. Sur ma branche `feat/postgres-rls`, j'ai un rôle dédié sans BYPASSRLS et une variable
> de session `app.current_user_id` → même si le filtre applicatif est oublié, la base ne renvoie
> rien (fail-closed). C'est de la défense en profondeur.

---

## G. IA & PIPELINE

**G1. Comment fonctionne ta génération de pack ?**
> Un pipeline orchestré : validation → recherches parallèles (vols, hôtels, événements, restos)
> → le LLM assemble un pack JSON → merge des restaurants → scoring déterministe → sauvegarde.
> Toujours dans cet ordre.

**G2. C'est un agent IA ?**
> Non. Un agent choisit lui-même ses outils et leur ordre. Mon pipeline a des étapes fixes.
> Seule partie agentique : le chat de modification, où le LLM décide quoi changer dans le pack.

**G3. Quel LLM utilises-tu ?**
> Gemini en principal, avec fallback OpenRouter puis Claude, et enfin des mocks. Si un fournisseur
> est saturé ou en panne, je bascule automatiquement → l'app ne tombe jamais.

**G4. Comment garantis-tu un JSON exploitable depuis le LLM ?**
> Prompt engineering strict (format JSON imposé), parsing défensif avec fallback structuré si la
> réponse est malformée, et validation côté serveur. Le scoring, lui, est 100 % déterministe — zéro IA.

**G5. C'est quoi ton scoring ?**
> Un algorithme pur (sans IA) qui note le pack de 0 à 1 selon des poids définis par mode. En mode
> luxe l'hôtel pèse 40 %, en mode étudiant le prix pèse 50 %. C'est reproductible et explicable.

**G6. Que se passe-t-il si une API externe tombe ?**
> Dégradation gracieuse. `Promise.allSettled` continue avec les données disponibles ; les restos
> ont une chaîne Foursquare→Yelp→liste vide ; si tout échoue, un bandeau « mode démo » s'affiche
> et les mocks prennent le relais.

---

## H. TESTS

**H1. Comment tu testes ?**
> 282 tests avec Vitest et Supertest, organisés par couche : unitaires (scoring), services (APIs
> mockées), sécurité (auth, tokens, validation), intégration (routes complètes en HTTP).

**H2. C'est quoi le TDD ?**
> Test-Driven Development : écrire le test avant le code. Je l'ai appliqué sur les parties
> critiques — scoring, validation, sécurité — pour figer le comportement attendu.

**H3. C'est quoi un mock ? Pourquoi ?**
> Une fausse implémentation d'une dépendance. Je mocke le LLM, les APIs externes et Prisma pour
> que les tests soient rapides, déterministes et sans coût réseau ni accès base réel.

**H4. Comment tu mockes la base avec Prisma ?**
> Je remplace le module `db/prisma` par un faux client dont les méthodes sont des `vi.fn()`
> renvoyant des valeurs contrôlées. Chaque test définit ce que la base est censée retourner.

**H5. Pourquoi Vitest et pas Jest ?**
> Vitest est natif ESM, compatible avec ma config Vite/ES modules sans transpilation supplémentaire,
> et significativement plus rapide.

**H6. Tu testes les cas d'erreur ?**
> Oui : mauvais mot de passe (401), email déjà pris (409), validation échouée (400), accès
> inter-utilisateurs (404), token expiré/forgé/alg:none (401). Pas seulement le chemin heureux.

---

## I. GESTION DE PROJET / GIT

**I1. Quelle méthodologie ?**
> Agile, en sprints courts livrant un incrément fonctionnel : socle (auth) → cœur (IA) →
> enrichissement (chat, partage) → industrialisation (tests, ORM, Docker). Backlog priorisé par
> la valeur pour mes personas.

**I2. Comment tu utilises Git ?**
> Une branche par chantier (`feat/postgres-rls`, `mvp-DEMODAY`), des commits atomiques en français
> (`feat:`, `fix:`, `docs:`). Ça garde un historique lisible et permet de porter des correctifs
> entre branches (cherry-pick).

**I3. C'est quoi un MVP ?**
> Minimum Viable Product : la plus petite version qui apporte de la valeur. Le mien : générer et
> afficher un pack. Tout le reste (partage, préférences) est venu après.

**I4. Comment tu priorises ?**
> Par valeur utilisateur et dépendance technique. L'auth d'abord (tout en dépend), puis le cœur
> de valeur (génération), puis le confort.

---

## J. DÉPLOIEMENT / DEVOPS

**J1. Comment tu déploies ?**
> Cible Render (PaaS) avec un `render.yaml` déclaratif. Build du React en statique servi par
> Express → un seul serveur en production. Variables d'environnement pour les secrets.

**J2. Dev vs prod, quelle différence ?**
> En dev : 2 processus (Vite sur 3001 + API sur 3000) pour le hot-reload, reliés par un proxy.
> En prod : 1 serveur, Express sert le React compilé. La base : Docker en local, hébergée en prod.

**J3. Pourquoi Docker pour la base ?**
> Pour avoir une base identique sur n'importe quelle machine en une commande, sans dépendre d'un
> service externe. Idéal pour une démo reproductible.

**J4. Comment gères-tu les secrets ?**
> Variables d'environnement (`.env` en local, gitignoré ; variables de la plateforme en prod).
> Jamais de secret dans le code ni côté client.

**J5. As-tu de la CI/CD ?**
> Les tests tournent via `npm run test:all`. Le pipeline peut les exécuter à chaque push pour
> bloquer une régression avant le déploiement.

---

## K. QUESTIONS DE RÉFLEXION / PIÈGES

**K1. Qu'est-ce que tu améliorerais ?**
> Le cache des réponses LLM (économie de coût), de la pagination plus fine, du code-splitting
> frontend (le bundle est gros), et en prod combiner Prisma + RLS pour la défense en profondeur.

**K2. Comment tu ferais passer ça à l'échelle (scalabilité) ?**
> API stateless (JWT) → je peux multiplier les instances derrière un load-balancer. Base avec
> index sur les colonnes filtrées. File d'attente pour les générations IA. Cache (Redis) sur les
> destinations/photos.

**K3. Qu'est-ce qui a été le plus dur ?**
> Fiabiliser le pipeline IA face aux échecs partiels des APIs externes — d'où le passage à
> `Promise.allSettled` et les chaînes de fallback.

**K4. Si tu devais recommencer, que changerais-tu ?**
> Je partirais directement sur Prisma (j'ai d'abord fait du SQL brut), et j'écrirais les tests
> encore plus tôt sur le pipeline IA.

**K5. Quelle est la partie dont tu es le plus fier ?**
> La robustesse : l'app génère un résultat même quand des services tombent, avec transparence
> (bandeau mode démo). Et l'isolation des données, prouvée par les tests.

**K6. Montre-moi un bout de code que tu trouves bien écrit.**
> *(prépare-en un d'avance : par ex. le bloc `$transaction` de `ai.ts`, ou `suggestDestinations`
> avec ses fallbacks)*. Explique l'intention, puis le pourquoi.

**K7. Qu'est-ce que tu as appris ?**
> À structurer une vraie logique métier en couches, à sécuriser une app web (OWASP), à intégrer
> des APIs incertaines avec dégradation gracieuse, et à choisir entre deux approches (ORM vs SQL+RLS)
> selon le contexte plutôt que par dogme.

---

## L. SPÉCIAL RÉFÉRENTIEL DWWM

**L1. (Bloc front) Comment tu rends une interface adaptable ?**
> Tailwind responsive (mobile-first), composants réutilisables, accessibilité clavier
> (`role`, `tabIndex`, `onKeyDown`), états de chargement et feedback (toasts, skeletons).

**L2. (Bloc front) Comment tu dynamises une interface ?**
> React met à jour l'UI en fonction de l'état (Zustand). Les appels API (React Query / fetch)
> déclenchent des re-renders. Framer Motion gère les transitions.

**L3. (Bloc back) Tes composants d'accès aux données ?**
> La couche Prisma (`server/db/prisma.ts` + les appels dans les routes). Un point d'accès typé et
> centralisé, avec requêtes paramétrées.

**L4. (Bloc back) Comment documentes-tu ton API ?**
> Documentation des routes (méthode, params, réponses, codes) — et j'ai intégré Swagger/OpenAPI
> pour une doc interactive. Plus le dossier `docs/` complet.

**L5. (Bloc back) Comment tu sécurises ta partie back-end ?**
> Validation Zod, authentification JWT, hash bcrypt, Helmet/CORS/rate-limit, isolation par
> user_id, requêtes paramétrées. Sécurité pensée à chaque route.

---

### 🎯 Si tu ne retiens que 5 réponses
1. **Pipeline orchestré ≠ agent** (étapes fixes vs choix autonome).
2. **allSettled** = dégradation gracieuse.
3. **Cookie httpOnly** = anti-vol de token par XSS.
4. **Transaction** = tout ou rien (trip + pack).
5. **Isolation** = filtre `user_id` issu du JWT, prouvé par un test (User B → 404).
