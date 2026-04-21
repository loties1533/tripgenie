from app.persistence.repository import SQLAlchemyRepository
from app.persistence.user_repository import UserRepository
from app.models.user import User
from app.models.amenity import Amenity
from app.models.place import Place
from app.models.review import Review
from app import db


class HBnBFacade:
    def __init__(self):
        self.user_repo   = UserRepository()
        self.place_repo  = SQLAlchemyRepository(Place)
        self.review_repo = SQLAlchemyRepository(Review)
        self.amenity_repo = SQLAlchemyRepository(Amenity)

    """User methods"""
    def create_user(self, user_data):
        user = User(**user_data)
        self.user_repo.add(user)
        return user

    def get_user(self, user_id):
        return self.user_repo.get(user_id)

    def get_user_by_email(self, email):
        return self.user_repo.get_user_by_email(email)

    def get_all_users(self):
        return self.user_repo.get_all()

    def update_user(self, user_id, data):
        user = self.get_user(user_id)
        if not user:
            return None
        if 'password' in data:
            user.hash_password(data.pop('password'))
        user.update(data)
        db.session.commit()
        return user
    
    def delete_user(self, user_id):
        user = self.get_user(user_id)
        if not user:
            return False
        self.user_repo.delete(user_id)
        return True

    """Amenity methods"""
    def create_amenity(self, amenity_data):
        amenity = Amenity(**amenity_data)
        self.amenity_repo.add(amenity)
        return amenity

    def get_amenity(self, amenity_id):
        return self.amenity_repo.get(amenity_id)

    def get_all_amenities(self):
        return self.amenity_repo.get_all()

    def update_amenity(self, amenity_id, amenity_data):
        amenity = self.get_amenity(amenity_id)
        if not amenity:
            return None
        amenity.update(amenity_data)
        db.session.commit()
        return amenity

    """Place methods"""
    def create_place(self, place_data):
        owner_id = place_data.pop('owner_id', None)
        owner = self.get_user(owner_id)
        if not owner:
            raise ValueError("Owner not found")

        place_data.pop('amenities', [])
        place = Place(owner_id=owner_id, **place_data)
        self.place_repo.add(place)
        return place

    def get_place(self, place_id):
        return self.place_repo.get(place_id)

    def get_all_places(self):
        return self.place_repo.get_all()

    def update_place(self, place_id, place_data):
        place = self.get_place(place_id)
        if not place:
            return None
        place.update(place_data)
        db.session.commit()
        return place

    """Review methods"""
    def create_review(self, review_data):
        user_id  = review_data.get('user_id')
        place_id = review_data.get('place_id')

        user  = self.get_user(user_id)
        place = self.get_place(place_id)

        if not user:
            raise ValueError("User not found.")
        if not place:
            raise ValueError("Place not found.")

        review = Review(**review_data)
        self.review_repo.add(review)
        return review

    def get_review(self, review_id):
        return self.review_repo.get(review_id)

    def get_all_reviews(self):
        return self.review_repo.get_all()

    def get_reviews_by_place(self, place_id):
        place = self.get_place(place_id)
        if not place:
            return None
        return self.review_repo.get_all_by_attribute('_place_id', place_id)

    def update_review(self, review_id, review_data):
        review = self.get_review(review_id)
        if not review:
            return None
        review.update(review_data)
        db.session.commit()
        return review

    def delete_review(self, review_id):
        review = self.get_review(review_id)
        if not review:
            return False
        self.review_repo.delete(review_id)
        return True

    def add_amenity_to_place(self, place_id, amenity_id):
        """Liaison Many-to-Many entre Place et Amenity"""
        place = self.get_place(place_id)
        amenity = self.get_amenity(amenity_id)

        if not place:
            raise ValueError("Place not found")
        if not amenity:
            raise ValueError("Amenity not found")

        # Si l'amenity n'est pas déjà liée, on l'ajoute
        if amenity not in place.amenities:
            place.amenities.append(amenity)
            db.session.commit()  # On valide l'écriture dans la table de liaison SQL
