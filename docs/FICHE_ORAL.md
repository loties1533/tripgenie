# 🎴 FICHE ORAL TRIPGENIE — Antisèche complète (à trier/imprimer)
> Branche `mvp-DEMODAY` · RNCP5 DWWM / Holberton · *condense puis garde l'essentiel*

---

## ① PITCH (30 secondes)
> « TripGenie génère des voyages personnalisés par IA. L'utilisateur décrit son voyage en
> une phrase, et reçoit un **pack clé en main** — vols, hôtels, itinéraire, activités, météo,
> budget — adapté à son style (luxe, fête, étudiant, groupe, détente). »

**Problème résolu :** Booking/Kayak sont des **agrégateurs** (300 résultats bruts, on choisit seul).
TripGenie fait la **synthèse à la place de l'utilisateur** : pipeline IA + scoring multi-critères.

**3 personas :** Sophie (luxe), Lucas (étudiant), Maxime (fête entre amis) = les **modes** de voyage.

---

## ② STACK TECHNIQUE (le « quoi » + le « pourquoi »)

**Frontend :** React 18 · Vite · TypeScript · Zustand (state) · React Query (cache) · Tailwind · Framer Motion · Recharts · Leaflet
**Backend :** Node.js · Express 4 · TypeScript · **Prisma (ORM)** · Zod (validation) · JWT · bcryptjs · Helmet · CORS · rate-limit · Morgan
**Base :** PostgreSQL 16 (**Docker**) · Prisma Migrate · Prisma Studio
**Tests :** Vitest · Supertest (282 tests)
**IA/externes :** Gemini→OpenRouter→Claude (fallback) · Tavily · Foursquare→Yelp · PredictHQ · OpenWeatherMap · Unsplash

| Choix | Justification 1 phrase |
|-------|------------------------|
| Full-stack **JS/TS** | un seul langage, un runtime, un déploiement |
| **Prisma** (ORM) | schéma déclaratif + migrations versionnées + client typé |
| **Zustand** vs Redux | plus simple, API minimaliste |
| **Vite** vs CRA | HMR ultra-rapide, build ESM |
| **JWT cookie httpOnly** vs localStorage | inaccessible au JS → anti-vol par XSS |
| **Docker** pour la base | reproductible en 1 commande |

---

## ③ ARCHITECTURE 3 COUCHES
```
PRÉSENTATION (React)  →  LOGIQUE MÉTIER (Express)  →  PERSISTANCE (Prisma + PostgreSQL)
  pages, chat,            middlewares → routes →         schema.prisma
  store, api.ts           services → Prisma              migrations, client typé
```
**Règle :** chaque couche ne parle qu'à sa voisine. Le front ne touche jamais la base ; il passe par l'API (JSON).

**Trajet d'une requête protégée :**
`HTTP → helmet/cors/rate-limit → requireAuth (JWT) → validation Zod → handler → Prisma → réponse JSON + code HTTP`

---

## ④ LE PIPELINE IA (cœur de valeur — `POST /api/ai/generate`)
```
1. Validation
2. Promise.allSettled([vols, événements, hôtels])   ← PARALLÈLE (Tavily/APIs)
   + restaurants (Foursquare → Yelp fallback → [])
3. assemblePack()  → LLM assemble le pack JSON (prompt adapté au mode)
4. merge restaurants dans activities
5. scorepack()  → algo DÉTERMINISTE (0 IA), pondéré par mode
6. prisma.$transaction(trip + pack)  si connecté
7. { pack, score, trip_id }
```
- **Pipeline orchestré** (étapes fixes, même ordre) ≠ **agent autonome** (choisit ses outils). Seul mon **chat de modification** est agentique.
- **`Promise.allSettled`** (pas `all`) : si la météo tombe, le reste continue → **dégradation gracieuse**.
- **Fallbacks en cascade** : LLM Gemini→OpenRouter→Claude→mocks ; restos Foursquare→Yelp→[].

---

## ⑤ AUTHENTIFICATION & SÉCURITÉ
```
login → bcrypt.compare → jwt.sign → res.cookie('tg_token', {httpOnly, secure, sameSite:'strict', 7j})
requêtes suivantes → cookie auto → middleware lit req.cookies.tg_token (ou header Bearer)
```
| Menace | Parade |
|--------|--------|
| Vol de token (XSS) | cookie **httpOnly** (inaccessible au JS) |
| CSRF | `sameSite: 'strict'` |
| Mot de passe en clair | **bcrypt** (hash lent, à sens unique) |
| Injection SQL | requêtes **paramétrées** (Prisma) |
| Entrées malveillantes | **Zod** sur chaque route |
| Spam / DDoS | **rate-limit** (global + par route) |
| Accès inter-utilisateurs | filtre **`where: { user_id }`** (id issu du JWT) → User B = **404** sur trip de A |

**Rate limits :** global 100/15min · IA 5/min · chat 30/15min · votes 10/min.

---

