```mermaid
---
title: Business Logic Layer - Class Diagram
---

classDiagram
    class User {
        -id: UUID
        -first_name: str
        -last_name: str
        -email: str
        -password: str
        -is_admin: bool
        -created_at: datetime
        -updated_at: datetime
        +register(first_name: str, last_name: str, email: str, password: str) User
        +update_profile(data: dict) User
        +delete() bool
    }

    class Place {
        -id: UUID
        -owner_id: UUID
        -title: str
        -description: str
        -price: float
        -latitude: float
        -longitude: float
        -created_at: datetime
        -updated_at: datetime
        +create(owner_id: UUID, title: str, description: str, price: float, latitude: float, longitude: float) Place
        +update(data: dict) Place
        +delete() bool
        +list() list[Place]
    }

    class Review {
        -id: UUID
        -user_id: UUID
        -place_id: UUID
        -comment: str
        -rating: int
        -created_at: datetime
        -updated_at: datetime
        +create(user_id: UUID, place_id: UUID, comment: str, rating: int) Review
        +update(data: dict) Review
        +delete() bool
        +list_by_place(place_id: UUID) list[Review]
    }

    class Amenity {
        -id: UUID
        -name: str
        -description: str
        -created_at: datetime
        -updated_at: datetime
        +create(name: str, description: str) Amenity
        +update(data: dict) Amenity
        +delete() bool
        +list() list[Amenity]
    }

    %% Relationships
    User "1" -- "0..*" Place : owns
    User "1" -- "0..*" Review : writes
    Place "1" *-- "0..*" Review
    Place "0..*" o-- "0..*" Amenity
```

## Relations entre classes

User "1" -- "0..*" Place : possède (1-to-many, Agrégation)  
* Un utilisateur peut posséder plusieurs lieux (Place)

User "1" -- "0..*" Review : écrit (1-to-many, Agrégation)  
* Un utilisateur peut écrire plusieurs avis (Review)

Place "1" *-- "0..*" Review : contient (1-to-many, Composition)  
* Un lieu peut avoir plusieurs avis

Place "0..*" o-- "0..*" Amenity : propose (many-to-many, Association/Agrégation)
* Un lieu peut proposer plusieurs services/commodités (Amenity)
