# TripGenie V2 : De Chatbot Statique à Agent IA Dynamique (RAG & Web Search)

Ce document décrit l'état de l'art actuel du projet TripGenie (V1) et pose l'architecture technique nécessaire pour la prochaine évolution majeure : transformer l'IA en un véritable **Agent Autonome** capable d'exploiter le web en temps réel.

---

## 1. État actuel du projet (V1) - La Fondation

La version 1 actuelle est un prototype avancé ("Production Ready" pour une bêta), doté d'une architecture client/serveur robuste.

### Stack Technologique Utilisée
*   **Frontend (L'interface) :** 
    *   **Technologies :** HTML5, CSS3 Natif, Vanilla JavaScript (ES Modules).
    *   **Cartographie :** Leaflet.js avec API OpenStreetMap (Nominatim).
    *   **Serveur :** Serveur statique léger sur le `port 3001` (`npm run client`).
*   **Backend (Le serveur) :** 
    *   **Technologies :** Node.js avec **Express.js** (`port 3000`).
    *   **Logique IA :** Appels directs aux API de LLM (Large Language Models) via des fetch standards.
    *   **Fallback Automatique :** Système en cascade (Google Gemini → OpenRouter Llama/Gemma → Fallback JSON manuel).
*   **Bases de Données & Authentification :** 
    *   **Supabase** (PostgreSQL) : Gestion des utilisateurs (Google/Email) et stockage persistant de l'historique ("Mes Voyages").
*   **APIs Tiers (Fournisseurs de données) :** 
    *   **Amadeus :** Recherche et tarification des vols.
    *   **PredictHQ :** Recherche d'événements locaux.

> [!NOTE]
> **Limitation V1 : Connaissance Paramétrique**
> Actuellement, l'IA génère les destinations, le climat et les conseils de manière théorique, en puisant uniquement dans les mots et concepts qu'elle a appris pendant son entraînement. Elle n'effectue aucune recherche sur internet "en direct".

---

## 2. Le Futur (V2) : Les 3 Piliers de l'Amélioration Agentique

Pour que TripGenie base ses recommandations sur la réalité et non sur des probabilités textuelles, nous allons intégrer un **Raisonnement avec Outils (Tool Use / Function Calling)**.

### Pilier A : L'intégration d'un Agent Web (Recherche en Temps Réel)
*   **Concept :** Au lieu de demander `Suggère une ville étudiante pas chère`, le nouveau backend dira à l'IA : `Tu as à ta disposition l'outil "Recherche Web". Cherche d'abord sur internet quelles sont les villes européennes les moins chères en ce moment pour faire la fête.`
*   **Technologie cible :** 
    *   Remplacement de la logique simple par un framework agentique : **LangChain.js** ou **Vercel AI SDK Core**.
    *   **API de Recherche :** Tavily Search API (Spécialisée pour les IAs) ou SerpAPI (Google Search API).

### Pilier B : L'Intégration de preuves (Avis et Lieux Réels)
*   **Concept :** Les hôtels et activités ne doivent plus être imaginés par l'IA. Ils doivent provenir d'une base de données locale ou d'un service d'avis.
*   **Processus (Pipeline) :**
    1. L'Agent Web décide de la destination (ex: Prague).
    2. Le backend exécute automatiquement une requête vers **Google Places API** ou **TripAdvisor API**.
    3. Le serveur récupère les 3 meilleurs "Hôtels" et "Clubs/Bars" réels notés plus de 4.5 étoiles.
    4. Ces établissements réels sont passés de force à l'IA pour qu'elle rédige l'itinéraire en les incluant obligatoirement.

### Pilier C : Base RAG (Retrieval-Augmented Generation) pour l'hyper-spécialisation
*   **Concept :** TripGenie doit donner l'impression d'être écrit par un influenceur voyage (ex: Le Routard). 
*   **Technologie cible :** 
    *   **Base de données Vectorielle (Vector DB) :** Pinecone ou Supabase pgvector.
    *   On stockera des articles de blogs spécialisés (ex: "Conseils pour Ibiza en été 2025"). 
    *   Avant de répondre à l'utilisateur, l'IA piochera dans ces articles pour en extraire l'essence (un vrai conseil pour éviter les pièges à touristes).

---

## 3. Plan d'Implémentation Technique proposé

🚨 **User Review Required :** La mise en place de la V2 demande des choix sur l'infrastructure. Lisez les propositions ci-dessous.

### Phase 2.1 : Refonte du Pipeline IA vers "Function Calling"
#### [NEW] `server/services/agent.js`
Nous allons créer un nouveau module orchestrateur qui supportera les appels de fonctions natives des LLMs. Au lieu d'attendre un simple JSON, le LLM renverra une "requête d'outil" (ex: `call_function("search_google", { query: "Météo actuelle à Prague" })`).
#### [MODIFY] `server/services/claude.js`
Remplacer les appels `fetch` basiques par l'intégration du standard *Function Calling* (compatible OpenAI, Anthropic et Gemini).

### Phase 2.2 : Implémentation des outils de recherche
#### [NEW] `server/services/tools/webSearch.js`
Script servant de pont entre l'Agent et l'API Tavily/SerpAPI.
#### [NEW] `server/services/tools/places.js`
Intégration d'un SDK pour Google Places (récupération de la note, nom exact, et prix moyen d'un restaurant ou d'un hôtel ciblé).

---

## Open Questions

> [!IMPORTANT]
> Pour valider la direction de cette V2 Architecturale, j'ai besoin de savoir :
> 1. **Priorité :** Veux-tu qu'on commence par la recherche Google pure (Trouver la destination dynamiquement) ou par la fiabilité des lieux (Avoir de vrais hôtels/restaurants via TripAdvisor/Google Places) ?
> 2. **Fournisseurs API :** L'intégration de Google Places et de la recherche Web demande la création de clés gratuites (Google Cloud Platform / Tavily). Es-tu prêt à configurer ces deux comptes ?

---

## Verification Plan

### Automated Tests
- Lancer un script serveur indépendant (`test_agent.js`) qui force l'IA à rechercher la "Météo actuelle sur l'île de Pâques" pour vérifier si elle parvient à extraire l'information du web avant de donner son Pack Voyage.

### Manual Verification
- Côté front-end, générer un voyage en tant qu'utilisateur. Vérifier que l'hôtel proposé existe *réellement* sur Google Maps en comparant son nom exact.