## ⑥ BASE DE DONNÉES (6 entités)
`User 1─N Trip 1─N Pack 1─N TripVote` · `User 1─1 UserPreference` · `Trip N─N User (via TripCollaborator)`

**Prisma en 3 commandes :**
- `prisma generate` → crée le client TypeScript typé
- `prisma migrate` → crée + applique les migrations SQL versionnées
- `prisma studio` → navigateur visuel de la base (port 5555)

**Transaction (`$transaction`) :** plusieurs écritures = **tout ou rien** (atomicité ACID).
→ Usage 1 : créer **trip + pack** ensemble. Usage 2 : **sélectionner un pack** (4 opérations).
Si une étape échoue → **ROLLBACK** automatique. (`tx.` = client lié à la transaction.)

---

## ⑦ camelCase vs snake_case
- camelCase = `returnDate` (JS) · snake_case = `return_date` (SQL).
- Mon contrat d'API est **tout en snake_case** → j'ai nommé les champs Prisma en snake_case
  → **zéro traduction**, source de vérité unique (colonne = champ = clé JSON). Aucun test à réécrire.

---

## ⑧ ROUTES API (référence)
```
AUTH    POST /auth/signup · /login · /logout   GET /auth/me
IA      POST /ai/onboarding · /destinations · /generate · /chat
TRIPS   GET /trips · GET /trips/:id · POST /trips · PUT /trips/:id · DELETE /trips/:id
        GET /trips/share/:id (PUBLIC, aucune donnée user exposée)
PACKS   GET /packs/:trip_id · POST /packs/:trip_id/select/:pack_id
VOTES   POST /votes · GET /votes/:pack_id (publics)
PREFS   GET /preferences · PUT /preferences
COLLAB  GET/POST/DELETE /trips/:id/collaborators
```
**Codes HTTP :** 200 OK · 201 créé · 400 validation · 401 non auth · 403 interdit · 404 introuvable · 409 conflit (email pris) · 429 rate-limit.

---

## ⑨ TESTS (282, via Vitest)
- **unit** : scoring, fonctions pures de pack.ts
- **services** : Foursquare, Yelp, PredictHQ (fetch mocké)
- **security** : signup, login, tokens (alg:none, expiration, IDOR), validation Zod
- **integration** : packs, preferences, collaborators, génération
- Prisma **mocké** (`vi.hoisted`) → aucun accès base réel en test.

---

## ⑩ COMMANDES DÉMO
```bash
docker start tripgenie-db && npm run db:seed   # base + données démo (demo@tripgenie.fr / demo1234)
npm run dev:all        # API (3000) + front (3001) en une commande
npm run prisma:studio  # OPTIONNEL — la base en visuel (5555)
```
**Quoi tourne ?** App = 2 processus (front 3001 + API 3000). Studio = outil bonus. PostgreSQL = la base (Docker). En **prod = 1 serveur** (Express sert le React compilé).

**Déroulé :** accueil → quiz (récap) → génération (~20s) → pack complet → connexion → « Mes voyages » → **Prisma Studio** (donnée live) → partage/votes.
**Si IA tombe :** bandeau orange « mode démo » + mocks = **robustesse, pas échec**. Plan B : capture vidéo + seed.

---

## ⑪ QUESTIONS PIÈGES → RÉPONSES COURTES
- **Pipeline vs agent ?** étapes fixes et ordonnées vs choix autonome des outils. Seul le chat est agentique.
- **Pourquoi allSettled ?** `all` s'arrête au 1er échec ; `allSettled` finit tout → pack avec les données dispo.
- **Sécurité des données ?** 3 niveaux : cookie httpOnly + Zod + filtre `user_id`. Prouvé par un test (User B → 404).
- **Pourquoi un ORM ?** schéma unique, migrations auto versionnées, client typé. SQL généré paramétré → 0 injection.
- **C'est quoi une transaction ?** plusieurs écritures liées = tout ou rien (atomicité). Ex : trip + pack.
- **Pourquoi pas Next.js ?** app authentifiée sans besoin de SEO → React+Express séparés = couches claires.
- **409 ?** requête valide mais en conflit avec l'état (email déjà pris). ≠ 400 (requête mal formée).
- **2 serveurs ?** en dev oui (Vite + Express, proxifiés) ; en prod 1 (Express sert tout).

---

## ⑫ CHIFFRES & PHRASES CLÉS
- **6** entités · **~30** routes · **282** tests · **5** modes de voyage · **3** couches.
- **Génération** : ~15-30 s · **fallbacks** : 4 niveaux LLM, 2 niveaux restos.
- « J'ai construit en **sprints** : socle (auth) → cœur (IA) → enrichissement (chat/partage) → industrialisation (tests, ORM, Docker). »
- « Chaque choix technique répond à un **pourquoi** : je peux justifier React, Prisma, JWT httpOnly, allSettled. »
- « J'ai exploré **deux couches données** : Prisma (productivité) et RLS PostgreSQL maison (sécurité en profondeur). En prod idéale : les deux. »
