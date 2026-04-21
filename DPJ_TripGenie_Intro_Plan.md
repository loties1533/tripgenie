# DOSSIER DE PROJET (DPJ) - TRIPGENIE
**Candidat :** Alexis Laubert
**Titre visé :** Développeur Web et Web Mobile (RNCP 5)

---

## 1. INTRODUCTION DU PROJET (À envoyer au formateur)

Le secteur du tourisme est en pleine mutation. S'il existe aujourd'hui des milliers d'agences de voyage en ligne, les utilisateurs se retrouvent souvent perdus face à une quantité trop abondante d'informations, d'avis contradictoires et de parcours complexes. L'objectif de mon projet est de simplifier et de personnaliser drastiquement la préparation d'un voyage grâce à l'Intelligence Artificielle.

**C'est dans ce contexte que j'ai conçu et développé *TripGenie*.** 

TripGenie est un Agent Autonome (Assistant IA de voyage) "Full-Stack". Contrairement aux solutions traditionnelles où l'utilisateur doit chercher lui-même son vol, son hôtel et ses activités, TripGenie inverse le paradigme : l'utilisateur exprime un besoin naturel (ex: *"Je veux un week-end étudiant pas cher en Europe"*) et l'application se charge de concevoir un parcours sur mesure.

D'un point de vue technique, l'application s'articule autour d'une interface front-end réactive (développée en **React, Vite et TailwindCSS** pour son attrait visuel moderne) et d'un back-end solide en **Node.js/Express.js**. La couche serveur a pour rôle d'orchestrer la communication avec des modèles de langages (API LLM), tout en assurant l'authentification et l'enregistrement persistant des historiques via une base de données **Supabase** (PostgreSQL).

Ce projet couvre les deux grandes activités du référentiel DWWM : la conception complète d'une interface dynamique et fluide, couplée à une logique métier (API) exigeante côté serveur gérant des données structurées.

---

## 2. PLAN DÉTAILLÉ DU DOSSIER DE PROJET (DPJ)

Voici le plan que je compte suivre pour rédiger mon dossier de projet complet pour le jury :

### I. Présentation du projet et de la démarche
* **1.1 Contexte et problématique :** Le besoin d'une préparation de voyage centralisée par l'IA.
* **1.2 La solution :** Présentation globale de TripGenie et de ses objectifs.
* **1.3 Rôles et organisation :** Organisation du travail, gestion de version (Git/GitHub) et méthodologie employée.

### II. Conception et Maquettage
* **2.1 Analyse fonctionnelle :** Définition des parcours utilisateurs (User Stories) et fonctionnalités clés (Auth, Génération, Sauvegarde).
* **2.2 Identité visuelle et maquettage (Activité 1) :** Réalisation des Wireframes/Maquettes *(à ajouter)*.
* **2.3 Modélisation des données (Activité 2) :** Présentation du Modèle Conceptuel de Données (MCD) pour le stockage des accès sur Supabase.

### III. Choix Techniques et Architecture
* **3.1 L'architecture globale :** Modèle Client / Serveur et API Gateway.
* **3.2 Le Front-end :** Pourquoi avoir choisi l'écosystème React (Vite.js) et le cadriciel TailwindCSS.
* **3.3 Le Back-end :** Sécurisation et Routing via Node.js et Express.js. Implémentation du "Rate Limiting" et communication avec les APIs externes (OpenRouter/LLM).

### IV. Développement et Difficultés techniques
* **4.1 Interface dynamique :** La gestion de l'état asynchrone côté client lors des longs temps de réponse de l'IA (Exemple de code).
* **4.2 Back-end métiers :** Gérer les appels asynchrones avec l'IA et sécuriser les routes (JWT, CORS).

### V. Déploiement et Sécurité
* **5.1 Bonnes pratiques :** Variables d'environnement (`.env`), module Helmet pour la sécurité des Headers.
* **5.2 Mise en ligne :** *[Si prévu]* Documenter les étapes de déploiement du front et de l'API.

### VI. Conclusion
* **6.1 Bilan du projet :** Ce qui fonctionne, ce qui reste à améliorer (V2 de TripGenie avec recherche internet en direct RAG).
* **6.2 Bilan personnel :** Les compétences acquises vis-à-vis du titre convoité.
