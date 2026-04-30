# 🛠️ TripGenie — Stack Technique & Justifications

Ce document récapitule l'ensemble des choix technologiques effectués pour le projet **TripGenie** dans le cadre de la certification RNCP 5.

---

## 🏗️ Architecture Globale
TripGenie repose sur une architecture **Fullstack JavaScript** moderne, utilisant une approche **API-First** avec un frontend découplé.

| Composant | Technologie | Rôle |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v18+) | Environnement d'exécution serveur. |
| **Langage** | JavaScript (ESM) | Cohérence totale entre le Front et le Back. |
| **Backend** | Express.js | Framework API minimaliste et robuste. |
| **Frontend** | React (Vite) | Interface utilisateur dynamique et performante. |
| **Base de Données** | Supabase (PostgreSQL) | Stockage relationnel et services Backend-as-a-Service. |
| **Recherche Temps Réel**| Tavily (Web Search API)| Récupération de données réelles (Vols/Hôtels) sur le web. |
| **Validation** | Zod | Garantie de l'intégrité des données (Entrées/Sorties). |
| **Authentification** | JWT + bcryptjs | Sécurité des accès et hachage des mots de passe. |
| **Styling** | Tailwind CSS | Design System utilitaire pour une UI Premium. |
| **Tests** | Vitest + Supertest | Fiabilité du code et non-régression. |

---

## ⚖️ Pourquoi ces technos et pas d'autres ?

### 1. Node.js & Express (vs FastAPI ou Python)
*   **Uniformité (Fullstack JS)** : Utiliser le même langage (JavaScript) pour le frontend et le backend permet de partager des schémas de validation (Zod) et réduit la complexité du projet.
*   **Écosystème** : Node.js possède la plus grande bibliothèque de paquets (npm) facilitant l'intégration rapide d'API tierces (AI, Tavily).
*   **Performance I/O** : Parfait pour une application de curation qui fait beaucoup d'appels API asynchrones en parallèle.

### 2. Tavily & SmartSearch (vs Amadeus)
*   **Flexibilité** : Contrairement à Amadeus (souvent limité en mode Sandbox et complexe à configurer), Tavily permet d'interroger le web en temps réel.
*   **Données Réelles** : L'IA analyse les résultats de recherche web pour extraire des tarifs et des horaires réels, ce qui rend l'application fonctionnelle pour n'importe quelle destination mondiale.
*   **Fiabilité** : Évite les erreurs liées aux codes IATA manquants ou aux expirations de jetons API propriétaires.

### 2. Supabase / PostgreSQL (vs MySQL)
*   **Puissance du Relationnel** : PostgreSQL est plus avancé que MySQL pour les requêtes complexes et l'intégrité des données.
*   **Gestion du JSON** : PostgreSQL gère nativement le type `JSONB`, idéal pour stocker les réponses flexibles des IA tout en restant dans une base relationnelle.
*   **Services intégrés** : Supabase offre l'authentification et le stockage de fichiers nativement, ce qui aurait nécessité des outils supplémentaires avec MySQL.

### 3. Zod & Vite : Obligation ou Bonus ?
*   **Zod** : Bien que non obligatoire, c'est un **bonus stratégique**. Il transforme une validation "artisanale" (if/else) en une validation **industrielle**. Pour le jury, c'est la preuve d'une maîtrise de la sécurité des données.
*   **Vite** : C'est le standard moderne. Utiliser Vite plutôt que des outils plus anciens (CRA) montre au jury que vous effectuez une **veille technologique** active et que vous utilisez les outils les plus performants du marché.

### 4. Pourquoi React + Vite ?
*   **Performance** : Vite remplace avantageusement "Create React App" en offrant un temps de chargement quasi instantané en développement.
*   **Composants** : React permet une interface modulaire, facilitant la création de composants réutilisables (cartes de voyage, formulaires, etc.).

### 5. Pourquoi Tailwind CSS ?
*   **Productivité** : Permet de designer l'interface directement dans le HTML sans changer de fichier.
*   **Maintenance** : Évite les fichiers CSS gigantesques et difficiles à maintenir. Le design reste cohérent grâce au système de design imposé par les classes utilitaires.

### 6. Pourquoi JWT & bcryptjs ?
*   **Stateless Auth** : Les JSON Web Tokens permettent d'authentifier les utilisateurs sans stocker de sessions lourdes sur le serveur.
*   **Sécurité des Mots de Passe** : `bcryptjs` assure un hachage robuste avec un sel (salt) et un facteur de coût ajustable, protégeant contre les fuites de données.

---

## 🚀 Innovations Majeures

