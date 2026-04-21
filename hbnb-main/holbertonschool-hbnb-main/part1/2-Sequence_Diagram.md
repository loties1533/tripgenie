# 2. Sequence Diagrams for API Calls

## 1. User Registration :

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Controller
    participant US as UserService
    participant UM as UserModel
    participant DB as Persistence

    C->>API: POST /users {email,pwd}
    API->>US: register_user(data)
    US->>UM: create(email, hash_pwd)
    UM->>DB: insert users
    DB-->>UM: user_id
    UM-->>US: user_obj
    US-->>API: Post request 201 {id,email}
    API-->>C: JSON Response
```

### Flux étape par étape :
- Client envoie POST /users {email, mot de passe} vers le contrôleur API
- API valide les données et appelle UserService.register_user()
- UserService hache le mot de passe et appelle UserModel.create(email, hash_pwd)
- UserModel exécute INSERT INTO users dans la couche Persistence
- Base de données renvoie le nouvel user_id en remontant la chaîne
- UserModel construit user_obj et le renvoie à UserService
- UserService renvoie 201 {id, email} (statut Created)
- API envoie la réponse JSON finale au Client


## 2. Place Creation :

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Controller
    participant Auth as Auth Service
    participant PS as PlaceService
    participant PM as PlaceModel
    participant DB as Persistence

    C->>API: POST /places {name,price,user_id}
    API->>Auth: validate_token()
    Auth-->>API: valid
    API->>PS: create_place(data)
    PS->>PM: new Place(owner_id)
    PM->>DB: INSERT places
    DB-->>PM: place_id
    PM-->>PS: place_obj
    PS-->>API: 201 place
    API-->>C: JSON Response
```

### Flux étape par étape :
- Client envoie POST /places {name, price, user_id} vers le contrôleur API
- API appelle Auth Service pour vérifier le Json Web Token
- Auth confirme l'utilisateur (propriétaire valide)
- API appelle PlaceService.create_place(data)
- PlaceService crée PlaceModel avec owner_id = user_id
- PlaceModel exécute INSERT INTO places dans Persistence
- Base de données renvoie le place_id généré
- PlaceModel remonte l'objet complet vers PlaceService
- PlaceService renvoie 201 place_obj à l'API
- API renvoie réponse JSON au Client


## 3. Review Submission :

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Controller
    participant RS as ReviewService
    participant RM as ReviewModel
    participant PM as PlaceModel
    participant DB as Persistence

    C->>API: POST /places/{pid}/reviews {text}
    API->>RS: create_review(pid,text)
    RS->>PM: find(pid)
    PM-->>RS: place
    RS->>RM: new Review(place,user)
    RM->>DB: INSERT reviews
    DB-->>RM: review_id
    RM-->>RS: review_obj
    RS-->>API: 201 review
    API-->>C: JSON Response
```

### Flux étape par étape :
- Client → API: POST /places/{place_id}/reviews {text, user_id}
- API → ReviewService: create_review(place_id, text, user_id)
- ReviewService → PlaceModel: find_by_id(place_id)  # Vérifie place existe
- PlaceModel → DB: SELECT * FROM places WHERE id=?
- DB → PlaceModel → ReviewService: place_obj
- ReviewService → ReviewModel: new Review(place_obj, user_id, text)
- ReviewModel → DB: INSERT INTO reviews (place_id, user_id, text)
- DB → ReviewModel: review_id généré
- ReviewModel → ReviewService: review_obj complet
- ReviewService → API: 201 {id, text, place_id}
- API → Client: JSON réponse



## 4. Fetching a List of Places :

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Controller
    participant PS as PlaceService
    participant PM as PlaceModel
    participant DB as Persistence

    C->>API: GET /places?state=AQ&min_price=50
    API->>PS: query_places(filters)
    PS->>PM: filter(state,min_price)
    PM->>DB: SELECT * FROM places WHERE...
    DB-->>PM: [places]
    PM->>PM: to_dict_list()
    PM-->>PS: [place_dicts]
    PS-->>API: 200 {places}
    API-->>C: JSON Response
```

### Flux étape par étape :
- Client → API: GET /places?state=AQ&price_min=50
- API → PlaceService: query_places(filters={state:'AQ', price_min:50})
- PlaceService → PlaceModel: filter_places(filters)
- PlaceModel → DB: SELECT * FROM places WHERE state=? AND price>=?
- DB → PlaceModel: [raw_places]
- PlaceModel → PlaceModel: [to_dict(place) for place in raw_places]
- PlaceModel → PlaceService: [place_dicts]
- PlaceService → API: 200 {places: [place_dicts], count: N}
- API → Client: JSON réponse paginée

