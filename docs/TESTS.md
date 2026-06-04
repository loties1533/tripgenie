# TripGenie — Stratégie de Tests

> Mis à jour : juin 2026 — branche `feat/postgres-rls`

## Commandes

```bash
npm test              # 4 fichiers core — 77 tests — ~1.8s
npm run test:all      # 14 fichiers complets — 204 tests — ~2.2s
npm run test:unit     # tests unitaires uniquement
npm run test:security # tests sécurité uniquement
npm run test:integration # tests intégration uniquement
```

## Organisation des 204 tests

```
tests/
├── unit/
│   ├── scoring-party.test.ts          15 tests — scoring mode party, fallback nightlife
│   └── smartSearch-hotel.test.ts      12 tests — recherche hôtels, withTimeout()
│
├── services/
│   ├── predictHQ.test.ts              15 tests — événements PredictHQ (place ID, catégories)
│   ├── foursquare.test.ts             17 tests — restaurants (prix, emoji, TheFork URL)
│   └── yelp.test.ts                   10 tests — fallback Yelp (Bearer token, chain FSQ→Yelp)
│
├── security/
│   ├── auth-signup.test.ts            12 tests — inscription (validation, bcrypt, cookie httpOnly)
│   ├── auth-login.test.ts             12 tests — connexion (credentials, JWT, logout)
│   ├── auth-tokens.test.ts            13 tests — expiration, alg:none attack, IDOR, claims
│   └── input-validation.test.ts       15 tests — Zod validation toutes routes IA
│
└── integration/
    ├── api.test.ts                    40 tests — routes HTTP : auth, trips, votes, CORS
    ├── golden_path.test.ts            15 tests — flux critiques bout en bout
    ├── scoring.test.ts                12 tests — algorithme scoring tous les modes
    ├── middleware.test.ts             10 tests — JWT absent/expiré/invalide
    ├── collaborators.test.ts          (intégration)
    ├── packs.test.ts                  (intégration)
    ├── preferences.test.ts            (intégration)
    └── generate-restaurants.test.ts    8 tests — pipeline FSQ→Yelp dans activities
```

**Total : 204 tests, 14 fichiers**

## Ce qui est testé vs ce qui ne l'est pas

### ✅ Bien couvert
- Validation des inputs (Zod, bornes, injections)
- Codes HTTP corrects (200/201/400/401/403/404/409/429)
- Anti-énumération login (même message email inconnu / mauvais mdp)
- JWT : expiration, alg:none attack, IDOR, token dans cookie vs Bearer
- Scoring déterministe (toutes pondérations par mode)
- Adaptateurs Foursquare/Yelp/PredictHQ (fetch mocké)
- Pipeline FSQ→Yelp mergé dans activities

### ❌ Non couvert par Vitest
- **Isolation RLS réelle** : `vi.mock('../server/db/pg.js')` remplace `withUser` par un faux client. Les tests prouvent que la route appelle la bonne requête SQL, pas que PostgreSQL refuse l'accès inter-utilisateurs.
- **Preuve RLS réelle** : `scripts/test-rls.ts` contre la vraie base (6/6 cas validés)
- **Pipeline IA réel** : tout mocké — comportement sur vraies sorties LLM non garanti

## Mocks utilisés

Tous les services externes sont mockés :
- **LLM** : `assemblePack: vi.fn()` retourne un pack statique
- **pg / withUser** : `vi.mock('../server/db/pg.js')` retourne un faux client SQL
- **Foursquare / Yelp / PredictHQ** : `global.fetch = vi.fn()` avant import
- **Rate limiters** : passthrough (sinon les tests se bloquent après 5 requêtes)

## Pattern vi.hoisted()

```typescript
// ❌ CASSÉ — vi.mock() est hoisté avant les const
const mockSingle = vi.fn();
vi.mock('...', () => ({ single: mockSingle })); // ReferenceError !

// ✅ CORRECT
const { mockSingle } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  return { mockSingle };
});
vi.mock('...', () => ({ single: mockSingle })); // OK
```
