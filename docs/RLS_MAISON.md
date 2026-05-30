# RLS « maison » — Sécurité au niveau base de données

> **Récap de conception (BDD + back-end sécurité)** pour le Dossier Professionnel et l'oral RNCP5 DWWM.
> Branche : `feat/postgres-rls` · Date : 30/05/2026
> Statut : **socle posé et prouvé (6/6 tests verts)** — migration des routes à suivre.

---

## 1. En une phrase

On a ajouté une **2ᵉ barrière de sécurité au niveau de PostgreSQL lui-même** (Row Level Security), gérée par **notre propre code** — pas par Supabase Auth — pour que l'isolation des données entre utilisateurs soit garantie par la base, et plus seulement par le code applicatif.

---

## 2. Le problème de départ

Avant, la sécurité reposait sur **une seule barrière** : le filtre applicatif.

```js
// Sur CHAQUE requête, à la main :
supabase.from('trips').select('*').eq('user_id', req.user.id)
```

Deux faiblesses :

1. **Si un développeur oublie un `.eq('user_id', …)`** sur une seule requête → fuite de données entre utilisateurs. Rien dans la base ne l'empêche.
2. Le code se connecte avec la **`SERVICE_KEY`** de Supabase (rôle `service_role`), qui a l'attribut **`BYPASSRLS`** : même si des policies RLS existaient, elles seraient **ignorées**. Les policies du `schema.sql` d'origine utilisaient `auth.uid()`, une fonction de **Supabase Auth qu'on n'utilise pas** (on a notre propre JWT) → elles étaient inertes de toute façon.

**Conclusion** : le RLS existait sur le papier mais ne protégeait rien. La sécurité tenait à la rigueur du code, sans filet.

---

## 3. La solution : RLS auto-gérée (défense en profondeur)

On recrée le RLS pour qu'il lise **notre** contexte utilisateur, via un **rôle PostgreSQL dédié sans BYPASSRLS**. Trois briques.

### Brique 1 — Un rôle applicatif dédié, au privilège minimal

```sql
CREATE ROLE tripgenie_app
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
```

- **`NOBYPASSRLS`** = le point clé : ce rôle **ne peut pas** contourner le RLS. Les policies s'appliquent vraiment à lui.
- Droits accordés : **DML uniquement** (`SELECT, INSERT, UPDATE, DELETE`), **jamais de DDL** → il ne peut pas modifier le schéma. C'est le **principe du moindre privilège**.
- Il n'est **pas propriétaire** des tables (sinon il les contournerait aussi).

### Brique 2 — Une variable de session posée par requête

À chaque requête authentifiée, on ouvre une transaction et on y fixe l'identité de l'utilisateur courant :

```sql
SELECT set_config('app.current_user_id', $1, true);
```

- `$1` = **paramètre lié** (l'UUID de l'utilisateur) → **aucune concaténation SQL = aucune injection possible**.
- 3ᵉ argument `true` = **transaction-local** : la variable **meurt au `COMMIT`/`ROLLBACK`**. Indispensable car le pool **réutilise les connexions** — sans ça, l'identité « collerait » à la connexion et **fuiterait** vers la requête de l'utilisateur suivant.

