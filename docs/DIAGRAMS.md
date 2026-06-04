# TripGenie — Diagrammes (sources Mermaid)

> Mis à jour : juin 2026 — branche `feat/postgres-rls`

## 1. Vue d'ensemble — 3 couches

```mermaid
flowchart TB
    subgraph Client["Navigateur — React SPA (client-react)"]
        UI["Pages + Components"]
        Store["Zustand store"]
        Api["lib/api.ts (fetch, credentials include)"]
    end
    subgraph Server["Serveur Express (server/)"]
        Idx["index.ts — helmet, cors, cookieParser, morgan"]
        MW["middleware/ — auth + limiter"]
        Routes["routes/*.ts"]
        Svc["services/*.ts — logique metier"]
        PG["db/pg.ts — query() / withUser()"]
    end
    DB[("PostgreSQL — Supabase + RLS maison")]
    Ext["APIs externes — Gemini, Tavily, Foursquare, PredictHQ, Open-Meteo, Unsplash"]

    UI --> Api
    Api -->|"HTTP /api/*"| Idx
    Idx --> MW --> Routes
    Routes --> Svc
    Routes --> PG
    Svc --> PG
    Svc --> Ext
    PG --> DB
```

## 2. Pipeline génération — POST /api/ai/generate

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant R as React
    participant AI as routes/ai.ts
    participant S as Services externes
    participant P as services/claude/pack.ts
    participant SC as services/scoring.ts
    participant DB as db/pg.ts + PostgreSQL

    U->>R: clique Generer
    R->>AI: POST /api/ai/generate
    AI->>S: Promise.allSettled [vols, events, hotels, meteo, photo]
    AI->>S: foursquareSearch() -> yelpSearch() fallback
    S-->>AI: donnees reelles (best-effort)
    AI->>P: assemblePack(donnees)
    Note over P: calcNights + buildPackPrompt
    Note over P: callAI Gemini->Claude->OpenRouter->Mocks
    Note over P: parsePackResponse 5 strategies
    Note over P: mapFlights + mapActivities + calcBudgetBreakdown
    P-->>AI: pack JSON structure
    AI->>SC: scorepack(pack, mode)
    SC-->>AI: score 0-1 deterministe
    AI->>DB: withUser INSERT trip + pack (1 transaction)
    DB-->>AI: trip_id, pack_id
    AI-->>R: pack + score + isMock
    R-->>U: PackResults (bandeau orange si isMock)
```

## 3. Flux authentification

```mermaid
sequenceDiagram
    participant C as Client
    participant A as routes/auth.ts
    participant F as SECURITY DEFINER
    participant DB as PostgreSQL

    C->>A: POST /login {email, password}
    A->>F: auth_user_by_email(email)
    F->>DB: SELECT role sans BYPASSRLS
    DB-->>F: user + hash
    F-->>A: user
    A->>A: bcrypt.compare + jwt.sign 7d
    A-->>C: Set-Cookie tg_token httpOnly secure sameSite strict
    Note over C,DB: Requetes suivantes : cookie -> requireAuth -> withUser -> RLS
```

## 4. Cascade IA multi-provider

```mermaid
flowchart LR
    Req["callAI()"] --> G{"Gemini ?"}
    G -->|"OK"| Out["JSON"]
    G -->|"echec"| C{"Claude ?"}
    C -->|"OK"| Out
    C -->|"echec"| O{"OpenRouter ?"}
    O -->|"OK"| Out
    O -->|"echec"| M["Mocks isMock=true"]
    M --> Out
```

## 5. Double sécurité RLS

```mermaid
flowchart TB
    Req["Requete authentifiee"] --> B1["Barriere 1 : WHERE user_id = userId"]
    B1 --> B2["Barriere 2 : RLS policy\ncurrent_setting(app.current_user_id)"]
    B2 --> Data["Lignes de l'utilisateur"]
    NoCtx["Sans contexte"] --> Zero["fail-closed : 0 ligne"]
```

## 6. Scoring déterministe

```mermaid
flowchart LR
    Pack["vol, hotel, events, activites, prix"] --> N["normalise vers 0..1"]
    N --> W["MODE_WEIGHTS par mode\nluxury: hotel 40%\nparty: events 40%\nstudent: prix 50%"]
    W --> T["score.total 0-1"]
```

## 7. CI/CD

```mermaid
flowchart LR
    Push["git push"] --> CI["GitHub Actions\nnpm ci + tsc + test:all 204 tests"]
    CI -->|"vert"| Build["Build\ntsc + client:build"]
    CI -->|"rouge"| Stop["Bloque"]
    Build --> Render["Render\nnpm start\ntripgenie.onrender.com"]
```

## 8. assemblePack — 6 fonctions pures

```mermaid
flowchart TD
    A["assemblePack(params)"] --> N["calcNights()"]
    A --> B["buildPackPrompt()"]
    B --> LLM["callAI()"]
    LLM --> P["parsePackResponse() — 5 strategies JSON"]
    A --> F["mapFlights()"]
    A --> Act["mapActivities() — emoji + liens"]
    A --> Bud["calcBudgetBreakdown() — BUDGET_RATIOS"]
    N & P & F & Act & Bud --> Out["Pack complet"]
```
