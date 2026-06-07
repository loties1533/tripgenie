# TripGenie — Comparaison `mvp-DEMODAY` vs `feat/postgres-rls`
> Deux approches de la couche données — points forts / points faibles

---

## 1. En une phrase

- **`feat/postgres-rls`** : accès base **bas niveau** (driver `pg` + SQL écrit à la main)
  avec une **sécurité au niveau base** (Row Level Security PostgreSQL « maison »).
- **`mvp-DEMODAY`** : accès base **haut niveau** via l'**ORM Prisma**, base **dans Docker**,
  sécurité par **filtre applicatif** + migrations versionnées.

> Même application, même API, même frontend. **Seule la couche persistance change.**

---

## 2. Tableau comparatif

| Critère | `feat/postgres-rls` | `mvp-DEMODAY` |
|---------|---------------------|---------------|
| Accès données | driver `pg` + SQL brut paramétré | **Prisma ORM** (`prisma.trip.findMany`) |
| Source de vérité du schéma | `schema.sql` + migrations SQL manuelles | **`schema.prisma`** (déclaratif) |
| Migrations | jouées à la main dans l'éditeur SQL | **`prisma migrate`** (versionnées, auto) |
| Hébergement base | Supabase (cloud) | **PostgreSQL Docker** (local, 1 commande) |
| Typage des requêtes | manuel (`QueryResult<T>`) | **auto-généré, bout en bout** |
| Sécurité données | filtre `user_id` **+ RLS PostgreSQL** (2 barrières) | filtre `user_id` (1 barrière applicative) |
| Contexte transactionnel | `withUser()` (BEGIN + `set_config`) | **`prisma.$transaction`** |
| Lectures publiques | fonctions `SECURITY DEFINER` | `select` explicite (périmètre minimal) |
| Visualisation données | tableau Supabase | **Prisma Studio** |
| Lignes de code DB | verbeux (SQL + mapping) | concis (méthodes typées) |

---

## 3. Points forts / points faibles

### `feat/postgres-rls`
**✅ Points forts**
- **Défense en profondeur** : même si le filtre applicatif est oublié, le RLS bloque au niveau base (fail-closed).
- **Maîtrise SQL démontrée** : excellent argument pour un jury (tu sais ce qui se passe vraiment).
- **Contrôle total** des transactions et des variables de session.
- Argument **cybersécurité** fort (rôle dédié sans BYPASSRLS, `app.current_user_id`).

**❌ Points faibles**
- **Verbeux** : chaque requête = SQL + typage manuel + mapping.
- **Migrations manuelles** : risque d'oubli, pas de versioning automatique.
- **Plus de surface de bug** (concaténation, oublis de `$n`, mapping snake/camel).
- Dépend d'un **service cloud** (Supabase) → démo moins reproductible.

### `mvp-DEMODAY`
**✅ Points forts**
- **Productivité** : code DB 2-3× plus court, lisible, typé automatiquement.
- **Migrations versionnées** : `prisma migrate` génère et applique le SQL, historisé dans Git.
- **Démo reproductible** : Docker → base identique partout en 1 commande.
- **Prisma Studio** : visualisation live, excellent en démo.
- **Moins de bugs** : le client typé empêche les erreurs à la compilation.

**❌ Points faibles**
- **Une seule barrière** de sécurité (filtre applicatif) — pas de RLS.
- **Abstraction** : on voit moins le SQL réel (un jury peut demander « et en SQL, ça donne quoi ? »).
- **Dépendance** à un ORM (couplage, courbe d'apprentissage, « magie »).

---

## 4. Quelle approche est « la meilleure » ?

**Il n'y a pas de gagnant absolu — ça dépend du contexte. C'est exactement ce qu'un jury veut t'entendre dire.**

| Contexte | Meilleur choix |
|----------|----------------|
| MVP / démo / itération rapide | **Prisma** (`mvp-DEMODAY`) |
| Exigence sécurité forte / multi-tenant | **RLS** (`feat/postgres-rls`) |
| Apprentissage SQL / contrôle fin | **pg + SQL** |
| Idéal production | **les deux** : Prisma POUR le confort **+** RLS PostgreSQL en filet de sécurité |

> **Réponse jury :** « Prisma et le RLS ne s'excluent pas. En production idéale, je
> garderais Prisma pour la productivité ET j'activerais le RLS PostgreSQL comme seconde
> barrière. J'ai implémenté les deux séparément pour bien comprendre chaque couche. »

---

## 5. Ce qui n'a PAS changé entre les deux branches
Pour bien cadrer le périmètre de la migration :
- ✅ Le **frontend React** (identique).
- ✅ Le **contrat d'API** (mêmes routes, mêmes réponses JSON en `snake_case`).
- ✅ La **logique métier** (pipeline IA, scoring, services externes).
- ✅ L'**authentification** JWT cookie httpOnly.
- ✅ La **validation Zod**.

➡️ La migration a été **chirurgicale** : on a remplacé la couche d'accès aux données
sans toucher au reste. C'est la preuve d'une **bonne séparation des responsabilités**.

---

## 6. Détail des modifications apportées (`postgres-rls` → `mvp-DEMODAY`)

| Fichier | Changement |
|---------|------------|
| `prisma/schema.prisma` | **Créé** — 6 modèles déclaratifs |
| `prisma/migrations/` | **Créé** — migration `init` versionnée |
| `prisma/seed.ts` | **Créé** — données de démo |
| `server/db/prisma.ts` | **Créé** — client Prisma singleton |
| `server/db/pg.ts` | **Supprimé** — ancien layer pg + `withUser`/RLS |
| `server/routes/auth.ts` | `query(auth_*)` → `prisma.user.findUnique/create` |
| `server/routes/trips.ts` | SQL CRUD → `prisma.trip.*` (`findFirst`, `updateMany`, `deleteMany`) |
| `server/routes/ai.ts` | `withUser` transaction → `prisma.$transaction` |
| `server/routes/packs.ts` | transaction de sélection → `prisma.$transaction` |
| `server/routes/preferences.ts` | upsert SQL `ON CONFLICT` → `prisma.userPreference.upsert` |
| `server/routes/votes.ts` | `INSERT/SELECT` → `prisma.tripVote.create/findMany` |
| `server/routes/collaborators.ts` | `SECURITY DEFINER` → requêtes Prisma + `include` |
| `tests/**` (9 fichiers) | mock `db/pg` → mock `db/prisma` (`vi.hoisted`) |
| `package.json` | scripts Prisma + retrait dépendance `pg` |

**Résultat :** 0 erreur TypeScript, **282 tests** verts, app fonctionnelle de bout en bout.
