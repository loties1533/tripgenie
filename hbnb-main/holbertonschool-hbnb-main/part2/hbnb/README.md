# HBnB Evolution - Part 2: Business Logic & API
## 1. Présentation du Projet

Ce projet est la deuxième étape de l'application HBnB. Il implémente la logique métier (Business Logic) et une API RESTful en utilisant une architecture en couches.

## 2. Architecture

L'application est structurée comme suit :

- Modèles (Models) : Définissent les entités (User, Place, Review, Amenity) et leurs règles de validation.
- Services (Facade) : Orchestrent les opérations entre l'API et la persistance.
- API (v1) : Endpoints Flask-RESTx pour interagir avec le système.
- Persistance : Système de stockage en mémoire (InMemoryRepository) prêt pour une migration SQL.

## 3. Installation et Lancement

1. Installer les dépendances : `pip install -r requirements.txt`
2. Lancer le serveur : `python3 run.py`
3. Accéder à la documentation Swagger : `http://127.0.0.1:5000/api/v1/`

## 4. Tests Unitaires (Unittest)

Pour valider la robustesse du code, des tests automatisés ont été mis en place.
Commande :

```bash
python3 -m unittest discover tests
Résultat attendu :
OK (tests passés avec succès)
```

## 5. Exemples de Validation (Tests Manuels)

A. Création d'un Utilisateur

Requête :

```bash
curl -X POST "http://127.0.0.1:5000/api/v1/users/" -H "Content-Type: application/json" -d '{"first_name": "Bob", "last_name": "Sponge", "email": "invalid@@email.com"}'
Résultat (400 Bad Request) :
```
```JSON
{ "error": "Invalid email format." }
B. Création d'une Place (Prix négatif)
```
Requête :

```bash
curl -X POST "http://127.0.0.1:5000/api/v1/places/" -H "Content-Type: application/json" -d '{"title": "Cheap House", "price": -50.0, "latitude": 45.0, "longitude": 1.0, "owner_id": "ID_VALIDE"}'
Résultat (400 Bad Request) :
```
```JSON
{ "error": "Price must be positive." }
```