### 1. Algorithme de Scoring Multicritères
TripGenie ne se contente pas de lister des voyages, il les **évalue** via un "Genie Score" sur 10.
*   **Logique de Pondération** : Le score s'adapte au "Mode" choisi par l'utilisateur :
    *   **Relax** : Priorité à la qualité de l'hôtel (étoiles/rating).
    *   **Party** : Priorité aux activités et à l'économie sur le vol.
    *   **Adventure** : Priorité à la densité et à la variété des activités.
*   **Calcul Serveur** : Implémenté en Node.js, cet algorithme garantit que l'utilisateur reçoit une recommandation objective basée sur ses propres critères de budget et de confort.

### 2. Architecture RAG (Retrieval-Augmented Generation)
Pour éviter les "hallucinations" classiques des IA, TripGenie utilise une approche **RAG** :
*   **Source de Vérité** : Avant de générer l'itinéraire, le serveur interroge le web via l'API **Tavily**.
*   **Contextualisation** : Les données réelles (prix, horaires, noms de lieux) sont injectées dans le prompt de l'IA.
*   **Résultat** : Un itinéraire basé sur des faits réels et des tarifs actuels.

### 3. Résilience & "Survival Mode" (Multi-LLM)
L'application est conçue pour être "Production-Ready" avec une tolérance aux pannes :
*   **Fallback Automatique** : En cas de saturation ou d'erreur sur un fournisseur d'IA (ex: Claude), le système bascule de manière transparente sur un autre (ex: Gemini ou OpenRouter).
*   **Survival Mode** : Si tous les services tiers sont indisponibles, TripGenie bascule sur un mode de secours utilisant des données locales pré-validées, garantissant une expérience utilisateur ininterrompue.

---

## 🛠️ Focus sur l'implémentation

### Supabase : Pourquoi ce choix ?
Supabase remplace la gestion manuelle d'un serveur **MySQL/PostgreSQL** classique. Il offre :
1.  **Hébergement Cloud** : Pas de configuration de serveur local.
2.  **SDK Moderne** : Remplace le SQL brut par des fonctions JavaScript sécurisées.
3.  **Services intégrés** : Gestion de l'Auth et du stockage de fichiers sur la même plateforme.

### SQL Brut vs SDK : Une approche sécurisée
On pourrait se demander pourquoi ne pas écrire du SQL brut partout. La réponse est stratégique :
*   **SQL Brut pour la Structure** : Le schéma de la base de données est conçu en **SQL pur** (voir `server/db/schema.sql`). Cela prouve la maîtrise des relations, des contraintes et de la modélisation.
*   **SDK pour l'Application** : L'utilisation du SDK (`supabase.insert()`) en production est une **mesure de sécurité**. Elle protège nativement contre les **injections SQL**, la faille de sécurité la plus courante, en gérant automatiquement l'échappement des données.

### Documentation API : Pourquoi Zod plutôt que Swagger ?
Contrairement à des frameworks qui génèrent Swagger automatiquement, nous avons choisi une approche **"Code-First"** avec **Zod** :
*   **Validation Temps Réel** : Zod ne se contente pas de documenter, il **bloque** activement les données invalides.
*   **Contrat d'Interface** : Chaque route possède son propre schéma Zod, servant de documentation technique précise pour le frontend.

### Preuves de CRUD (Certification RNCP)
L'application implémente les 4 opérations fondamentales sur plusieurs ressources clés, prouvant la maîtrise de la gestion de données :

#### 1. Voyages (Trips) — Ressource Principale
*   **CREATE** : `POST /api/trips` (Enregistrement d'un nouvel itinéraire généré).
*   **READ** : `GET /api/trips` (Affichage de l'historique des voyages).
*   **UPDATE** : `PUT /api/trips/:id` (Modification du titre ou des dates).
*   **DELETE** : `DELETE /api/trips/:id` (Suppression d'un voyage).

#### 2. Utilisateurs & Profils (Auth)
*   **CREATE** : `POST /api/auth/signup` (Création de compte).
*   **READ** : `GET /api/auth/me` (Récupération des infos de session).
*   **UPDATE** : `PUT /api/auth/me` (Mise à jour du nom ou de l'avatar).

#### 3. Votes & Consensus (Votes)
*   **CREATE** : `POST /api/votes` (Insertion d'un vote positif/négatif sur un item).
*   **READ** : `GET /api/votes/:trip_id` (Récupération de la liste des votes pour affichage).

#### 4. Sélection de Packs (Packs)
*   **READ** : `GET /api/packs/:trip_id` (Lecture des options proposées par l'IA).
*   **UPDATE** : `POST /api/packs/:trip_id/select/:pack_id` (Mise à jour du statut `selected` pour valider le choix final).

---

> [!TIP]
> **Argument pour le Jury** : Cette stack a été choisie pour maximiser la **sécurité** (Zod/bcrypt), la **maintenabilité** (Fullstack JS) et la **scalabilité** (PostgreSQL/Stateless Auth).
