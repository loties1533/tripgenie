# Diagrammes Techniques — TripGenie

---

## 1. ERD — Modèle Entité-Relation (6 tables)

```mermaid
erDiagram
    USERS ||--o{ TRIPS : "crée"
    USERS ||--o| USER_PREFERENCES : "possède"
    USERS ||--o{ TRIP_COLLABORATORS : "participe à"
    TRIPS ||--o{ PACKS : "contient"
    TRIPS ||--o{ TRIP_COLLABORATORS : "partage avec"
    PACKS ||--o{ TRIP_VOTES : "reçoit"

    USERS {
        uuid id PK
        text email UK
        text password
        text name
        text avatar_url
        timestamptz created_at
    }

    TRIPS {
        uuid id PK
        uuid user_id FK
        text title
        text destination
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
        jsonb pack_data
        boolean selected
        timestamptz created_at
    }

    TRIP_VOTES {
        uuid id PK
        uuid pack_id FK
        text item_id
        text voter_name
        boolean vote_type
        timestamptz created_at
    }

    USER_PREFERENCES {
        uuid user_id PK-FK
        text default_mode
        text[] preferred_prefs
        text home_city
        text currency
        timestamptz updated_at
    }

    TRIP_COLLABORATORS {
        uuid trip_id PK-FK
        uuid user_id PK-FK
        text role
        timestamptz invited_at
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
    participant LLM as callAI()
    participant SC as scorepack()
    participant DB as Supabase (PostgreSQL)

    U->>MW: POST /api/ai/generate
    MW->>MW: Helmet, CORS, rate limiter, optionalAuth
    MW->>R: req validé

    R->>R: Validation Zod (400 si champ manquant)

    par Promise.allSettled — PARALLELE (timeout 30s par service)
        R->>SS: smartFlightSearch()
        SS-->>R: vols reels ou null
    and
        R->>SS: smartHotelSearch()
        SS-->>R: hotels reels ou null
    and
        R->>SS: smartEventsSearch() via PredictHQ ou Tavily
        SS-->>R: evenements ou null
    and
        R->>WE: getRealWeather()
        WE-->>R: meteo ou null
    and
        R->>PH: getDestinationPhoto()
        PH-->>R: url photo ou null
    end

    R->>FSQ: foursquareRestaurantSearch()
    alt Foursquare retourne des résultats
        FSQ-->>R: restaurants[]
    else Foursquare vide — fallback Yelp
        R->>YLP: yelpRestaurantSearch()
        YLP-->>R: restaurants[] ou []
    end

    Note over R: Donnees agregees (partielles si echec d'un service)

    R->>LLM: assemblePack(donnees + prompt adapte au mode)
    LLM-->>R: JSON structure

    R->>R: merge restaurants dans pack.activities

    R->>SC: scorepack(pack, mode, travelers, destination)
    SC-->>R: total 0..1 + details

    alt Utilisateur connecte
        R->>DB: INSERT trips (pack_data JSONB, score, mode)
        DB-->>R: trip_id
        R->>DB: INSERT packs (trip_id, rank=1, pack_data, score)
        DB-->>R: pack_id
    end

    R-->>U: pack + score + trip_id + pack_id + flights_found + events_found
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
    DB-->>S: hash stocke
    S->>S: bcryptjs.compare(password, hash)

    alt Mot de passe correct
        S->>S: jwt.sign({ id, email }, JWT_SECRET, 7j)
        S-->>U: 200 + Set-Cookie tg_token httpOnly secure sameSite=strict
    else Incorrect
        S-->>U: 401 Identifiants invalides
    end

    Note over U: Cookie stocke par le navigateur, inaccessible en JS

    U->>S: GET /api/trips (cookie envoye automatiquement)
    S->>S: extractToken() depuis req.cookies.tg_token
    S->>S: jwt.verify(token, JWT_SECRET)

    alt Token valide
        S->>DB: SELECT * FROM trips WHERE user_id = $1
        DB-->>S: trips[]
        S-->>U: 200 trips
    else Token expire ou invalide
        S-->>U: 401 Session expiree
    end
```

