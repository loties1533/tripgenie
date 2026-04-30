# 🎤 TripGenie — Préparation à l'Oral (Holberton & RNCP)

Ce document est ta "bible" pour réussir tes deux soutenances. Il contient une démo visuelle, les points techniques à valoriser et les réponses aux questions pièges.

---

## 📽️ Démonstration en Direct (MVP Final)
Voici l'enregistrement de la génération réelle effectuée sur la branche `mvp-final`.
*Scénario : Login -> Marrakech -> Mode Relax -> Scoring -> Résultat.*

![Vidéo de la génération en direct](/Users/alexislaubert/.gemini/antigravity/brain/1dd58c78-5ac5-4808-b1b8-dd5b4751aadf/live_generation_v2_fix_1777558996293.webp)

---

## 💎 Points Techniques à Valoriser (Le "Blindage")

### 1. La résilience Multi-IA
*   **Argument** : "Le projet ne dépend pas d'un seul fournisseur. J'ai implémenté un système de fallback entre Claude 3, Gemini et OpenRouter, avec un mode de secours (Survival Mode) pour garantir 100% de disponibilité."

### 2. Le RAG (Web Search) vs Hallucinations
*   **Argument** : "L'IA n'invente rien. Elle utilise l'API Tavily pour lire le web en temps réel (Vols, Hôtels) avant de construire l'itinéraire. C'est une architecture RAG (Retrieval-Augmented Generation)."

### 3. La Qualité logicielle (Zod & Tests)
*   **Argument** : "Chaque donnée est validée par Zod avant d'être traitée. J'ai également mis en place une suite de tests Vitest automatisée couvrant 14 cas critiques (Success/Errors)."

---

## ❓ Questions Pièges & Réponses Stratégiques

| Question | Réponse Stratégique |
| :--- | :--- |
| **"Pourquoi Supabase et pas MySQL ?"** | "Pour la puissance de PostgreSQL couplée à la sécurité native du SDK (Anti-injection SQL) et la gestion intégrée de l'authentification JWT." |
| **"Comment gérez-vous les coûts de l'IA ?"** | "Grâce au système de cache et à l'utilisation de modèles 'Free Tier' sur OpenRouter en priorité, tout en gardant des modèles Premium pour la génération finale." |
| **"Où est le CRUD dans votre projet ?"** | "Il est partout : Gestion des Voyages (Trips), Gestion du Profil (Auth), Système de Votes (Votes) et Sélection finale (Packs)." |
| **"Comment est calculé le score ?"** | "C'est un algorithme multicritères (Prix, Confort, Activités) dont les coefficients changent dynamiquement selon le mode choisi (Relax, Party, Adventure)." |

---

## ✅ Check-list avant de passer
1.  **Lancer le serveur** : `npm run dev`
2.  **Lancer le client** : `npm run client:dev`
3.  **Lancer les tests** (devant le jury) : `npm run test:vitest`
4.  **Ouvrir Supabase** : Pour montrer les tables `trips` et `users` se remplir en direct.

---

> [!TIP]
> **Conseil Final** : Reste confiant sur la technique. Le projet est solide, testé et documenté. Si une IA met du temps à répondre, profite-en pour expliquer le concept de **RAG** ou de **Scoring**.
