# 🛠 TECH STACK — TRIPGENIE

Ce document récapitule l'ensemble des technologies utilisées pour le développement de l'application **TripGenie**.

---

## 🎨 FRONT-END (Interface Utilisateur)
*   **React 18 :** Bibliothèque JavaScript pour la création d'interfaces utilisateur basées sur des composants.
*   **Vite.js :** Outil de build ultra-rapide pour le développement front-end moderne.
*   **TailwindCSS :** Framework CSS utilitaire pour un design "mobile-first" et responsive sans quitter le HTML.
*   **Zustand :** Gestionnaire d'état (State Management) léger pour synchroniser les données utilisateur et l'historique du chat.
*   **Lucide React :** Bibliothèque d'icônes vectorielles épurées.

---

## ⚙️ BACK-END (Logique Métier & API)
*   **Node.js :** Environnement d'exécution JavaScript côté serveur.
*   **Express.js :** Framework minimaliste pour construire l'API RESTful.
*   **JSON Web Token (JWT) :** Standard de sécurité pour l'authentification et l'échange d'informations sécurisées.
*   **Bcrypt.js :** Algorithme de hashage robuste pour sécuriser les mots de passe en base de données.
*   **Dotenv :** Gestion sécurisée des variables d'environnement (clés d'API).
*   **Helmet & CORS :** Middlewares de sécurité pour protéger le serveur contre les attaques web courantes.

---

## 🗄️ BASE DE DONNÉES (Stockage)
*   **PostgreSQL :** Système de gestion de base de données relationnelle (SGBDR) utilisé pour la persistance des profils et des voyages.
*   **Supabase :** Plateforme Cloud hébergeant la base PostgreSQL et gérant la connectivité sécurisée.

---

## 🤖 INTELLIGENCE ARTIFICIELLE & APIs
*   **OpenRouter :** Passerelle unifiée permettant de requêter les meilleurs modèles de langage (LLM).
*   **Claude 3.5 (Anthropic) :** Modèle d'IA principal utilisé pour la génération d'itinéraires intelligents.
*   **Tavily AI :** API de recherche optimisée pour permettre à l'IA d'accéder à des informations de voyage en temps réel sur le web.

---

## 🚀 OUTILS & DÉPLOIEMENT
*   **Git & GitHub :** Gestion de version et hébergement du code source.
*   **npm :** Gestionnaire de paquets pour toutes les dépendances du projet.
*   **Postman / Thunder Client :** Outils de test pour valider les routes de l'API.