> Pourquoi pas `SET LOCAL app.current_user_id = …` ? Parce que `SET LOCAL` **n'accepte pas** de paramètre lié → il faudrait injecter l'UUID dans la chaîne SQL (risque d'injection). `set_config(name, val, true)` accepte le paramètre lié **et** est transaction-local. C'est le bon outil.

### Brique 3 — Les policies lisent notre variable

```sql
CREATE POLICY "trips_own_data" ON trips FOR ALL
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
```

- `current_setting(…, true)` : le 2ᵉ argument `true` renvoie **NULL** si la variable n'est pas posée (au lieu de lever une erreur).
- `NULLIF(…, '')` : transforme une chaîne vide en NULL.
- **Résultat : si aucun utilisateur n'est posé → NULL → aucune ligne ne correspond.** C'est le comportement **fail-closed** : en cas d'oubli, on ne voit **rien** (le défaut le plus sûr).

Policies créées sur : `users`, `trips`, `packs`, `user_preferences`, `trip_collaborators`.
`trip_votes` reste **public** (votes entre amis via lien de partage) — inchangé.

---

## 4. Le cœur côté code : `withUser()`

`server/db/pg.ts` expose une fonction qui encapsule tout le cycle :

```
withUser(userId, fn) :
  1. prend une connexion du pool
  2. BEGIN                                        (ouvre une transaction)
  3. SELECT set_config('app.current_user_id', $1, true)   (pose l'identité)
  4. fn(client)                                   (les requêtes sont filtrées par le RLS)
  5. COMMIT  (ou ROLLBACK si erreur)              (l'identité meurt ici)
  6. release()                                    (rend la connexion au pool)
```

Côté infrastructure : connexion SQL **directe** via le driver natif `pg` (pas l'API PostREST de Supabase), sur le **Session pooler** Supabase (compatible IPv4, port 5432), en **TLS** (imposé par Supabase, géré dans `pg.ts`).

---

## 5. Ce qu'on a prouvé (script `scripts/test-rls.ts` → 6/6 ✅)

| Test | Garantie démontrée |
|------|--------------------|
| Connecté en `tripgenie_app` | On n'utilise plus le rôle privilégié de Supabase |
| `rolbypassrls = false` | Le rôle **ne peut pas** contourner le RLS — la barrière est réelle |
| Sans contexte → **0 ligne** | **Fail-closed** : oublier de poser l'utilisateur ne révèle rien |
| A voit son voyage | Le contexte ouvre bien l'accès aux **propres** données |
| A ne voit pas B / B ne voit pas A | **Isolation inter-utilisateurs garantie par la base** |

Le script crée 2 utilisateurs + 1 voyage chacun, vérifie l'isolation, puis **nettoie tout** (bloc `finally`).

---

## 6. Schéma : avant / après

```
AVANT (1 barrière) :
  Requête → [ filtre applicatif .eq('user_id') ] → BDD (RLS contourné par SERVICE_KEY)
            ▲ si oubli = fuite

APRÈS (2 barrières — défense en profondeur) :
  Requête → [ filtre applicatif ] → [ RLS PostgreSQL (rôle NOBYPASSRLS) ] → BDD
                                     ▲ même en cas d'oubli applicatif,
                                       la base refuse les lignes d'autrui
```

---

## 7. Ce qui reste à faire (migration des routes, par étapes)

Le socle est posé mais **aucune route n'utilise encore `withUser()`** — l'app tourne toujours via `supabase.ts` + `SERVICE_KEY`. La bascule se fait **une route à la fois**, en testant à chaque étape :

1. **Routes « voyages »** (`trips.js`) en premier — cas le plus simple.
2. **Cas spéciaux**, via fonctions `SECURITY DEFINER` :
   - **Auth** (signup / login / recherche par email) : se passe *avant* qu'un utilisateur soit identifié → `app.current_user_id` pas encore posé → la policy bloquerait tout.
   - **Partage public** (`GET /api/trips/share/:id`) : pas d'utilisateur connecté.
3. **Nettoyage final** : retirer `supabase-js` + la `SERVICE_KEY` quand plus aucune route n'en dépend.

---

## 8. Pour l'oral — phrases prêtes

- *« La sécurité des données utilisateur repose sur de la **défense en profondeur** : un filtre applicatif **et** un Row Level Security au niveau PostgreSQL. »*
- *« Le RLS est géré par **mon** code, pas par Supabase Auth : un rôle dédié **sans BYPASSRLS**, une variable de session **transaction-locale** posée par requête, et des policies qui la lisent. »*
- *« Le comportement par défaut est **fail-closed** : sans contexte utilisateur, la base ne renvoie **aucune** ligne. L'oubli d'un filtre ne provoque pas de fuite, il provoque un blocage. »*
- *« J'applique le **principe du moindre privilège** : le rôle applicatif a uniquement les droits de lecture/écriture des lignes, jamais de modification du schéma. »*
- *« Supabase n'est qu'un **hébergeur PostgreSQL** : toute la sécurité — auth, routes, RLS — est dans mon code. »*

### Questions jury anticipées

**« Pourquoi ne pas avoir utilisé le RLS de Supabase directement ? »**
> Le RLS de Supabase repose sur `auth.uid()`, donc sur Supabase Auth, que je n'utilise pas (j'ai mon propre JWT). J'ai donc recréé le RLS pour qu'il lise ma propre variable de session, avec un rôle dédié. La sécurité reste entièrement dans mon code.

**« Comment évites-tu qu'une connexion réutilisée fuite l'identité d'un utilisateur ? »**
> La variable `app.current_user_id` est **transaction-locale** (`set_config(…, true)`) : elle meurt au COMMIT. Le pool peut réutiliser la connexion sans risque, car l'identité ne survit jamais à la transaction.

**« Et si tu oublies de filtrer une requête ? »**
> C'est tout l'intérêt : la base bloque. Sans `app.current_user_id` posé, la policy ne matche aucune ligne (fail-closed). C'est exactement le filet que le filtre applicatif seul n'offrait pas.

---

## 9. Glossaire express

- **RLS (Row Level Security)** : sécurité au niveau **ligne** dans PostgreSQL — des policies décident, ligne par ligne, ce qu'un rôle peut voir/modifier.
- **Policy** : règle SQL (`USING …`) attachée à une table, évaluée à chaque requête.
- **`BYPASSRLS`** : attribut d'un rôle qui lui fait **ignorer** tout RLS. On le **refuse** (`NOBYPASSRLS`) sur notre rôle applicatif.
- **GUC / variable de session** (`current_setting`/`set_config`) : variable de configuration runtime, ici détournée pour transporter l'identité de l'utilisateur dans la transaction.
- **Fail-closed** : en cas d'absence d'info, on **refuse** par défaut (le contraire de fail-open, qui laisserait passer).
- **Défense en profondeur** : empiler plusieurs barrières indépendantes, pour qu'une faille seule ne suffise pas.
- **Moindre privilège** : ne donner que les droits strictement nécessaires (ici : DML, pas DDL).
- **`SECURITY DEFINER`** : fonction SQL qui s'exécute avec les droits de son **créateur**, pas de l'appelant — servira aux cas auth/partage public.
