# 🧠 TripGenie — Deep Dive Technique (Spécial Oral)

Ce document regroupe les concepts avancés abordés lors de la phase finale du projet. Maîtriser ces points te place au niveau "Senior" lors de ton entretien.

---

## ⚛️ React & Performance

### 1. Le DOM Virtuel & Réconciliation
*   **Concept** : React garde une copie légère du DOM en mémoire. Il compare les changements sur cette copie (Diffing) avant de mettre à jour le vrai navigateur (Réconciliation).
*   **Architecture Fiber** : Le moteur de rendu de React 16+. Il permet de découper le travail en petites unités pour ne jamais bloquer l'interface utilisateur (UI fluide).

### 2. Les Hooks d'Optimisation
*   **useMemo** : Mémorise une **valeur** (résultat d'un calcul lourd comme le scoring) pour ne pas le refaire à chaque rendu.
*   **useCallback** : Mémorise une **instance de fonction** pour éviter que les composants enfants ne se redessinent inutilement.
*   **useRef** : Une "boîte" qui stocke une valeur mutable sans déclencher de rendu. Idéal pour manipuler le DOM directement (ex: Leaflet) ou stocker des IDs de timers.

### 3. Cycle de Vie & Cleanup
*   **useEffect Cleanup** : Toujours retourner une fonction de nettoyage pour stopper les abonnements (ex: Firebase, Timers) et éviter les **fuites de mémoire** (Memory Leaks).
*   **Strict Mode** : En développement, React monte/démonte les composants deux fois pour forcer la détection de bugs de nettoyage.

---

## 🤖 Architecture IA (RAG & Résilience)

### 1. Le concept de RAG (Retrieval-Augmented Generation)
*   **Définition** : L'IA ne se base pas que sur sa mémoire (qui est figée). Elle va "chercher" (Retrieve) des infos sur le web (via Tavily), les "ajoute" (Augment) au prompt, et "génère" (Generate) la réponse.
*   **Bénéfice** : Élimine les hallucinations et garantit des prix/hôtels réels.

### 2. Orchestration & Résilience
*   **Multi-LLM** : Capacité de basculer entre Gemini, Claude et OpenRouter si une API tombe.
*   **Survival Mode** : Utilisation de données "Mocks" structurées si aucun service IA n'est disponible, garantissant que l'application reste fonctionnelle.

---

## 🔐 Sécurité & Standards 2026

### 1. Variables d'Environnement (Vite)
*   **VITE_*** : Préfixe obligatoire pour exposer une variable au Frontend.
*   **Privées** : Les clés API sans préfixe restent sur le serveur Node.js et ne sont jamais visibles dans le navigateur.

### 2. Authentification Stateless (JWT)
*   Utilisation de JSON Web Tokens pour éviter de stocker des sessions sur le serveur, permettant une meilleure scalabilité horizontale.

### 3. Validation de Données (Zod)
*   Chaque entrée (formulaire) et chaque sortie (IA) est validée par un schéma Zod. Cela garantit que le code ne traite jamais de données corrompues.
