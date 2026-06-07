# TripGenie — Branche `mvp-DEMODAY`

Version demo day : **PostgreSQL local (Docker) + ORM Prisma**, sans Supabase.

## Ce qui change par rapport à `main`

| | `main` (feat/postgres-rls) | `mvp-DEMODAY` |
|---|---|---|
| Base de données | PostgreSQL hébergé sur Supabase | PostgreSQL local via Docker |
| Accès DB | driver `pg` brut + SQL + RLS maison | **ORM Prisma** |
| Migrations | fichiers SQL joués à la main | `prisma migrate` (versionnées, auto) |
| Isolation données | filtre applicatif `user_id` + RLS Postgres | filtre applicatif `where: { user_id }` |
| Visualisation | — | **Prisma Studio** (`npm run prisma:studio`) |

> L'ancienne URL Supabase est sauvegardée dans `.env.backup-supabase` (gitignoré).

## Démarrage (3 commandes)

```bash
# 1. Lancer PostgreSQL en local (port 5433)
docker run -d --name tripgenie-db \
  -e POSTGRES_PASSWORD=demo -e POSTGRES_USER=postgres -e POSTGRES_DB=tripgenie \
  -p 5433:5432 postgres:16

# 2. Créer les tables + générer le client Prisma
npm run prisma:migrate      # applique les migrations
npm run db:seed             # données de démo (compte demo@tripgenie.fr / demo1234)

# 3. Lancer l'app
npm run dev                 # API sur http://localhost:3000
```

`DATABASE_URL` (déjà dans `.env`) :
```
postgresql://postgres:demo@localhost:5433/tripgenie?schema=public
```

## Scripts Prisma

| Commande | Effet |
|----------|-------|
| `npm run prisma:studio` | **Navigateur visuel** de la base (http://localhost:5555) — idéal pour la démo |
| `npm run prisma:migrate` | Crée + applique une migration depuis `schema.prisma` |
| `npm run prisma:generate` | Régénère le client TypeScript typé |
| `npm run db:seed` | Insère les données de démonstration |
| `npm run db:reset` | Réinitialise la base (⚠️ efface tout) |

## Architecture Prisma

```
prisma/
├── schema.prisma        # 6 modèles : User, Trip, Pack, TripVote,
│                        #             UserPreference, TripCollaborator
├── migrations/          # migrations versionnées (générées)
└── seed.ts              # données de démo

server/db/prisma.ts      # client Prisma singleton (remplace pg.ts)
server/routes/*.ts       # toutes les routes utilisent prisma.X.method()
```

### Choix technique : champs en `snake_case`
Le contrat d'API (frontend + types + tests) est en `snake_case`
(`pack_data`, `user_id`, `return_date`...). Les champs Prisma sont nommés
en `snake_case` pour que l'ORM renvoie directement le bon format —
**zéro couche de transformation**, source de vérité unique.

## Tests

```bash
npm run test:all     # 282 tests (Prisma mocké via vi.hoisted)
```

Les tests mockent `server/db/prisma.js` — aucun accès base réel nécessaire.

## Questions jury anticipées

**« Pourquoi un ORM maintenant ? »**
> Prisma apporte un schéma déclaratif unique (`schema.prisma`), des migrations
> versionnées et automatiques (fini le SQL joué à la main), et un client
> entièrement typé qui détecte les erreurs à la compilation. Le SQL généré
> reste paramétré → pas d'injection.

**« Pourquoi Docker pour la base ? »**
> La base tourne à l'identique sur n'importe quelle machine en une commande,
> sans dépendre d'un service externe. Parfait pour une démo reproductible.

**« Comment garantis-tu l'isolation entre utilisateurs sans le RLS ? »**
> Chaque requête protégée filtre par `where: { user_id }`, l'id venant du JWT
> vérifié. Les lectures publiques (partage) utilisent un `select` explicite
> qui n'expose aucune donnée utilisateur. Testé : User B reçoit 404 sur le
> voyage de User A.
