from app.models.user import User
from app.models.place import Place
from app.models.amenity import Amenity
from app.models.review import Review

def test_user_creation():
    user = User(first_name="John", last_name="Doe", email="john.doe@example.com")
    assert user.first_name == "John"
    assert user.last_name == "Doe"
    assert user.email == "john.doe@example.com"
    assert user.is_admin is False  
    print("User creation test passed!")

def test_place_creation():
    owner = User(first_name="Alice", last_name="Smith", email="alice.smith@example.com")
    place = Place(title="Cozy Apartment", description="A nice place to stay", price=100, latitude=37.7749, longitude=-122.4194, owner=owner)


    review = Review(text="Great stay!", rating=5, place=place, user=owner)
  
    if hasattr(place, 'reviews'):
        assert len(place.reviews) >= 1
    
    assert place.title == "Cozy Apartment"
    assert place.price == 100
    print("Place creation and relationship test passed!")

def test_amenity_creation():
    amenity = Amenity(name="Wi-Fi")
    assert amenity.name == "Wi-Fi"
    print("Amenity creation test passed!")

if __name__ == "__main__":
    test_user_creation()
    test_place_creation()
    test_amenity_creation()