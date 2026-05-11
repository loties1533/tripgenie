# TripGenie - Documentation Technique Détaillée (MVP Finale)
**Étape 3 : Spécifications & Architecture**
**Auteur :** Alexis Loties (Projet Solo - Certification)

---

## 1. User Stories & Maquettes (Priorisation MoSCoW)

### Must Have (Essentiel)
*   **Story 1** : En tant qu'utilisateur, je veux dialoguer naturellement avec un concierge IA pour définir mes envies de voyage (destinations, ambiance, budget), afin de ne pas remplir de longs formulaires complexes.
*   **Story 2** : En tant qu'utilisateur, je veux un itinéraire précis basé sur des données web réelles (Vols, Hôtels, Activités), afin d'avoir une estimation fiable du coût et de la faisabilité de mon séjour.
*   **Story 3** : En tant qu'utilisateur, je veux pouvoir m'inscrire et me connecter, afin de conserver mes voyages dans un espace personnel sécurisé.

### Should Have (Important)
*   **Story 4** : En tant qu'utilisateur, je veux voir la météo en direct et des photos HD de ma destination, pour mieux me projeter visuellement dans mon futur voyage.
*   **Story 5** : En tant qu'utilisateur, je veux pouvoir voter pour mes éléments préférés (hôtels ou activités) au sein d'un pack, afin de garder une trace de mes coups de cœur.
*   **Story 6** : En tant qu'utilisateur, je veux pouvoir consulter l'historique de tous mes voyages générés, afin de retrouver une ancienne planification en un clic.

### Could Have (Bonus)
*   **Story 7** : En tant qu'utilisateur, je veux pouvoir partager mon itinéraire via WhatsApp, afin de coordonner facilement mon projet de voyage avec mes proches.
*   **Story 8** : En tant qu'utilisateur, je veux pouvoir basculer entre le mode sombre et le mode clair, afin d'adapter l'interface à mon confort visuel et à mon environnement.
*   **Story 9** : En tant qu'utilisateur, je veux une interface fluide et "responsive", afin de pouvoir consulter mes détails de voyage confortablement sur mon smartphone.
*   **Story 10** : En tant qu'utilisateur, je veux voir les liens officiels des établissements suggérés, afin de pouvoir effectuer mes réservations finales en toute confiance.

---

## 2. Architecture du Système (MVP)

### Diagramme de Haut Niveau & Flux de Données
```mermaid
graph TD
    User((Utilisateur)) <--> Frontend[React / Vite]
    Frontend <--> Backend[Node.js / Express]
    
    %% Services Internes
    Backend <--> DB[(Supabase / PostgreSQL)]
    Backend <--> Auth[Supabase Auth / JWT]

    %% API Externes
    Backend <--> AI[Anthropic - Claude 3.5]
    Backend <--> Search[Tavily - Web Search Agent]
    Backend <--> Photos[Unsplash API - Photos HD]
    Backend <--> Payments[Stripe API - Réservations]

    %% Flux internes complexes
    AI -.-> |Demande de données fraîches| Search
    Search -.-> |Retourne Vols/Hôtels/Météo| AI
```

### Description du Flux de Données
1.  **Interaction Utilisateur** : L'utilisateur envoie une requête via le `Frontend`.
2.  **Orchestration Backend** : Le `Backend` vérifie l'identité via `Supabase Auth`.
3.  **Intelligence Agentique** : Le `Backend` sollicite `Claude 3.5` qui orchestre une recherche via `Tavily` pour obtenir des données réelles (météo, vols, hôtels).
4.  **Enrichissement Visuel** : Le `Backend` récupère des visuels via `Unsplash` pour chaque destination.
5.  **Persistance** : Le pack final est stocké dans la `DB (Supabase)` pour consultation ultérieure.
6.  **Transaction (Optionnel)** : Le flux se termine par une session `Stripe` pour la validation de la réservation.

---

## 3. Conception Technique (Composants & Classes)

### Architecture des Classes (Backend - Node.js)
Le backend est structuré en services modulaires. Voici les classes clés qui pilotent la logique métier :

