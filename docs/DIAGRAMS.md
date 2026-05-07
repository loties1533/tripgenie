# 📊 Diagrammes Techniques — TripGenie

Ces diagrammes sont essentiels pour ton Dossier Professionnel et ton oral. Ils prouvent ta capacité à concevoir et à architecturer un système complexe.

---

## 1. Diagramme de Séquence : Orchestration SmartSearch
Ce diagramme montre comment le serveur "orchestre" les différentes APIs pour générer un voyage. C'est l'argument majeur de ta compétence **Back-End**.

```mermaid
sequenceDiagram
    participant U as Utilisateur (React)
    participant S as Serveur Express
    participant AI as IA (Claude/OpenRouter)
    participant T as Tavily (SmartSearch)
    participant P as PredictHQ (Events)
    participant DB as Supabase (PostgreSQL)

    U->>S: POST /api/ai/generate (Params)
    Note over S: Déclenchement de l'orchestration
    
    par Recherche Web & IA
        S->>T: searchWeb(query)
        T-->>S: Résultats de recherche (Vols, Hôtels)
    and Événements
        S->>P: getEvents(destination)
        P-->>S: Liste d'événements réels
    end

    S->>AI: assemblePack(Context + WebData + Events)
    AI-->>S: JSON structuré (Itinéraire, Tagline)

    Note over S: Calcul du Genie Score (Scoring Service)
    
    S->>DB: insert into trips (pack_data)
    DB-->>S: Confirmation (trip_id)

    S-->>U: Pack Complet + trip_id
    Note over U: Affichage dynamique (React)
```

---

## 2. Diagramme de Cas d'Utilisation (Use Case)
Il montre ce que l'utilisateur peut faire sur l'application.

```mermaid
usecaseDiagram
    actor "Utilisateur" as U
    actor "Administrateur" as A
    
    package TripGenie {
      usecase "Discuter avec l'IA (Onboarding)" as UC1
      usecase "Générer un Pack Voyage" as UC2
      usecase "Voter pour des activités (👍/👎)" as UC3
      usecase "S'authentifier (JWT)" as UC4
      usecase "Consulter ses anciens voyages" as UC5
      usecase "Partager un voyage" as UC6
    }
    
    U --> UC1
    U --> UC2
    U --> UC3
    U --> UC4
    U --> UC5
    U --> UC6
    
    A --|> U
    A --> "Modérer les contenus"
```

---

## 3. Diagramme de Base de Données (ERD)
Déjà présent dans ton DP, il valide ta compétence en **Modélisation Relationnelle**.

```mermaid
erDiagram
    USERS ||--o{ TRIPS : "crée"
    TRIPS ||--o{ VOTES : "reçoit"
    TRIPS ||--o{ COLLABORATORS : "partagé avec"
    USERS ||--o{ COLLABORATORS : "est"
    
    USERS {
        uuid id PK
        string email
        string password
    }
    
    TRIPS {
        uuid id PK
        uuid user_id FK
        string destination
        jsonb pack_data
        float score
    }
    
    VOTES {
        uuid id PK
        uuid trip_id FK
        string item_id
        boolean vote_type
    }
```

---

> [!TIP]
> **Pourquoi montrer ces diagrammes au jury ?**
> - **Séquence** : Prouve ta maîtrise de l'asynchronicité (`Promise.allSettled`) et de l'orchestration.
> - **Use Case** : Prouve que tu as compris les besoins utilisateurs (Cahier des charges).
> - **ERD** : Prouve que tu sais structurer des données SQL de manière professionnelle (UUID, FK).
