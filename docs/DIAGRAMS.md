# Diagrammes Techniques — TripGenie

---

## 1. ERD — Modèle Entité-Relation (6 tables)

```mermaid
erDiagram
    USERS ||--o{ TRIPS : "crée"
    USERS ||--|| USER_PREFERENCES : "possède"
    USERS ||--o{ TRIP_COLLABORATORS : "participe à"
    TRIPS ||--o{ PACKS : "génère"
    TRIPS ||--o{ TRIP_VOTES : "reçoit"
    TRIPS ||--o{ TRIP_COLLABORATORS : "partagé avec"

    USERS {
        uuid id PK
        text email UK
        text password
        text name
        text avatar_url
        timestamptz created_at
        timestamptz updated_at
    }

    TRIPS {
        uuid id PK
        uuid user_id FK
        text title
        text destination
        text country
        text origin
        date departure
        date return_date
        int travelers
        text budget
        text mode
        text status
        float score
        jsonb pack_data
        timestamptz created_at
        timestamptz updated_at
    }

    PACKS {
        uuid id PK
        uuid trip_id FK
        int rank
        float score
        jsonb flight_data
        jsonb hotel_data
        jsonb events_data
        jsonb activities
        jsonb budget_breakdown
        boolean selected
        timestamptz created_at
    }

    USER_PREFERENCES {
        uuid user_id PK_FK
        text default_mode
        text[] preferred_prefs
        text home_city
        text currency
        timestamptz updated_at
    }

    TRIP_VOTES {
        uuid id PK
        uuid trip_id FK
        text item_id
        text voter_name
        boolean vote_type
        timestamptz created_at
    }

    TRIP_COLLABORATORS {
        uuid trip_id PK_FK
        uuid user_id PK_FK
        text role
        timestamptz created_at
    }
```

---

## 2. Diagramme de Séquence — Pipeline de Génération

```mermaid
sequenceDiagram
    participant U as Utilisateur (React)
    participant MW as Middleware Express
    participant R as Route /ai/generate
    participant SS as SmartSearch (Tavily)
    participant WE as Weather (OpenWeatherMap)
    participant PH as Photo (Unsplash)
    participant LLM as callAI() Gemini→OpenRouter→Claude
    participant SC as scorepack()
    participant DB as Supabase (PostgreSQL)

    U->>MW: POST /api/ai/generate { destination, mode, budget... }
    MW->>MW: cookie-parser → Helmet → CORS → rate limiter → optionalAuth
    MW->>R: req validé + req.user si connecté

    R->>R: Validation Zod (400 si champ manquant)

    par Promise.allSettled — PARALLÈLE (timeout 15s)
        R->>SS: smartFlightSearch()
        SS-->>R: vols réels ou null
    and
        R->>SS: smartHotelSearch()
        SS-->>R: hôtels réels ou null
    and
        R->>SS: smartEventsSearch()
        SS-->>R: événements locaux ou null
    and
        R->>WE: getRealWeather()
        WE-->>R: météo ou null
    and
        R->>PH: getDestinationPhoto()
        PH-->>R: url photo ou null
    end

    Note over R: Données agrégées (partielles si échec d'un service)

    R->>LLM: assemblePack(données réelles + prompt adapté au mode)
    alt Gemini disponible
        LLM-->>R: JSON structuré
    else Gemini KO → OpenRouter
        LLM-->>R: JSON structuré
    else OpenRouter KO → Claude
        LLM-->>R: JSON structuré
    else Tous KO → Mocks
        LLM-->>R: données statiques
    end

    R->>SC: scorepack(pack, mode, travelers, destination)
    SC-->>R: { total: 0.78, details: {...} }

    alt Utilisateur connecté (req.user présent)
        R->>DB: INSERT trips (pack_data JSONB, score, mode...)
        DB-->>R: { id: trip_id }
    end

    R-->>U: { pack, score, trip_id, flights_found, events_found }
```

---

## 3. Diagramme de Séquence — Authentification JWT

```mermaid
sequenceDiagram
    participant U as Navigateur (React)
    participant S as Serveur Express
    participant DB as PostgreSQL

    U->>S: POST /api/auth/login { email, password }
    S->>DB: SELECT * FROM users WHERE email = $1
    DB-->>S: { id, email, password_hash }
    S->>S: bcryptjs.compare(password, hash)
    alt Mot de passe correct
        S->>S: jwt.sign({ id, email }, JWT_SECRET, 7j)
        S-->>U: 200 + Set-Cookie: tg_token=JWT (httpOnly, secure, sameSite=strict)
    else Incorrect
        S-->>U: 401 { error: "Identifiants invalides" }
    end

    Note over U: Cookie stocké par le navigateur, inaccessible en JS

    U->>S: GET /api/trips (cookie envoyé automatiquement)
    S->>S: extractToken() → req.cookies.tg_token
    S->>S: jwt.verify(token, JWT_SECRET)
    alt Token valide
        S->>DB: SELECT * FROM trips WHERE user_id = $1
        DB-->>S: trips[]
        S-->>U: 200 { trips }
    else Token expiré
        S-->>U: 401 { error: "Session expirée" }
    else Token invalide
        S-->>U: 401 { error: "Token invalide" }
    end
```

---

## 4. Diagramme de Séquence — Vote Consensus (Lien WhatsApp)

