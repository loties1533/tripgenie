# 📖 TRIPGENIE : LE GUIDE D'EXPLICATION DÉTAILLÉ
*Document de révision pour comprendre et défendre son code (Spécial passage de Vanilla vers React/Supabase).*

Ce document t'explique **point par point** comment ton application fonctionne "sous le capot". Il est écrit pour faire le pont entre ce que tu sais (Vanilla JS, SQL) et ce qu'utilise le projet (React, Supabase).

---

## 1. REACT : COMMENT ÇA MARCHE (Par rapport au Vanilla JS)

À Holberton, tu as appris à utiliser `document.getElementById()` pour changer du texte ou cacher des div. **React fonctionne différemment : on ne touche jamais au DOM directement.**

### A. L'État (Le "State")
En React, on utilise des "variables d'état". Quand une variable change, React met à jour la page automatiquement.
Dans TripGenie, tu utilises **Zustand** (dans `client-react/src/store/index.js`). C'est un gros "coffre-fort" où tu ranges tes variables pour que tous tes fichiers y aient accès.
*   *Exemple :* Quand l'IA trouve une destination, on la met dans le store. Automatiquement, le composant React qui affiche le titre se met à jour.

### B. Le Découpage en Composants
Au lieu d'avoir un fichier `index.html` géant, ton app est découpée en briques (les composants) dans le dossier `client-react/src/components/`.
*   `App.jsx` : C'est le composant principal. Il choisit d'afficher soit le Chat, soit les Résultats.
*   `ChatInterface.jsx` : C'est la boîte de dialogue avec l'IA.
*   `PackResults.jsx` : C'est la page qui affiche les cartes (vols, hôtels).
*   `VoteButtons.jsx` : C'est le tout petit composant qu'on a créé pour les boutons 👍👎.

---

## 2. SUPABASE : C'EST QUOI EXACTEMENT ?

Tu connais très bien PostgreSQL et les requêtes SQL classiques (`SELECT * FROM users`).
**Supabase**, c'est simplement une base de données PostgreSQL "dans le Cloud" avec une surcouche qui te permet de lui parler directement en JavaScript sans écrire les requêtes SQL à la main.

### La Traduction SQL -> Supabase :
*   **SQL Classique :**
    `INSERT INTO trip_votes (trip_id, item_id, vote_type) VALUES ('123', 'Hotel', true);`
*   **Façon Supabase (dans `server/routes/votes.js`) :**
    ```javascript
    await supabase
      .from('trip_votes')
      .insert({ trip_id: '123', item_id: 'Hotel', vote_type: true })
    ```

**C'est la même chose !** Sous le capot, Supabase prend ton code JavaScript et exécute la requête SQL que tu as définie dans ton fichier `schema.sql`.

---

## 3. LE FLUX DE L'APPLICATION (Le Chemin de la Donnée)

Voici exactement ce qui se passe quand l'utilisateur utilise ton app. C'est l'histoire que tu dois raconter au jury :

### Étape 1 : Le Chat (Frontend -> Backend)
1. L'utilisateur tape *"Je veux aller faire la fête en Espagne"*.
2. Le frontend React (composant `ChatInterface`) envoie ce texte au backend (route `POST /api/ai/onboarding`).

### Étape 2 : L'Intelligence Artificielle (Backend)
1. Le backend Node.js (`server/routes/ai.js`) reçoit le texte.
2. Il l'envoie à l'IA Claude (ou OpenRouter si Claude est indisponible, c'est notre fameux **Mode Survie**).
3. L'IA lit le texte et renvoie un format JSON propre : `{"destination": "Ibiza", "mode": "party"}`.

### Étape 3 : La Génération du Pack (Les APIs)
Quand le chatbot a assez d'infos, il déclenche la route finale `POST /api/ai/generate`.
C'est là que le "cerveau" de ton backend s'active :
1. Il appelle **SmartSearch (via Tavily)** pour effectuer une recherche web agentique et trouver des vols réels.
2. Il appelle **Tavily** pour trouver des événements, vols et hôtels réels via recherche web temps réel.
3. Il assemble tout ça dans un gros objet JSON qu'on appelle le "Pack".

### Étape 4 : La Sauvegarde (Supabase)
Avant de renvoyer le Pack au Frontend, le Backend va le sauvegarder.
1. Il génère un `UUID` (ex: `550e...`).
2. Il insère le pack dans la table `trips` de ta base de données PostgreSQL via Supabase.

### Étape 5 : L'Affichage (Backend -> Frontend)
1. Le Backend renvoie le Pack et le `trip_id` au Frontend.
2. React reçoit la donnée. Le store **Zustand** se met à jour.
3. La page change toute seule : le Chat disparaît, et le composant `PackResults.jsx` s'affiche avec toutes les belles cartes de vols et d'hôtels.

### Étape 6 : Les Votes (Le Social)
1. L'utilisateur clique sur 👍 sur la carte de l'hôtel.
2. Le composant `VoteButtons` fait un `POST /api/votes` avec l'ID du voyage et l'ID de l'hôtel.
3. Le backend fait un `.insert()` dans la table `trip_votes` via Supabase.
4. C'est sécurisé grâce à notre relation *Many-to-Many* et nos clés étrangères.

---

## 💡 CONSEILS POUR LE JURY (Ce qu'il faut dire)
Si on te pose une question sur React ou Supabase et que tu n'es pas sûr, utilise cette phrase magique :

> *"React et Supabase sont des outils que j'ai découverts pour ce projet. Mon socle de base est le Vanilla JS et le SQL pur (comme appris lors du projet HBnB). Utiliser React m'a permis d'avoir un état local (State) beaucoup plus facile à gérer qu'avec des querySelectors classiques, et Supabase m'a permis d'interagir avec ma base PostgreSQL en JavaScript, tout en gardant mes contraintes d'intégrité référentielles que j'ai définies dans mon schema.sql."*
