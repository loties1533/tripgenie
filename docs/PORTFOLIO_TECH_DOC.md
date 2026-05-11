# TripGenie - Documentation Technique Détaillée (MVP Finale)
**Étape 3 : Spécifications & Architecture**
**Auteur :** Alexis Loties (Projet Solo - Certification)

---

## 1. User Stories & Maquettes (Priorisation MoSCoW)

### Must Have (Essentiel)
*   **Story 1** : En tant qu'utilisateur, je veux dialoguer naturellement avec un concierge IA pour définir mes envies de voyage (destinations, ambiance, budget).
*   **Story 2** : En tant qu'utilisateur, je veux un itinéraire précis basé sur des données web réelles (Vols, Hôtels, Activités) pour éviter les hallucinations de l'IA.
*   **Story 3** : En tant qu'utilisateur, je veux pouvoir sauvegarder mes itinéraires dans un espace personnel sécurisé.

### Should Have (Important)
*   **Story 4** : En tant qu'utilisateur, je veux voir la météo en temps réel et des photos HD de ma destination pour une immersion totale.
*   **Story 5** : En tant qu'utilisateur, je veux pouvoir voter pour mes éléments préférés du pack pour affiner mes choix.

---

## 2. Architecture du Système

### Diagramme d'Infrastructure
```mermaid
graph TD
    User((Utilisateur)) <--> Frontend[React / Vite]
    Frontend <--> Backend[Node.js / Express]
    Backend <--> AI_Engine[Orchestrateur Claude 3.5]
    Backend <--> Search_Agent[Tavily Web Search Agent]
    Backend <--> DB[(Supabase / PostgreSQL)]
    AI_Engine <--> Search_Agent
```

---

## 3. Conception Technique (Classes & Base de Données)

### Diagramme de Services (Backend)
```mermaid
classDiagram
    class AIService {
        +chatIntake(message)
        +assemblePack(webData)
        +generateItinerary(prompt)
    }
    class SearchAgent {
        +searchFlights(query)
        +searchHotels(query)
        +searchEvents(query)
    }
    class DBService {
        +saveTrip(userId, data)
        +getTrips(userId)
    }

    AIService --> SearchAgent : "Récupère les données réelles"
    AIService --> DBService : "Persistance des packs"
```

### Schéma de Données (Supabase)
*   **Table `users`** : Gestion des comptes et sessions.
*   **Table `trips`** : Stockage des packs (format JSONB pour une flexibilité maximale des itinéraires).
*   **Table `votes`** : Enregistrement des préférences utilisateurs.

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
