# HBnB — Part 4 : front end

Interface web front-end pour l'application HBnB, connectée au back-end Flask

---

## Structure des fichiers

```
part4/
├── index.html        # Liste des logements disponibles
├── login.html        # Formulaire de connexion
├── place.html        # Détail d'un logement 
├── add_review.html   # Formulaire d'ajout de review (page dédiée)
├── scripts.js        # Logique JS (Fetch API, auth, DOM)
├── styles.css        # Styles (thème sombre Slate/Teal)
└── images/
    ├── logo.png
    ├── icon.png
    ├── icon_bath.png
    ├── icon_bed.png
    └── icon_wifi.png
```

---

## Prérequis

- Le back-end Part 3 doit tourner sur `http://localhost:5000`
- **CORS activé** sur le back-end Flask (voir section ci-dessous)
- Un navigateur moderne (Chrome, Firefox, Edge)
- Aucune installation front-end requise — fichiers statiques purs

---

## Lancer le projet

###  Démarrer le back-end (Part 3)

```bash
cd ../part3/hbnb
pip install -r requirements.txt
python run.py
# → API disponible sur http://localhost:5000/api/v1
```

###  Ouvrir le front-end

Ouvrir `index.html` directement dans le navigateur **ou** utiliser un serveur local pour éviter les problèmes de cookies :

```bash
# Avec Python
cd part4/
python -m http.server 8080
# → http://localhost:8080
```

---

##  Authentification

L'application utilise **JWT (JSON Web Token)** stocké dans un cookie de session.

| Action | Comportement |
|---|---|
| Login réussi | Token JWT stocké dans le cookie `token`, redirect vers `index.html` |
| Login échoué | Message d'erreur affiché sous le formulaire |
| Accès `add_review.html` sans token | Redirect automatique vers `index.html` |
| Cookie absent sur `place.html` | Formulaire de review masqué |

### Tester le login

1. Ouvrir `http://localhost:8080/login.html`
2. Entrer un email/mot de passe valide (créé via l'API en Part 3)
3. Après connexion, vérifier le cookie dans les DevTools → **Application → Cookies** → chercher `token`

Pour créer un utilisateur de test via l'API :

```bash
curl -X POST http://localhost:5000/api/v1/users/ \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User","email":"test@test.com","password":"secret"}'
```

---

## Pages et fonctionnalités

### `index.html` — Liste des logements

- Affiche tous les logements récupérés depuis `GET /api/v1/places/`
- Filtre côté client par prix maximum (10 / 50 / 100 / All)
- Lien **Login** visible si non authentifié, masqué si connecté
- Chaque carte affiche : nom, prix par nuit, bouton "View Details"

### `login.html` — Connexion

- Formulaire email + mot de passe
- Requête `POST /api/v1/auth/login`
- Redirect automatique vers `index.html` si déjà connecté
- Bouton désactivé pendant la requête (anti double-clic)

### `place.html` — Détail d'un logement

- Récupère les détails via `GET /api/v1/places/:id`
- Affiche : hôte, prix, description, équipements
- Récupère et affiche les reviews via `GET /api/v1/places/:id/reviews`
- Si non connecté : section review masquée
- Redirect vers `index.html` si aucun `?id=` dans l'URL

### `add_review.html` — Ajouter une review (page dédiée)

- Accessible uniquement si connecté (sinon redirect `index.html`)
- Récupère le nom du logement via l'API pour l'afficher dans le titre
- Envoi via `POST /api/v1/reviews/`
- Message de succès puis redirect automatique vers `place.html?id=...`
- Lien "Back to place" pour revenir sans soumettre

