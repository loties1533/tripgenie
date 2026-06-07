# TripGenie — Concepts clés à maîtriser pour le jury

---

## 1. camelCase vs snake_case

### Définitions
| Convention | Exemple | Univers habituel |
|------------|---------|------------------|
| **camelCase** | `returnDate`, `userId`, `packData` | JavaScript / TypeScript |
| **snake_case** | `return_date`, `user_id`, `pack_data` | SQL / PostgreSQL |
| PascalCase | `TripGenie`, `User` | Noms de classes / modèles |
| kebab-case | `trip-genie` | URLs, noms de fichiers |

> Ce sont des **conventions de nommage**. Le code marche dans tous les cas — mais la
> **cohérence** est un critère de qualité. Chaque écosystème a sa convention par défaut.

### Le « problème » dans TripGenie
Il y a deux mondes avec deux conventions opposées :
- **PostgreSQL** nomme ses colonnes en `snake_case` → `user_id`, `pack_data`, `return_date`.
- **JavaScript** nomme ses variables en `camelCase` → `userId`, `packData`, `returnDate`.

Un ORM comme Prisma utilise **camelCase par défaut** côté code, et mappe vers les
colonnes `snake_case` via `@map`.

### Le choix que j'ai fait (et pourquoi)
**Tout le contrat d'API de TripGenie est en `snake_case`** : le frontend lit
`trip.pack_data`, `trip.return_date` ; les types `TripRecord`/`User` sont en `snake_case` ;
les tests vérifient `snake_case`.

➡️ J'ai donc nommé **les champs Prisma directement en `snake_case`** :
```prisma
model Trip {
  user_id     String    @db.Uuid      // ← snake_case, PAS userId
  return_date DateTime? @db.Date
  pack_data   Json?
}
```

**Pourquoi ce choix ?**
- Prisma renvoie alors les objets **déjà au bon format** → **zéro couche de transformation**
  camelCase↔snake_case dans chaque route.
- **Source de vérité unique** : colonne SQL = champ Prisma = clé JSON d'API.
- **Aucune régression** : le frontend, les types et les 282 tests fonctionnent sans modification.

> **L'alternative** (camelCase + `@map("snake_case")`) est la convention « par défaut »
> de Prisma, mais elle aurait obligé à **traduire** chaque réponse (`{ userId } → { user_id }`)
> dans toutes les routes, ou à réécrire frontend + types + tests. Plus de code, plus de bugs.

### Phrase pour le jury
> « PostgreSQL travaille en snake_case, JavaScript en camelCase. Comme tout mon contrat
> d'API était déjà en snake_case, j'ai aligné les champs Prisma sur snake_case pour avoir
> une source de vérité unique et éviter toute couche de traduction. C'est un choix de
> cohérence, pas un hasard. »

---

## 2. Les transactions — « de quelle transaction on parle ? »

### Définition
Une **transaction** = un **groupe d'opérations base de données traité comme un tout
indivisible** : soit **tout réussit** (COMMIT), soit **tout est annulé** (ROLLBACK).
On résume par l'acronyme **ACID** (Atomicité, Cohérence, Isolation, Durabilité).
La propriété qui nous intéresse ici est l'**Atomicité** : « tout ou rien ».

### Pourquoi c'est indispensable dans TripGenie
Deux endroits du code écrivent **plusieurs lignes liées** qui doivent rester cohérentes.

#### Cas 1 — Génération d'un pack (`server/routes/ai.ts`)
On crée **un `trip` PUIS un `pack`** qui lui appartient. Sans transaction, si la création
du `pack` échoue après celle du `trip`, on aurait un **voyage orphelin sans pack** → état
incohérent.

```ts
const saved = await prisma.$transaction(async (tx) => {
  const trip = await tx.trip.create({ data: { /* ... */ }, select: { id: true } });
  const pack = await tx.pack.create({ data: { trip_id: trip.id, /* ... */ } });
  return { tripId: trip.id, packId: pack.id };
});
// Si tx.pack.create lève une erreur → ROLLBACK → le trip n'est PAS créé non plus.
```

#### Cas 2 — Sélection d'un pack (`server/routes/packs.ts`)
Choisir un pack = **4 opérations enchaînées** : vérifier la propriété → vérifier que le
pack existe → désélectionner tous les autres packs → sélectionner le choisi → mettre à jour
le voyage. Toutes doivent réussir **ensemble** :

```ts
const outcome = await prisma.$transaction(async (tx) => {
  const owned = await tx.trip.findFirst({ where: { id, user_id }, select: { id: true } });
  if (!owned) return { status: 403 };
  await tx.pack.updateMany({ where: { trip_id }, data: { selected: false } });
  const pack = await tx.pack.update({ where: { id: pack_id }, data: { selected: true } });
  await tx.trip.updateMany({ where: { id, user_id }, data: { status: 'confirmed', pack_data: pack } });
  return { status: 200, pack };
});
```
Si la dernière étape échoue, **tout est annulé** : on ne se retrouve jamais avec un pack
sélectionné mais un voyage resté en `draft`.

### Le point technique important : `tx`
Dans `prisma.$transaction(async (tx) => …)`, **`tx`** est un **client Prisma spécial lié
à la transaction**. Il faut faire toutes les requêtes avec **`tx.`** (pas `prisma.`),
sinon elles s'exécuteraient **hors** de la transaction.

### Comparaison avec l'autre branche (`feat/postgres-rls`)
La même atomicité y était obtenue **à la main** :
```sql
BEGIN;
  INSERT INTO trips ...;
  INSERT INTO packs ...;
COMMIT;   -- ou ROLLBACK en cas d'erreur
```
Prisma encapsule ce `BEGIN/COMMIT/ROLLBACK` dans `$transaction` : plus court, plus sûr
(le ROLLBACK est automatique si le callback throw).

### Phrase pour le jury
> « Une transaction garantit que plusieurs écritures liées réussissent ou échouent
> ensemble — c'est l'atomicité d'ACID. Je l'utilise pour créer un voyage et son pack en
> un bloc, et pour sélectionner un pack (4 opérations). Avec Prisma c'est `$transaction` ;
> si le callback lève une erreur, tout est annulé automatiquement. »

---

## 3. Bonus — autres concepts souvent demandés

### JWT en cookie httpOnly (vs localStorage)
- **localStorage** : lisible en JavaScript → vulnérable au **XSS** (un script injecté vole le token).
- **Cookie httpOnly** : **inaccessible au JS** du navigateur → le token ne peut pas être volé par XSS.
- `sameSite: 'strict'` → protection **CSRF**.

### Hashage bcrypt (vs chiffrement)
- Un hash est **à sens unique** : on ne peut pas « déchiffrer » un mot de passe.
- bcrypt est **lent volontairement** → résistant au brute-force. On compare via `bcrypt.compare`.

### Code HTTP 409 Conflict
- Requête **valide** mais en **conflit** avec l'état actuel (ex : email déjà enregistré).
- Différent du `400` (requête mal formée) : ici la donnée est correcte, c'est l'état qui pose problème.

### ORM (Object-Relational Mapping)
- Fait le pont entre les **objets** du code et les **tables** relationnelles.
- `prisma.trip.findMany()` → génère et exécute le `SELECT … FROM trips` correspondant, et
  renvoie des objets JS typés. Le SQL produit est **paramétré** → pas d'injection SQL.
