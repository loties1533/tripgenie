# 🎓 CHECKLIST DE CONFORMITÉ RNCP 5 (DWWM) — TRIPGENIE

Ce document sert de guide pour la soutenance finale. Il fait le lien entre les exigences du titre **Développeur Web et Web Mobile** et les réalisations concrètes du projet **TripGenie**.

---

## 🟦 ACTIVITÉ TYPE 1 : DÉVELOPPER LA PARTIE FRONT-END

| Compétence Officielle | Preuve dans TripGenie | Statut |
| :--- | :--- | :---: |
| **Maquetter des interfaces utilisateur** | Utilisation de Figma/Whimsical pour les parcours de chat et l'affichage des voyages. | ✅ |
| **Réaliser des interfaces statiques** | Intégration rigoureuse en HTML5/CSS3 via TailwindCSS. | ✅ |
| **Développer la partie dynamique** | Utilisation de **React** pour la gestion des composants et de **Zustand** pour l'état global. | ✅ |
| **Consommer une API externe** | Appels asynchrones (`fetch`) vers le serveur pour la génération IA (OpenRouter/Claude). | ✅ |

**💡 Argument Jury :** *"L'interface est conçue en Mobile-First, utilisant React pour garantir une fluidité totale lors des échanges asynchrones avec l'IA."*

---

## 🟩 ACTIVITÉ TYPE 2 : DÉVELOPPER LA PARTIE BACK-END

| Compétence Officielle | Preuve dans TripGenie | Statut |
| :--- | :--- | :---: |
| **Créer une base de données** | Modélisation relationnelle PostgreSQL (Tables `users`, `trips`, `preferences`). | ✅ |
| **Composants d’accès aux données** | Utilisation du client Supabase dans Node.js pour exécuter les requêtes SQL. | ✅ |
| **Développer la partie back-end** | Création d'une API REST complète avec **Node.js et Express**. | ✅ |
| **Sécuriser l'application** | Hashage des mots de passe avec **Bcrypt**, protection par **JWT**, et middleware **Helmet**. | ✅ |

**💡 Argument Jury :** *"Le back-end sert de passerelle sécurisée (API Gateway) pour protéger les clés secrètes de l'IA et assurer l'intégrité des données utilisateurs."*

---

## 🔥 POINTS FORTS DU PROJET (Pour impressionner le jury)

1.  **Gestion de l'Asynchrone :** Tu gères des temps de réponse longs (ceux de l'IA) sans jamais bloquer l'interface utilisateur.
2.  **Sécurité Professionnelle :** Hashage en 12 rounds (Bcrypt) et authentification par Token (JWT).
3.  **Architecture Moderne :** Séparation nette entre le Client et le Serveur (Architecture Découplée).
4.  **Innovation :** Utilisation d'un Agent Autonome, ce qui montre une capacité de veille technologique importante.

---

## ⚠️ POINTS DE VIGILANCE (Questions pièges)

*   **Question : "Pourquoi Supabase ?"**
    *   *Réponse :* "C'est un choix d'hébergement pour PostgreSQL. J'ai conçu le schéma moi-même en SQL, Supabase assure simplement la haute disponibilité de la base de données."
*   **Question : "Et si l'API externe tombe ?"**
    *   *Réponse :* "J'ai implémenté une gestion d'erreurs robuste côté serveur qui renvoie des messages clairs au front-end, évitant ainsi le crash de l'application."
