# Propositions pour compléter le Dossier Professionnel (DP) avec TripGenie

Voici les textes rédigés que vous pouvez copier/coller directement dans votre document Word (Dossier Professionnel) pour remplir la partie "Exemple n°3" de chaque activité type.

---

## Activité-type n°1 : Développer la partie front-end d’une application web ou web mobile en intégrant les recommandations de sécurité

### Exemple n°3
**Intitulé :** Développer une interface asynchrone et dynamique avec React.js (Projet TripGenie)

**1. Décrivez les tâches ou opérations que vous avez effectuées, et dans quelles conditions :**
Dans le cadre de mon projet de certification TripGenie, j'ai développé de A à Z une interface utilisateur moderne et réactive en utilisant React.js. L'objectif était de créer une expérience utilisateur (UX) fluide, capable de gérer des temps d'attente liés à l'intelligence artificielle sans frustrer l'utilisateur.
- **Développement de composants React isolés :** Création d'une interface de chat (ChatWidget) et de composants d'affichage pour les vols et hébergements (PackCard).
- **Gestion d'état global avec Zustand :** Implémentation d'un store persistant pour conserver les données de recherche et les conversations, évitant ainsi la perte de données lors du rafraîchissement de la page ("Prop drilling").
- **Orchestration asynchrone côté client :** Utilisation de l'API `fetch` pour interroger l'API Node.js et intégration de "Skeleton loaders" (animations de chargement dynamiques) pour faire patienter l'utilisateur pendant que le backend orchestre les requêtes IA et Amadeus.
- **Sécurisation :** Assainissement des données reçues de l'API pour éviter les failles XSS et gestion sécurisée des tokens de session.

**2. Précisez les moyens utilisés :**
- React.js, Zustand (gestion d'état)
- HTML5 / Vanilla CSS (utilisation de variables CSS, Flexbox, Grid)
- API Fetch pour les requêtes asynchrones
- Visual Studio Code, Git / GitHub
- Navigateurs web et DevTools (React Profiler, Network tab)

**3. Avec qui avez-vous travaillé ?**
J'ai conçu et développé l'intégralité du front-end en autonomie totale.

**4. Contexte :**
- **Nom de l’entreprise, organisme ou association :** Projet de certification RNCP (TripGenie)
- **Chantier, atelier, service :** Maquettage, Développement Front-end & Intégration API
- **Période d’exercice :** De Janvier 2026 à Mai 2026

---

## Activité-type n°2 : Développer la partie back-end d’une application web ou web mobile en intégrant les recommandations de sécurité

### Exemple n°3
**Intitulé :** Développer une API Node.js orchestrant l'IA et des services tiers (Projet TripGenie)

**1. Décrivez les tâches ou opérations que vous avez effectuées, et dans quelles conditions :**
Pour propulser l'application TripGenie, j'ai conçu un back-end robuste en Node.js/Express, dont le rôle principal est d'orchestrer intelligemment des APIs externes tout en garantissant l'intégrité des données en base.
- **Création d'une API RESTful sécurisée :** Développement de routes Express pour gérer l'authentification, les recherches de voyages, et un système de votes (consensus). 
- **Orchestration asynchrone d'APIs tierces :** Implémentation de requêtes parallèles (`Promise.allSettled`) vers l'API de vols (Amadeus), d'événements (PredictHQ) et les modèles de langage (Anthropic Claude, OpenRouter) pour réduire de moitié les temps de réponse.
- **Mécanismes de tolérance aux pannes (Mode Survie) :** Mise en place d'un système de "fallback" (bascule automatique) vers des modèles d'IA secondaires ou des données factices (Mocks) en cas d'erreur 429 (quota dépassé) des fournisseurs d'API, garantissant une disponibilité continue.
- **Interaction Base de données & Sécurité :** Modélisation relationnelle stricte (UUID, ON DELETE CASCADE) et intégration avec PostgreSQL via Supabase. Validation stricte des données entrantes et assainissement (Regex) des réponses JSON capricieuses renvoyées par l'IA.

**2. Précisez les moyens utilisés :**
- Node.js, Express.js
- Supabase (PostgreSQL), API JavaScript Supabase
- APIs externes : Amadeus, PredictHQ, Anthropic (Claude), OpenRouter
- Visual Studio Code, Git / GitHub
- Postman et scripts CLI pour tester et valider les endpoints à 100%

**3. Avec qui avez-vous travaillé ?**
J'ai conçu, architecturé et développé l'ensemble du back-end en autonomie totale.

**4. Contexte :**
- **Nom de l’entreprise, organisme ou association :** Projet de certification RNCP (TripGenie)
- **Chantier, atelier, service :** Développement Back-end, Base de données & IA
- **Période d’exercice :** De Janvier 2026 à Mai 2026
