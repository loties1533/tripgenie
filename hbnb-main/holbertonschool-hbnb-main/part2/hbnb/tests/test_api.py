import unittest
from app import create_app

class TestHBnBAPI(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    # --- TESTS USERS ---
    def test_create_user_valid(self):
        """Test création user valide"""
        response = self.client.post('/api/v1/users/', json={
            "first_name": "Alice",
            "last_name": "Liddell",
            "email": "alice@wonderland.com"
        })
        self.assertEqual(response.status_code, 201)

    def test_create_user_invalid_email(self):
        """Test email invalide (doit renvoyer 400)"""
        response = self.client.post('/api/v1/users/', json={
            "first_name": "Alice",
            "last_name": "Liddell",
            "email": "not-an-email"
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json)

    # --- TESTS AMENITIES ---
    def test_create_amenity_too_long(self):
        """Test nom d'amenity trop long (doit renvoyer 400)"""
        response = self.client.post('/api/v1/amenities/', json={
            "name": "A" * 51
        })
        self.assertEqual(response.status_code, 400)

    # --- TESTS PLACES ---
    def test_create_place_no_owner(self):
        """Test création place sans owner valide (doit renvoyer 400 via la facade)"""
        response = self.client.post('/api/v1/places/', json={
            "title": "Ghost House",
            "description": "No one owns this",
            "price": 100.0,
            "latitude": 45.0,
            "longitude": 1.0,
            "owner_id": "non-existent-id"
        })
        self.assertEqual(response.status_code, 400)

    def test_place_invalid_price(self):
        """Test prix négatif (doit renvoyer 400)"""
        response = self.client.post('/api/v1/places/', json={
            "title": "Cheap House",
            "price": -10.0,
            "latitude": 0,
            "longitude": 0,
            "owner_id": "some-id"
        })
        self.assertEqual(response.status_code, 400)