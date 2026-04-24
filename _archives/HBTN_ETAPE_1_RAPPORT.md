# 🌎 Rapport de l'Étape 1 : Portfolio Project - TripGenie

**Auteur :** Alexis Laubert (Solo Project)  
**Formation :** Holberton School France  
**Projet :** TripGenie (Assistant Voyage Agentique)

---

## 👨‍💻 0. Formation de l'Équipe & Rôles (Task 0)

Bien que ce projet soit réalisé en **Solo**, il est géré avec une rigueur d'équipe pour démontrer une capacité d'organisation Fullstack.

### Rôles Techniques & Justification
*   **Product Manager & PM** : Responsable de la vision produit et du respect du scope MVP. Choisi pour assurer la cohérence entre les besoins utilisateurs et les fonctionnalités techniques.
*   **Fullstack Developer** : Développement de l'architecture React (Frontend) et Node.js (Backend). Choisi pour maîtriser l'intégralité du flux de données.
*   **AI Specialist & Designer** : Prompt engineering et conception d'une UI premium. Choisi pour créer la différenciation majeure du projet (UX Agentique).

### Normes d'Équipe & Outils
*   **Communication** : Utilisation de Discord pour la veille et de Notion pour la documentation.
*   **Collaboration** : Flux Git (GitHub) avec des messages de commit sémantiques.
*   **Décision** : Méthodologie basée sur l'analyse de faisabilité technique et l'impact utilisateur.

---

## 🧠 1. Brainstorming & Évaluation (Task 1)

Nous avons exploré trois concepts innovants. Voici leur évaluation comparative :

| Idée | Description | Faisabilité | Impact | Risques | Rang |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TripGenie** | Assistant voyage IA qui génère des packs complets via chat. | 9/10 | 10/10 | Quotas API (Moyen) | **#1** |
| **FinTrack AI** | Analyse de budget par IA via relevés bancaires. | 5/10 | 8/10 | Sécurité/RGPD (Élevé) | **#2** |
| **ChefGenie** | Recettes basées sur une photo du frigo. | 6/10 | 7/10 | Précision Vision (Élevé) | **#3** |

**Logique de sélection :** TripGenie a été choisi pour son ratio impact/faisabilité optimal et sa capacité à démontrer une intégration avancée des technologies LLM.

---

## 🎯 2. Décision & Affinement (Task 2)

### Concept du MVP choisi
TripGenie est une **Application Web** qui résout le problème de la **surcharge cognitive** lors de la planification de voyage.

*   **Public Cible** : Voyageurs 20-40 ans, habitués du numérique, cherchant une expérience "concierge" rapide et premium.
*   **Solution** : Un flux conversationnel qui transforme une intention de voyage en un pack structuré (Vols, Hôtels, Activités, Budget).

### Objectifs SMART & Features
*   **Objectif 1** : Réduire le temps de planification de 2h à 30 secondes.
*   **Feature 1** : Chatbot intelligent (Extraction sémantique).
*   **Feature 2** : Génération d'itinéraire dynamique (Pack voyage complet).
*   **Feature 3** : Trip Scoring (Algorithme de validation de pertinence).

### Scope & Risques
*   **In-Scope** : Chatbot, Pack voyage, Authentification, Historique.
*   **Out-of-Scope** : Paiements en ligne, Réservations directes.
*   **Risque Majeur** : Dépendance aux APIs IA (Anthropic/Google).
*   **Mitigation** : Implémentation d'un **Mode Survie** avec fallback sur des données simulées ultra-réalistes (Généré par IA en amont).

---

## 📝 3. Résumé & Impact (Task 3)
TripGenie n'est pas qu'un simple outil de recherche, c'est un **Agent de Voyage**. Il a le potentiel de perturber la planification traditionnelle en offrant une personnalisation que les comparateurs classiques ne peuvent égaler. Son impact réside dans la simplification radicale de l'expérience utilisateur grâce à l'IA.

---

> [!NOTE]
> Ce rapport établit les bases d'un assistant de voyage résilient et innovant, prêt pour la phase de planification technique (Étape 2).