```mermaid
classDiagram
    class AIService {
        +assemblePack(webData: Object) : Object
        +chatIntake(message: String) : String
        +generateItinerary(prompt: String) : String
    }
    class SearchAgent {
        +searchFlights(query: String) : Array
        +searchHotels(query: String) : Array
        +searchEvents(query: String) : Array
    }
    class DBService {
        +saveTrip(userId: UUID, data: Object) : Promise
        +getTrips(userId: UUID) : Array
    }

    AIService --> SearchAgent : "Récupère les données réelles"
    AIService --> DBService : "Persistance des packs"
```

*   **AIService** : C'est le cerveau de l'application. Sa méthode `assemblePack` fusionne les données web avec le contexte utilisateur.
*   **SearchAgent** : Gère l'interface avec Tavily AI. Ses méthodes extraient les meilleurs prix et disponibilités en temps réel.
*   **DBService** : Gère les interactions avec Supabase pour la lecture/écriture sécurisée des données.

### Composants de l'Interface (Frontend - React)
L'UI est découpée en composants autonomes pour garantir une expérience fluide :

*   **ChatWidget** : Interface de dialogue. Il capture les besoins de l'utilisateur et affiche les réponses de l'IA.
*   **ResultsView** : Orchestre l'affichage du pack voyage. Il utilise des "sub-components" pour rendre les cartes d'hôtels et de vols.
*   **TripCard** : Affiche les détails HD d'une suggestion (Unsplash) et gère l'état local des votes utilisateur.
*   **AuthLayout** : Gère les formulaires de connexion/inscription via le provider Supabase.

### Conception de la Base de Données (Modèle Entité-Relation)
Le choix de **PostgreSQL** a été fait pour garantir l'intégrité des données et la flexibilité du stockage des itinéraires via le type `JSONB`.

```mermaid
erDiagram
    USER ||--o{ TRIP : "organise"
    USER ||--o{ VOTE : "émet"
    TRIP ||--o{ VOTE : "reçoit"

    USER {
        uuid id PK
        string email
        string password_hash
        timestamp created_at
    }

    TRIP {
        uuid id PK
        uuid user_id FK
        string destination
        jsonb pack_data "Contenu de l'itinéraire IA"
        timestamp created_at
    }

    VOTE {
        bigint id PK
        uuid user_id FK
        uuid trip_id FK
        string item_id "ID de l'hôtel ou activité"
        string type "hotel | activity"
        timestamp created_at
    }
```

---

## 4. Diagrammes de Séquence (Flux Principal)

### Génération d'un Itinéraire Signature
```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend
    participant B as Backend
    participant T as Tavily Agent
    participant C as Claude AI

    U->>F: "Je veux un week-end à Monaco"
    F->>B: POST /api/ai/generate
    B->>T: Recherche Web (Météo, Hôtels 5*, Vols)
    T-->>B: Données réelles extraites
    B->>C: Prompting + Context Web
    C-->>B: Itinéraire structuré (JSON)
    B-->>F: Pack Voyage VIP
    F-->>U: Affichage des résultats & Photos HD
```

---

## 5. Spécifications API REST (Internes & Externes)

### API Externes
*   **Tavily AI** : Agent de recherche web pour les données fraîches.
*   **Claude 3.5 Sonnet** : Logique de conciergerie et structuration JSON.
*   **Unsplash** : API de visuels haute résolution.

### Points d'entrée Internes
| Méthode | Path | Description |
| :--- | :--- | :--- |
| POST | `/api/auth/login` | Connexion utilisateur (JWT). |
| POST | `/api/ai/generate` | Orchestration de l'IA et génération du pack. |
| GET | `/api/trips` | Historique des voyages sauvegardés. |

---

## 6. Plans SCM & QA

### SCM (Git Flow)
*   **Branches** : Utilisation de branches de fonctionnalités (`feat/`) fusionnées vers `main` après validation.
*   **Commits** : Norme *Conventional Commits* pour une traçabilité claire.

### QA (Assurance Qualité)
*   **Tests** : Validation manuelle des flux critiques et tests de structure JSON via Vitest.
*   **Outils** : Postman pour le debug API et ESLint pour la qualité de code.

---

## 7. Justifications Techniques
*   **Tavily AI** : Choisi pour sa capacité à fournir des résultats web structurés, éliminant les hallucinations sur les prix et les disponibilités.
*   **Claude 3.5** : Meilleur modèle actuel pour le "JSON Output", crucial pour le rendu frontend sans erreurs.
*   **Supabase** : Solution BaaS performante permettant de se concentrer sur l'IA plutôt que sur l'infrastructure DB.
