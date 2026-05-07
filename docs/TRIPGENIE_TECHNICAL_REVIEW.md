# 📘 TRIPGENIE : REVUE TECHNIQUE & ARCHITECTURE
*Document de référence pour le Dossier Professionnel RNCP 5*

---

## 1. VISION ET OBJECTIF DU PROJET
**TripGenie** est une application web "Full-Stack" innovante qui repense la planification de voyage grâce à l'Intelligence Artificielle. Contrairement aux comparateurs classiques, TripGenie utilise une approche **"Agentique"** : l'IA converse avec l'utilisateur, extrait ses besoins implicites, puis orchestre de manière autonome plusieurs APIs externes pour assembler un pack de voyage complet (vols, hôtels, activités) cohérent avec le profil et le budget.

## 2. ARCHITECTURE GLOBALE
L'application repose sur une architecture moderne, séparant clairement le client (Frontend) et le serveur (Backend), garantissant modularité et scalabilité.

### 🖥️ Frontend (Client React)
*   **Technologie** : React.js (via Vite) pour des performances optimales.
*   **Styling** : Tailwind CSS combiné à Framer Motion pour des animations fluides et une interface "Premium" (Dark Mode par défaut).
*   **State Management** : Utilisation avancée de **Zustand**. L'état est découpé en plusieurs stores modulaires (`SearchStore`, `ChatStore`, `AuthStore`) avec persistance des données.
*   **Composants Modulaires** : Architecture par composants isolés (ex: `VoteButtons.jsx`) pour faciliter les tests unitaires et la réutilisabilité.

### ⚙️ Backend (API Express.js)
*   **Framework** : Node.js avec Express, structuré selon les standards MVC (Routes, Controllers/Services, Middlewares).
*   **Sécurité** : Protection par `Helmet`, gestion des CORS stricts, et `express-rate-limit` pour prévenir les abus sur les endpoints d'IA.
*   **Orchestration d'API (Le Cerveau)** : Le backend agit comme un chef d'orchestre. Il contacte l'IA (Claude/OpenRouter), puis interroge en parallèle Tavily (Recherche Web agentique) et PredictHQ (Événements) pour enrichir la réponse avec des données réelles et fraîches.

### 🗄️ Base de Données (Supabase / PostgreSQL)
La modélisation respecte strictement les standards relationnels enseignés à Holberton School :
*   **Identifiants Robustes** : Utilisation systématique d'**UUID** (`uuid_generate_v4()`) pour prévenir les attaques d'énumération.
*   **Intégrité Référentielle** : Clés étrangères (`REFERENCES`) et suppressions en cascade (`ON DELETE CASCADE`).
*   **Many-to-Many** : Implémentation d'une table de jonction (`trip_collaborators`) avec clé primaire composée pour gérer le partage de voyages entre utilisateurs.
*   **Flexibilité** : Utilisation du type `JSONB` pour stocker les objets complexes renvoyés par l'IA sans casser le schéma relationnel.

---

## 3. FONCTIONNALITÉS CLÉS ET LOGIQUE MÉTIER

### A. Onboarding Conversationnel (Chatbot IA)
Au lieu d'un formulaire ennuyeux, l'utilisateur discute avec un bot.
*   **Logique** : À chaque message, le backend envoie l'historique à l'IA (`chatIntake`). L'IA renvoie un objet JSON partiel contenant les données extraites (budget, destination, ambiance).
*   **Qualité** : Une fois les critères minimums atteints, le frontend déclenche automatiquement la génération du voyage complet.

### B. "Survival Mode" (Résilience et Fallbacks)
Une des grandes forces techniques de TripGenie est sa tolérance aux pannes (Fault Tolerance) :
1.  **Cascade de Modèles IA** : Si l'API Claude est épuisée (Erreur 429), le système bascule automatiquement sur un pool de 13 modèles de secours gratuits via OpenRouter (`callOpenRouter`).
2.  **SmartSearch Agentique** : Au lieu de dépendre d'APIs de voyage rigides, TripGenie utilise Tavily pour effectuer une recherche sémantique sur le web. L'IA extrait ensuite les tarifs et horaires réels, garantissant une flexibilité totale sur les destinations.
3.  **Mode Mock** : En cas de coupure totale du réseau IA ou des APIs, l'application charge des données "Mockées" pour garantir qu'un utilisateur (ou le jury) ne soit jamais bloqué sur un écran d'erreur.

### C. Système de Consensus (Votes de Groupe)
L'application intègre une fonctionnalité sociale permettant à un groupe d'amis de valider un itinéraire.
*   **Logique** : Le frontend appelle `POST /api/votes` avec le `trip_id` et l'`item_id`.
*   **Base de données** : Le vote est enregistré dans la table `trip_votes`, reliée au voyage via une Foreign Key stricte.

---

## 4. ASSURANCE QUALITÉ ET TESTS
Pour valider le Titre RNCP de niveau 5, une stratégie de test rigoureuse a été implémentée :
1.  **Tests d'Intégration (Vitest)** : Validation du parsing JSON des réponses imprévisibles de l'IA (gestion du markdown, des erreurs de syntaxe).
2.  **Suite de Tests CLI (Holberton Style)** : Scripts autonomes (`tests/test_api_v1.js`) capables de valider les statuts HTTP, le bon fonctionnement des endpoints (Health Check, Onboarding, Votes) et l'intégrité des clés étrangères directement depuis le terminal.

---

## 5. CONCLUSION POUR LE JURY
**TripGenie** n'est pas un simple "CRUD" (Create, Read, Update, Delete). C'est une application complexe qui démontre :
*   La maîtrise de **l'orchestration asynchrone** (Promise.allSettled).
*   Une gestion avancée des **bases de données relationnelles** (Supabase/PostgreSQL).
*   Une sensibilité forte à l'**Expérience Utilisateur (UX)** (animations, chatbot, UI premium).
*   Une vraie **résilience au code** (Fallbacks, gestion des quotas, tests unitaires).

Ce projet couvre et dépasse les attentes du référentiel RNCP 5 (Développeur Web et Web Mobile).
