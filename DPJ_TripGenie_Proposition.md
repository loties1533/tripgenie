# PROPOSITION DE DOSSIER DE PROJET (DPJ) - TRIPGENIE

**Candidat :** Alexis Laubert
**Titre visé :** Développeur Web et Web Mobile (RNCP 5)

---

## 1. INTRODUCTION DU PROJET

Le secteur du tourisme est en pleine mutation. S'il existe aujourd'hui des milliers d'agences de voyage en ligne, les utilisateurs se retrouvent souvent perdus face à une quantité trop abondante d'informations, d'avis contradictoires et de parcours de réservation complexes. L'objectif de mon projet est de simplifier et de personnaliser drastiquement la préparation d'un voyage grâce à l'Intelligence Artificielle.

**C'est dans ce contexte que je prévois de concevoir et développer *TripGenie*.**

TripGenie sera un Assistant IA de voyage "Full-Stack". Contrairement aux solutions traditionnelles où l'utilisateur doit chercher lui-même chaque élément de son séjour, TripGenie inversera le paradigme : l'utilisateur exprimera un besoin en langage naturel (ex: *"Je veux un week-end étudiant pas cher en Europe"*) et l'application se chargera de lui proposer un itinéraire sur mesure.

D'un point de vue technique, je projette de structurer l'application de la manière suivante :
*   **Une interface Front-end réactive :** Je prévois d'utiliser **React** (avec Vite et TailwindCSS) pour créer une expérience utilisateur fluide, moderne et totalement adaptée aux mobiles.
*   **Un Back-end robuste :** Je compte m'appuyer sur **Node.js et Express.js** pour piloter la logique métier. Ce serveur aura pour rôle d'orchestrer la communication avec les modèles de langage (IA) de manière sécurisée, tout en assurant l'authentification des utilisateurs.
*   **Une gestion de données structurée :** Les historiques et les profils utilisateurs seront sauvegardés de manière persistante dans une base de données **PostgreSQL** (via Supabase).

Ce projet couvrira les deux grandes activités du référentiel DWWM : la conception d'une interface dynamique et le développement d'une API métier gérant des données sécurisées.

---

## 2. PLAN DÉTAILLÉ DU DOSSIER DE PROJET (DPJ)

Voici le plan détaillé que je compte suivre pour la rédaction de mon dossier final :

### I. Présentation du projet et de la démarche
* **1.1 Contexte et problématique :** Le besoin d'une préparation de voyage centralisée par l'IA.
* **1.2 La solution :** Présentation globale de TripGenie et de ses objectifs.
* **1.3 Rôles et organisation :** Organisation du travail, gestion de version (Git/GitHub) et méthodologie employée.

### II. Conception et Maquettage
* **2.1 Analyse fonctionnelle :** Définition des parcours utilisateurs (User Stories) et fonctionnalités clés (Auth, Génération, Sauvegarde).
* **2.2 Identité visuelle et maquettage (Activité 1) :** Réalisation des Wireframes et Maquettes.
* **2.3 Modélisation des données (Activité 2) :** Présentation du Modèle Conceptuel de Données (MCD).

### III. Choix Techniques et Architecture
* **3.1 L'architecture globale :** Modèle Client / Serveur et API Gateway.
* **3.2 Le Front-end :** Justification des choix technologiques (React, TailwindCSS).
* **3.3 Le Back-end :** Structure du serveur, sécurité et communication avec les APIs externes (IA).

### IV. Développement et Difficultés techniques
* **4.1 Interface dynamique :** Gestion des flux de données et des états de chargement.
* **4.2 Back-end métiers :** Logique de génération des itinéraires et sécurisation des accès.

### V. Déploiement et Sécurité
* **5.1 Bonnes pratiques :** Gestion des variables d'environnement et protection des données.
* **5.2 Mise en ligne :** Documentation des étapes de déploiement (Hébergement du Front et du Back).

### VI. Conclusion
* **6.1 Bilan du projet :** Analyse des résultats obtenus par rapport aux objectifs initiaux.
* **6.2 Bilan personnel :** Retour sur les compétences acquises vis-à-vis du titre RNCP 5.
