# 🛡️ Stratégie de Sécurité : TripGenie

Ce document détaille les mesures de sécurité implémentées pour garantir l'intégrité des données utilisateurs et la protection des ressources d'Intelligence Artificielle.

---

## 1. Protection des Ressources IA (Rate Limiting)
Afin d'éviter les abus de consommation des APIs (Anthropic, Tavily) et de contrôler les coûts, un système de **limitation de débit** a été mis en place :
*   **Générations lourdes** : Limitées à 10 par heure par utilisateur/IP.
*   **Conversations (Chat/Onboarding)** : Limitées à 30 messages par 15 minutes.
*   **Implémentation** : Utilisation du middleware `express-rate-limit`.

## 2. Intégrité & Validation des Données
*   **Validation de longueur** : Tous les champs textuels envoyés à l'IA sont limités à **1000 caractères**. Cela prévient les attaques par injection de prompt massif et les surcoûts de tokens.
*   **Validation Type** : Vérification systématique des champs obligatoires (destination, mode, budget) avant traitement.

## 3. Sécurité des Accès & Propriété (Bypass Protection)
Chaque requête vers la base de données PostgreSQL (via Supabase) est protégée par une vérification de propriété :
*   **Isolation des données** : Un utilisateur ne peut voir, modifier ou supprimer QUE ses propres voyages. 
*   **Contrôle d'accès** : Implémentation systématique de la clause `.eq('user_id', req.user.id)` sur toutes les routes sensibles (`/trips`, `/packs`).
*   **Protection contre l'accès par ID** : Même si un utilisateur connaît l'ID d'un voyage d'autrui, le serveur bloque l'accès car le `user_id` ne correspondra pas.

## 4. Architecture Backend-Proxy
*   **Étanchéité des Secrets** : Aucune clé d'API (Claude, Supabase, Amadeus) n'est exposée côté Frontend. 
*   **Communication Sécurisée** : Le Frontend communique exclusivement avec le serveur Express via des en-têtes **Authorization: Bearer [JWT]**.
*   **Supabase** : Le client Supabase est utilisé exclusivement côté serveur avec des permissions restreintes (Row Level Security).

## 5. Gestion des Environnements
*   Utilisation de fichiers `.env` non trackés sur GitHub.
*   Isolation stricte des variables de développement et de production.