---

## 4. Diagramme de Séquence — Vote Consensus

```mermaid
sequenceDiagram
    participant M as Createur
    participant A as Ami (sans compte)
    participant S as Serveur Express
    participant DB as PostgreSQL

    M->>S: POST /api/ai/generate
    S-->>M: pack + trip_id abc-123 + pack_id xyz-456
    Note over M: Partage le lien /share/abc-123

    A->>S: GET /api/trips/share/abc-123 (sans token)
    Note over S: Route publique — avant requireAuth
    S->>DB: SELECT trips JOIN packs WHERE trip_id = 'abc-123'
    DB-->>S: trip + pack complet
    S-->>A: 200 trip + pack_id

    A->>S: POST /api/votes { pack_id, item_id, vote_type }
    Note over S: Votes sur un pack précis — flight_0, hotel_1, activity_2...
    S->>DB: INSERT trip_votes (pack_id, item_id, voter_name Anonyme)
    S-->>A: 201

    M->>S: GET /api/votes/xyz-456
    S->>DB: SELECT * FROM trip_votes WHERE pack_id = 'xyz-456'
    S-->>M: votes[] résumé consensus
    Note over M: "3 contre l'hôtel" → modifie via chat IA
```

---

## 5. Architecture 3 Couches

```mermaid
graph TB
    subgraph CLIENT["Couche Presentation — React 18 + Vite"]
        P1[Home]
        P2[Trips]
        P3[TripDetail]
        P4[Login]
        ST[Zustand Store]
        API[api.ts — fetch + credentials include]
        P1 & P2 & P3 & P4 --> ST --> API
    end

    subgraph SERVER["Couche Logique Metier — Node.js + Express"]
        IDX[index.ts — Helmet, CORS, Morgan]
        MW[middleware/auth.ts — requireAuth, optionalAuth]
        RT[routes — auth, trips, ai, votes, photos]
        SVC[services — scoring, smartSearch, weather, photo]
        AI[services/claude — core, pack, chat]
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
        E5[Foursquare Places]
        E6[Yelp Fusion]
        E7[PredictHQ Events]
    end

    API -- "HTTPS + Cookie httpOnly" --> IDX
    SVC --> T1 & T2 & T3 & T4 & T5 & T6
    AI --> E1
    SVC --> E2 & E3 & E4 & E5 & E6 & E7
```

---

## 6. Algorithme de Scoring — Flux

```mermaid
flowchart TD
    A[Pack genere par le LLM] --> B[scorepack]

    B --> C1[scoreVol]
    B --> C2[scoreHotel]
    B --> C3[scoreEvents]
    B --> C4[scoreActivities]
    B --> C5[scorePrix]

    C1 & C2 & C3 & C4 & C5 --> D[normalisation 0 a 1]

    D --> E{Mode de voyage}

    E -->|luxury| F1[hotel x0.40 activities x0.30 vol x0.20 prix x0.10]
    E -->|party| F2[events x0.40 prix x0.30 hotel x0.20 vol x0.10]
    E -->|student| F3[prix x0.50 activities_free x0.25 hotel x0.15 events x0.10]
    E -->|group| F4[hotel x0.35 activities x0.30 prix x0.20 vol x0.15]
    E -->|relax| F5[calme x0.35 hotel x0.30 activities x0.25 prix x0.10]

    F1 & F2 & F3 & F4 & F5 --> G[total 0..1 + details par critere]
```

---

## 7. Fallback LLM — Chaîne de Résilience

```mermaid
flowchart TD
    A[callAI appele] --> B{AI_PROVIDER = ollama ?}

    B -->|oui| C[callOllama]
    B -->|non| D[callGemini priorite absolue]

    C -->|erreur| D
    D -->|erreur| E[callClaude]
    E -->|erreur| F[callOpenRouter essaie 12 modeles]
    F -->|tous KO| G[Mode Survie mocks statiques]

    C -->|ok| Z[Reponse retournee]
    D -->|ok| Z
    E -->|ok| Z
    F -->|ok| Z
    G --> Z
```
