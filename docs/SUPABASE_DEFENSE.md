# Fiche de Défense : Pourquoi Supabase ? (Spécial Oral)

Cette fiche est ton bouclier contre les questions du jury qui pourraient sous-entendre que l'outil a fait tout le travail à ta place.

---

## 💡 1. Résumé Technique
**C'est quoi ?** Supabase est un **BaaS (Backend-as-a-Service)** open-source construit au-dessus de **PostgreSQL**.
**Ce que j'en utilise :** uniquement l'**hébergement du PostgreSQL**. (Auth, RLS, routes : tout est codé par moi — je n'utilise ni Supabase Auth ni les API temps réel.)

---

## 🎯 2. Tes arguments stratégiques (Pourquoi ce choix ?)
1.  **Focus Métier** : "Mon projet se concentre sur l'intelligence artificielle agentique. Utiliser Supabase m'a permis de déléguer la gestion de l'infrastructure de base pour consacrer 100% de mon temps à la logique complexe de l'orchestrateur IA (Claude/Tavily)."
2.  **Sécurité maîtrisée, pas déléguée** : "Je n'utilise **pas** Supabase Auth. J'ai codé moi-même l'authentification (JWT signé + `bcryptjs`) et la sécurité au niveau base : un RLS « maison » avec un rôle PostgreSQL dédié sans BYPASSRLS et des policies sur ma propre variable de session. Supabase n'héberge que le PostgreSQL — toute la logique de sécurité est dans mon code."
3.  **PostgreSQL Standard** : "Supabase n'est pas une boîte noire. C'est du PostgreSQL pur. Si je veux migrer demain vers un serveur dédié (AWS RDS ou VPS), je peux exporter mon schéma et mes données sans changer une ligne de SQL."

---

## 🛑 3. Questions Pièges & Réponses Types

### Q1 : "C'est trop facile non ? Vous n'avez pas codé votre base de données..."
> **Réponse :** "Attention, Supabase héberge les données, mais c'est **moi qui ai conçu tout le modèle conceptuel (MCD)**. J'ai défini les tables, les types de données (UUID, JSONB pour les itinéraires), et les relations entre utilisateurs et voyages. La complexité n'est pas d'installer le moteur SQL, mais de structurer les données pour qu'elles servent l'application."

### Q2 : "Et si Supabase ferme demain, votre projet meurt ?"
> **Réponse :** "Pas du tout. L'avantage de Supabase est qu'il repose sur **PostgreSQL standard**. Je possède mon schéma SQL. Je peux faire un `pg_dump` de ma base et la remonter sur n'importe quel serveur Linux en quelques minutes. Mon application est 'Database Agnostic' vis-à-vis de l'hébergeur."

### Q3 : "Pourquoi ne pas avoir fait un simple serveur Express avec MongoDB ?"
> **Réponse :** "Le projet TripGenie nécessite une forte intégrité des données (liens entre utilisateurs, votes et voyages). Le **relationnel (SQL)** est bien plus adapté ici que le NoSQL. De plus, PostgreSQL gère nativement le format **JSONB**, ce qui me permet de stocker les itinéraires dynamiques de l'IA avec la performance du SQL et la flexibilité du NoSQL."

### Q4 : "Comment votre serveur Node.js communique-t-il avec Supabase ?"
> **Réponse :** "Historiquement via le **Supabase Client SDK** (clé de service). Je bascule vers une **connexion SQL directe** (driver `pg`) avec un **rôle PostgreSQL dédié sans BYPASSRLS**, pour que le **Row Level Security s'applique vraiment** — une 2ᵉ barrière au niveau base, en plus du filtre applicatif. Supabase reste un simple hébergeur PostgreSQL ; toute la sécurité est dans mon code."

### Q5 : "Le RLS, c'est Supabase qui le fait pour vous ?"
> **Réponse :** "Non. Le RLS de Supabase est lié à Supabase Auth, que je n'utilise pas. J'ai recréé le mien : un rôle PostgreSQL dédié **sans BYPASSRLS**, une variable de session **transaction-locale** posée par requête, et des policies **fail-closed** (sans utilisateur posé → zéro ligne). C'est de la **défense en profondeur** que je maîtrise de bout en bout, prouvée par un script de test (isolation A/B vérifiée)."

---

## 🛠 4. Rappel : Ce que tu ferais "Sans aide" (Le mode expert)
Si le jury te demande comment tu ferais sans Supabase :
1.  Louer un **VPS** (OVH/DigitalOcean).
2.  Installer **Linux** (Ubuntu).
3.  Installer et sécuriser le démon **PostgreSQL**.
4.  Créer les utilisateurs et rôles SQL manuellement.
5.  Installer `bcrypt` et `jsonwebtoken` dans Node.js pour recréer toute la logique de Login/Sign-up.
6.  Gérer les **backups** (sauvegardes) avec des scripts automatisés.

**Conclusion :** Tu sais le faire, mais tu as choisi l'efficacité pour le MVP. 🚀🦾
