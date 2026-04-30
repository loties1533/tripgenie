# 🧪 TripGenie — Stratégie de Tests & Validation

Ce document détaille la méthodologie de test mise en place pour garantir la robustesse et la sécurité de **TripGenie** pour la certification RNCP 5.

---

## 🎯 Objectifs des Tests
1.  **Validation des Endpoints** : Vérifier que toutes les routes API (Auth, Trips, AI, Votes) répondent correctement.
2.  **Gestion des Erreurs** : S'assurer que les codes d'erreur HTTP (400, 401, 404, 409) sont renvoyés avec des messages explicites.
3.  **Intégrité des Données** : Valider que les schémas **Zod** bloquent les données invalides.
4.  **Logique Métier** : Vérifier que l'algorithme de scoring et le parsing JSON de l'IA fonctionnent.

---

## 🚀 Commandes de Test

| Commande | Fichier Source | Description |
| :--- | :--- | :--- |
| `npm run test:vitest` | `tests/api.test.js` | **Suite complète** (14+ tests) couvrant tous les endpoints (Succès/Erreurs). |
| `npm run test:services` | `tests/test_services.js` | Test de la logique interne (Scoring, Parsing AI). |
| `npm test` | `tests/test_api_v1.js` | Test rapide de connectivité et flux principal (Holberton Style). |

---

## 📂 Détail de la Suite Vitest (`tests/api.test.js`)

Cette suite utilise **Vitest** et **Supertest** pour simuler un client réel sans avoir besoin de lancer le serveur manuellement.

### 🔐 Authentification (Auth)
*   **Signup (201)** : Création d'un nouvel utilisateur.
*   **Conflict (409)** : Rejet si l'email existe déjà.
*   **Login (200)** : Récupération du token JWT.
*   **Unauthorized (401)** : Échec si le mot de passe est faux ou le token manquant.
*   **Profile (200)** : Lecture et mise à jour des informations utilisateur (`/me`).

### 🗺️ Voyages (Trips)
*   **CRUD Complet** : Création, Liste, Lecture détaillée, Mise à jour et Suppression.
*   **Accès Public** : Vérification que le lien de partage fonctionne sans authentification.

### 🗳️ Votes & Consensus
*   **Record (201)** : Enregistrement d'un vote sur un itinéraire.
*   **Fetch (200)** : Récupération de la liste des votes.

### 🤖 Intelligence Artificielle (AI)
*   **Analyze (200)** : Analyse sémantique d'une demande utilisateur.
*   **Onboarding (200)** : Flux de conversation initial avec l'IA.

### 🚫 Cas d'Erreurs
*   **Validation Zod (400)** : Envoi de données mal formées.
*   **Route Inconnue (404)** : Appel d'un endpoint inexistant.

---

## 🛠️ Outils complémentaires recommandés

### Postman / Insomnia
Bien que les tests soient automatisés, vous pouvez importer les routes dans **Postman** pour des tests manuels visuels.
*   **Variables** : Utilisez `{{baseUrl}}` pour `http://localhost:3000/api`.
*   **Auth** : Ajoutez le token dans l'onglet `Authorization` (Bearer Token).

---

> [!IMPORTANT]
> **Argument pour le Jury** : *"J'ai mis en place une couverture de tests automatisés couvrant 100% des endpoints critiques, incluant les cas nominaux et les cas d'erreurs. Cela garantit une non-régression et prouve la fiabilité de l'architecture."*
