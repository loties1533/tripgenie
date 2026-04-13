# 🧞‍♂️ TripGenie AI — Agentic Travel Assistant

**TripGenie** n'est pas un simple moteur de recherche ; c'est un agent de voyage intelligent capable de concevoir, d'affiner et de partager des itinéraires complets en quelques secondes. 

En combinant la puissance des LLM (Gemini/Claude) avec une recherche web en temps réel (**RAG**), TripGenie déniche des "pépites" locales et construit des packs voyage sur-mesure (Vols, Hôtels, Activités, Événements).

---

## ✨ Fonctionnalités Clés

### 🤖 Onboarding Conversationnel
Fini les formulaires austères. Le **Chat TripGenie AI** vous accompagne pour définir votre profil (solo, couple, amis), vos intérêts et votre budget avec une fluidité naturelle.

### 🔍 Recherche Agentique (RAG)
L'IA effectue de véritables recherches sur le web (via **Tavily**) pour s'inspirer des tendances actuelles, évitant ainsi les recommandations obsolètes ou trop génériques.

### 🗺️ Visualisation Interactive
Chaque itinéraire est accompagné d'une **carte interactive** (Leaflet) affichant les marqueurs réels des hébergements (🏨) et des activités (📍).

### 💬 Chat de Raffinement V2
Une fois le pack généré, vous pouvez continuer à discuter avec l'IA pour modifier des détails : *"Change l'hôtel pour un palace"*, *"Ajoute une journée de randonnée"*. L'interface se met à jour en temps réel.

### 🔗 Partage & Co-Planification
Chaque voyage possède son identifiant unique. Générez un **lien de partage public** pour permettre à vos compagnons de voyage de consulter l'itinéraire sans même avoir besoin de compte.

---

## 🛠 Tech Stack

### Frontend
- **Vanilla ES6+ JS** : Performance brute et contrôle total.
- **Modern CSS** : Design Premium, Dark Mode & Glassmorphism.
- **Leaflet.js** : Cartographie interactive légère et performante.

### Backend
- **Node.js / Express** : Architecture robuste et scalable.
- **Supabase** : PostgreSQL pour la persistance, Auth pour la sécurité et stockage JSON des packs.

### Intelligence Artificielle & APIs
- **Multi-LLM Strategy** : Architecture résiliente basculant entre **Gemini 2.0 Flash**, **Claude 3** et **OpenRouter**.
- **Tavily API** : Agentic Web Search pour des données fraîches.
- **Amadeus API** : Recherche de vols réels (Mode Sandbox).
- **PredictHQ API** : Extraction d'événements locaux (concerts, festivals).

---

## 🛡️ Architecture & Résilience

TripGenie est conçu pour ne jamais faillir :
- **Survival Mode** : Si tous les services d'IA sont saturés, un mode de secours prend le relais avec des destinations "pépites" pré-validées.
- **JSON Robustness** : Un parser intelligent assure que les réponses de l'IA sont toujours interprétées correctement, même en cas de formatage imparfait.
- **Timeout Management** : Des garde-fous sur les services tiers (Tavily/Amadeus) garantissent une réponse fluide en moins de 10 secondes.

---

## 🚀 Installation & Lancement

### Préoccupations
Assurez-vous d'avoir Node.js (v18+) installé.

1. **Clonage & Dépendances**
   ```bash
   git clone <repo-url>
   cd tripgenie
   npm install
   ```

2. **Configuration**
   Créez un fichier `.env` à la racine (voir `.env.example`) avec vos clés API :
   - AI : `GEMINI_API_KEY`, `OPENROUTER_API_KEY`
   - Data : `TAVILY_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

3. **Lancement**
   ```bash
   # Terminal 1 : Backend Express
   npm run dev

   # Terminal 2 : Frontend
   npm run client
   ```

---

## 🗺️ Roadmap Future

- [ ] **Google Places Integration** : Récupération des notes et photos réelles pour chaque lieu.
- [ ] **Export PDF Premium** : Itinéraire papier formaté pour l'impression physique.
- [ ] **Booking Contextuel** : Liens directs vers la réservation finale (Affiliation).
- [ ] **PWA Support** : Installation sur mobile sans passer par les stores.

---

*TripGenie — Explorez le monde, l'IA s'occupe du reste.*