```mermaid
sequenceDiagram
    participant M as Maxime (créateur)
    participant W as WhatsApp Group
    participant A as Ami 1 (sans compte)
    participant S as Serveur Express
    participant DB as PostgreSQL

    M->>S: POST /api/ai/generate
    S-->>M: { pack, trip_id: "abc-123" }
    M->>W: Envoie lien tripgenie.app/share/abc-123

    A->>S: GET /api/trips/share/abc-123 (pas de token)
    Note over S: Route publique — avant router.use(requireAuth)
    S->>DB: SELECT * FROM trips WHERE id = 'abc-123'
    DB-->>S: trip complet
    S-->>A: { trip } — 200

    A->>S: POST /api/votes { trip_id, item_id: "hotel_1", vote_type: true }
    Note over S: Pas d'auth requise sur /api/votes
    S->>DB: INSERT trip_votes (voter_name = "Anonyme")
    DB-->>S: ok
    S-->>A: 201

    M->>S: GET /api/votes/abc-123
    S->>DB: SELECT * FROM trip_votes WHERE trip_id = 'abc-123'
    DB-->>S: votes[]
    S-->>M: { votes } — consensus en temps réel
```

---

## 5. Architecture 3 Couches

```mermaid
graph TB
    subgraph CLIENT["Couche Présentation — React 18 + Vite (port 5173)"]
        P1[Home.tsx\nChatbot onboarding + génération]
        P2[Trips.tsx\nListe des voyages]
        P3[TripDetail.tsx\nDétail + chat modification]
        P4[Login.tsx\nAuth]
        ST[Store Zustand\nSearchStore · ChatStore · AuthStore · ThemeStore]
        API[api.ts\nToutes les requêtes HTTP\ncredentials include]
        P1 & P2 & P3 & P4 --> ST
        ST --> API
    end

    subgraph SERVER["Couche Logique Métier — Node.js + Express (port 3001)"]
        IDX[index.ts\nHelmet · CORS · cookie-parser · Morgan]
        MW[middleware/auth.ts\nrequireAuth · optionalAuth]
        RT[routes/\nauth · trips · ai · votes · photos · packs]
        SVC[services/\nscoring · smartSearch · weather · photo · mocks]
        AI[services/claude/\ncore · pack · chat · analyze]
        IDX --> MW --> RT --> SVC & AI
    end

    subgraph DB["Couche Persistance — PostgreSQL via Supabase"]
        T1[(users)]
        T2[(trips)]
        T3[(packs)]
        T4[(trip_votes)]
        T5[(user_preferences)]
        T6[(trip_collaborators)]
    end

    subgraph EXT["Services Externes"]
        E1[Gemini / OpenRouter / Claude]
        E2[Tavily]
        E3[OpenWeatherMap]
        E4[Unsplash]
    end

    API -- "HTTP + Cookie httpOnly\ncredentials: include" --> IDX
    SVC --> T1 & T2 & T3 & T4 & T5 & T6
    AI --> E1
    SVC --> E2 & E3 & E4
```

---

## 6. Algorithme de Scoring — Flux

```mermaid
flowchart TD
    A[Pack généré par le LLM] --> B[scorepack\npack · mode · travelers · destination]

    B --> C1[scoreVol\nprix · durée · escales]
    B --> C2[scoreHotel\nétoiles · rating · prix/nuit · capacité]
    B --> C3[scoreEvents\nnombre · proportion festifs]
    B --> C4[scoreActivities\ngratuit · premium · calme]
    B --> C5[scorePrix\ntotalPrice normalisé]

    C1 & C2 & C3 & C4 & C5 --> D[normalise\nvalue → 0..1\nmin-max scaling]

    D --> E{Mode de voyage}

    E -->|luxury| F1["hotel×0.40\nactivities×0.30\nvol×0.20\nprix×0.10"]
    E -->|party| F2["events×0.40\nprix×0.30\nhotel×0.20\nvol×0.10"]
    E -->|student| F3["prix×0.50\nactivities_free×0.25\nhotel×0.15\nevents×0.10"]
    E -->|group| F4["hotel×0.35\nactivities×0.30\nprix×0.20\nvol×0.15"]
    E -->|relax| F5["calme×0.35\nhotel×0.30\nactivities×0.25\nprix×0.10"]
    E -->|surprise| F6["global×0.60\noriginalité×0.40"]

    F1 & F2 & F3 & F4 & F5 & F6 --> G["{ total: 0.78,\n  details: { vol, hotel, events, activities, prix } }"]
```

---

## 7. Fallback LLM — Chaîne de Résilience

```mermaid
flowchart TD
    A[callAI appelé] --> B{AI_PROVIDER configuré ?}

    B -->|ollama| C[callOllama]
    B -->|openrouter| D[callOpenRouter]
    B -->|gemini| E[callGemini]
    B -->|autre| F[callGemini en priorité]

    C -->|erreur| F
    D -->|erreur| F
    E -->|erreur| G[callOpenRouter fallback]
    F -->|erreur| G

    G -->|erreur| H[callClaude]
    H -->|erreur| I[Mode Survie]

    I --> J{Contexte ?}
    J -->|onboarding| K[MOCK_ONBOARDING]
    J -->|destinations| L[MOCK_DESTINATIONS]
    J -->|pack| M[MOCK_PACK]

    C & D & E & F & G & H --> Z[Réponse JSON retournée]
    K & L & M --> Z
```
