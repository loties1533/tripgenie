#!/usr/bin/python3
"""
Tests complets pour tous les endpoints HBnB API - Part 3
Couvre tous les cas positifs et négatifs pour :
- Users, Amenities, Places, Reviews
Utilise JWT et SQLite en mémoire
"""
import unittest
import uuid
from flask_jwt_extended import create_access_token
from app import create_app, db


class TestConfig:
    """Configuration de test avec SQLite en mémoire"""
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test_secret_key'
    JWT_SECRET_KEY = 'test_jwt_secret_key'


def unique_email():
    """Génère un email unique pour chaque test"""
    return f"test_{uuid.uuid4().hex[:8]}@example.com"


class BaseTestCase(unittest.TestCase):
    """Classe de base pour tous les tests"""

    def setUp(self):
        self.app = create_app()
        self.app.config.from_object(TestConfig)
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def get_admin_token(self):
        """Génère un token JWT admin"""
        with self.app.app_context():
            return create_access_token(
                identity='admin-test-id',
                additional_claims={'is_admin': True}
            )

    def get_user_token(self, user_id):
        """Génère un token JWT user normal"""
        with self.app.app_context():
            return create_access_token(
                identity=user_id,
                additional_claims={'is_admin': False}
            )

    def admin_headers(self):
        return {'Authorization': f'Bearer {self.get_admin_token()}'}

    def user_headers(self, user_id):
        return {'Authorization': f'Bearer {self.get_user_token(user_id)}'}

    def create_user(self, admin=True, **kwargs):
        """Helper pour créer un user via API"""
        data = {
            'first_name': 'Test',
            'last_name': 'User',
            'email': unique_email(),
            'password': 'password123'
        }
        data.update(kwargs)
        response = self.client.post(
            '/api/v1/users/',
            json=data,
            headers=self.admin_headers()
        )
        return response

    def create_amenity(self, name='Wi-Fi'):
        """Helper pour créer une amenity via API"""
        return self.client.post(
            '/api/v1/amenities/',
            json={'name': name},
            headers=self.admin_headers()
        )

    def create_place(self, owner_id, **kwargs):
        """Helper pour créer un place via API"""
        data = {
            'title': 'Test Place',
            'description': 'A nice place',
            'price': 100.0,
            'latitude': 48.8566,
            'longitude': 2.3522,
            'owner_id': owner_id,
            'amenities': []
        }
        data.update(kwargs)
        return self.client.post(
            '/api/v1/places/',
            json=data,
            headers=self.user_headers(owner_id)
        )

    def create_review(self, user_id, place_id, **kwargs):
        """Helper pour créer une review via API"""
        data = {
            'text': 'Great place!',
            'rating': 5,
            'user_id': user_id,
            'place_id': place_id
        }
        data.update(kwargs)
        return self.client.post(
            '/api/v1/reviews/',
            json=data,
            headers=self.user_headers(user_id)
        )


# =============================================================
# TESTS USERS
# =============================================================

class TestUserEndpoints(BaseTestCase):
    """Tests pour les endpoints /api/v1/users/"""

    # POST /api/v1/users/

    def test_01_create_user_valid(self):
        """Création d'un utilisateur valide (admin) -> 201"""
        response = self.create_user()
        self.assertEqual(response.status_code, 201)
        self.assertIn('id', response.get_json())

    def test_02_create_user_not_admin(self):
        """Création sans être admin -> 403"""
        user_resp = self.create_user()
        user_id = user_resp.get_json()['id']
        response = self.client.post('/api/v1/users/', json={
            'first_name': 'Jane',
            'last_name': 'Doe',
            'email': unique_email(),
            'password': 'password123'
        }, headers=self.user_headers(user_id))
        self.assertEqual(response.status_code, 403)

    def test_03_create_user_no_token(self):
        """Création sans token -> 401"""
        response = self.client.post('/api/v1/users/', json={
            'first_name': 'Jane',
            'last_name': 'Doe',
            'email': unique_email(),
            'password': 'password123'
        })
        self.assertEqual(response.status_code, 401)

    def test_04_create_user_duplicate_email(self):
        """Email déjà enregistré -> 400"""
        email = unique_email()
        self.create_user(email=email)
        response = self.create_user(email=email)
        self.assertEqual(response.status_code, 400)

    def test_05_create_user_invalid_email(self):
        """Email invalide -> 400"""
        response = self.create_user(email='invalid-email')
        self.assertEqual(response.status_code, 400)

    def test_06_create_user_empty_first_name(self):
        """Prénom vide -> 400"""
        response = self.create_user(first_name='')
        self.assertEqual(response.status_code, 400)

    def test_07_create_user_empty_last_name(self):
        """Nom vide -> 400"""
        response = self.create_user(last_name='')
        self.assertEqual(response.status_code, 400)

    def test_08_create_user_first_name_too_long(self):
        """Prénom > 50 caractères -> 400"""
        response = self.create_user(first_name='J' * 51)
        self.assertEqual(response.status_code, 400)

    def test_09_create_user_last_name_too_long(self):
        """Nom > 50 caractères -> 400"""
        response = self.create_user(last_name='D' * 51)
        self.assertEqual(response.status_code, 400)

    # GET /api/v1/users/

    def test_10_get_all_users(self):
        """Liste des users -> 200"""
        response = self.client.get('/api/v1/users/')
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.get_json(), list)

    def test_11_get_all_users_after_creation(self):
        """Liste non vide après création -> 200"""
        self.create_user()
        response = self.client.get('/api/v1/users/')
        self.assertGreater(len(response.get_json()), 0)

    # GET /api/v1/users/<user_id>

    def test_12_get_user_by_id_valid(self):
        """Récupération d'un user existant -> 200"""
        user_id = self.create_user().get_json()['id']
        response = self.client.get(f'/api/v1/users/{user_id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['id'], user_id)

    def test_13_get_user_by_id_not_found(self):
        """ID inexistant -> 404"""
        response = self.client.get('/api/v1/users/nonexistent-id')
        self.assertEqual(response.status_code, 404)

    # PUT /api/v1/users/<user_id>

    def test_14_update_user_valid(self):
        """Mise à jour valide par le user lui-même -> 200"""
        user_id = self.create_user().get_json()['id']
        response = self.client.put(f'/api/v1/users/{user_id}', json={
            'first_name': 'Updated',
            'last_name': 'Name'
        }, headers=self.user_headers(user_id))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['first_name'], 'Updated')

    def test_15_update_user_not_owner(self):
        """Mise à jour par un autre user -> 403"""
        user1_id = self.create_user().get_json()['id']
        user2_id = self.create_user().get_json()['id']
        response = self.client.put(f'/api/v1/users/{user1_id}', json={
            'first_name': 'Hacker'
        }, headers=self.user_headers(user2_id))
        self.assertEqual(response.status_code, 403)

    def test_16_update_user_not_found(self):
        """Mise à jour ID inexistant -> 404"""
        response = self.client.put('/api/v1/users/nonexistent-id', json={
            'first_name': 'Ghost'
        }, headers=self.admin_headers())
        self.assertEqual(response.status_code, 404)

    def test_17_update_user_email_blocked_for_normal_user(self):
        """User normal ne peut pas modifier son email -> 400"""
        user_id = self.create_user().get_json()['id']
        response = self.client.put(f'/api/v1/users/{user_id}', json={
            'email': unique_email()
        }, headers=self.user_headers(user_id))
        self.assertEqual(response.status_code, 400)

    def test_18_update_user_password_blocked_for_normal_user(self):
        """User normal ne peut pas modifier son password -> 400"""
        user_id = self.create_user().get_json()['id']
        response = self.client.put(f'/api/v1/users/{user_id}', json={
            'password': 'newpassword'
        }, headers=self.user_headers(user_id))
        self.assertEqual(response.status_code, 400)

    def test_19_update_user_email_allowed_for_admin(self):
        """Admin peut modifier l'email -> 200"""
        user_id = self.create_user().get_json()['id']
        response = self.client.put(f'/api/v1/users/{user_id}', json={
            'first_name': 'Admin',
            'last_name': 'Updated',
            'email': unique_email(),
            'password': 'newpassword'
        }, headers=self.admin_headers())
        self.assertEqual(response.status_code, 200)

    def test_20_update_user_duplicate_email(self):
        """Mise à jour avec email déjà utilisé -> 400"""
        email1 = unique_email()
        self.create_user(email=email1)
        user2_id = self.create_user().get_json()['id']
        response = self.client.put(f'/api/v1/users/{user2_id}', json={
            'first_name': 'Test',
            'last_name': 'Test',
            'email': email1,
            'password': 'password'
        }, headers=self.admin_headers())
        self.assertEqual(response.status_code, 400)


# =============================================================
# TESTS AMENITIES
# =============================================================

class TestAmenityEndpoints(BaseTestCase):
    """Tests pour les endpoints /api/v1/amenities/"""

    # POST /api/v1/amenities/

    def test_01_create_amenity_valid(self):
        """Création d'une amenity valide (admin) -> 201"""
        response = self.create_amenity('Wi-Fi')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()['name'], 'Wi-Fi')

    def test_02_create_amenity_not_admin(self):
        """Création sans être admin -> 403"""
        user_id = self.create_user().get_json()['id']
        response = self.client.post('/api/v1/amenities/', json={
            'name': 'Pool'
        }, headers=self.user_headers(user_id))
        self.assertEqual(response.status_code, 403)

    def test_03_create_amenity_no_token(self):
        """Création sans token -> 401"""
        response = self.client.post('/api/v1/amenities/', json={'name': 'Pool'})
        self.assertEqual(response.status_code, 401)

    def test_04_create_amenity_empty_name(self):
        """Nom vide -> 400"""
        response = self.create_amenity('')
        self.assertEqual(response.status_code, 400)

    def test_05_create_amenity_name_too_long(self):
        """Nom > 50 caractères -> 400"""
        response = self.create_amenity('A' * 51)
        self.assertEqual(response.status_code, 400)

    def test_06_create_amenity_name_exactly_50(self):
        """Nom exactement 50 caractères -> 201"""
        response = self.create_amenity('A' * 50)
        self.assertEqual(response.status_code, 201)

    # GET /api/v1/amenities/

    def test_07_get_all_amenities(self):
        """Liste des amenities -> 200"""
        response = self.client.get('/api/v1/amenities/')
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.get_json(), list)

    def test_08_get_all_amenities_after_creation(self):
        """Liste non vide après création -> 200"""
        self.create_amenity('Parking')
        response = self.client.get('/api/v1/amenities/')
        self.assertGreater(len(response.get_json()), 0)

    # GET /api/v1/amenities/<amenity_id>

    def test_09_get_amenity_by_id_valid(self):
        """Récupération d'une amenity existante -> 200"""
        amenity_id = self.create_amenity('Pool').get_json()['id']
        response = self.client.get(f'/api/v1/amenities/{amenity_id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['name'], 'Pool')

    def test_10_get_amenity_by_id_not_found(self):
        """ID inexistant -> 404"""
        response = self.client.get('/api/v1/amenities/nonexistent-id')
        self.assertEqual(response.status_code, 404)

    # PUT /api/v1/amenities/<amenity_id>

    def test_11_update_amenity_valid(self):
        """Mise à jour valide (admin) -> 200"""
        amenity_id = self.create_amenity('TV').get_json()['id']
        response = self.client.put(f'/api/v1/amenities/{amenity_id}', json={
            'name': 'Smart TV'
        }, headers=self.admin_headers())
        self.assertEqual(response.status_code, 200)

    def test_12_update_amenity_not_admin(self):
        """Mise à jour sans être admin -> 403"""
        amenity_id = self.create_amenity('Gym').get_json()['id']
        user_id = self.create_user().get_json()['id']
        response = self.client.put(f'/api/v1/amenities/{amenity_id}', json={
            'name': 'Gym Updated'
        }, headers=self.user_headers(user_id))
        self.assertEqual(response.status_code, 403)

    def test_13_update_amenity_not_found(self):
        """ID inexistant -> 404"""
        response = self.client.put('/api/v1/amenities/nonexistent-id', json={
            'name': 'Ghost'
        }, headers=self.admin_headers())
        self.assertEqual(response.status_code, 404)

    def test_14_update_amenity_empty_name(self):
        """Nom vide -> 400"""
        amenity_id = self.create_amenity('Spa').get_json()['id']
        response = self.client.put(f'/api/v1/amenities/{amenity_id}', json={
            'name': ''
        }, headers=self.admin_headers())
        self.assertEqual(response.status_code, 400)

    def test_15_update_amenity_name_too_long(self):
        """Nom > 50 caractères -> 400"""
        amenity_id = self.create_amenity('Spa').get_json()['id']
        response = self.client.put(f'/api/v1/amenities/{amenity_id}', json={
            'name': 'A' * 51
        }, headers=self.admin_headers())
        self.assertEqual(response.status_code, 400)


# =============================================================
# TESTS PLACES
# =============================================================

class TestPlaceEndpoints(BaseTestCase):
    """Tests pour les endpoints /api/v1/places/"""

    def setUp(self):
        super().setUp()
        self.owner_id = self.create_user().get_json()['id']
        self.amenity_id = self.create_amenity('Wi-Fi').get_json()['id']

    def _valid_place(self, **kwargs):
        data = {
            'title': 'Cozy Apartment',
            'description': 'Nice place',
            'price': 100.0,
            'latitude': 37.7749,
            'longitude': -122.4194,
            'owner_id': self.owner_id,
            'amenities': []
        }
        data.update(kwargs)
        return data

    # POST /api/v1/places/

    def test_01_create_place_valid(self):
        """Création d'un place valide -> 201"""
        response = self.create_place(self.owner_id)
        self.assertEqual(response.status_code, 201)
        self.assertIn('id', response.get_json())

    def test_02_create_place_no_token(self):
        """Création sans token -> 401"""
        response = self.client.post('/api/v1/places/', json=self._valid_place())
        self.assertEqual(response.status_code, 401)

    def test_03_create_place_invalid_owner(self):
        """Owner inexistant -> 400"""
        response = self.client.post('/api/v1/places/', json=self._valid_place(
            owner_id='nonexistent-owner-id'
        ), headers=self.user_headers(self.owner_id))
        self.assertEqual(response.status_code, 400)

    def test_04_create_place_negative_price(self):
        """Prix négatif -> 400"""
        response = self.client.post('/api/v1/places/', json=self._valid_place(
            price=-10.0
        ), headers=self.user_headers(self.owner_id))
        self.assertEqual(response.status_code, 400)

    def test_05_create_place_zero_price(self):
        """Prix = 0 -> 400"""
        response = self.client.post('/api/v1/places/', json=self._valid_place(
            price=0
        ), headers=self.user_headers(self.owner_id))
        self.assertEqual(response.status_code, 400)

    def test_06_create_place_latitude_too_high(self):
        """Latitude > 90 -> 400"""
        response = self.client.post('/api/v1/places/', json=self._valid_place(
            latitude=91.0
        ), headers=self.user_headers(self.owner_id))
        self.assertEqual(response.status_code, 400)

    def test_07_create_place_latitude_too_low(self):
        """Latitude < -90 -> 400"""
        response = self.client.post('/api/v1/places/', json=self._valid_place(
            latitude=-91.0
        ), headers=self.user_headers(self.owner_id))
        self.assertEqual(response.status_code, 400)

    def test_08_create_place_longitude_too_high(self):
        """Longitude > 180 -> 400"""
        response = self.client.post('/api/v1/places/', json=self._valid_place(
            longitude=181.0
        ), headers=self.user_headers(self.owner_id))
        self.assertEqual(response.status_code, 400)

    def test_09_create_place_longitude_too_low(self):
        """Longitude < -180 -> 400"""
        response = self.client.post('/api/v1/places/', json=self._valid_place(
            longitude=-181.0
        ), headers=self.user_headers(self.owner_id))
        self.assertEqual(response.status_code, 400)

    def test_10_create_place_empty_title(self):
        """Titre vide -> 400"""
        response = self.client.post('/api/v1/places/', json=self._valid_place(
            title=''
        ), headers=self.user_headers(self.owner_id))
        self.assertEqual(response.status_code, 400)

    def test_11_create_place_title_too_long(self):
        """Titre > 100 caractères -> 400"""
        response = self.client.post('/api/v1/places/', json=self._valid_place(
            title='T' * 101
        ), headers=self.user_headers(self.owner_id))
        self.assertEqual(response.status_code, 400)

    # GET /api/v1/places/

    def test_12_get_all_places(self):
        """Liste des places -> 200"""
        response = self.client.get('/api/v1/places/')
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.get_json(), list)

    def test_13_get_all_places_after_creation(self):
        """Liste non vide après création -> 200"""
        self.create_place(self.owner_id)
        response = self.client.get('/api/v1/places/')
        self.assertGreater(len(response.get_json()), 0)

    # GET /api/v1/places/<place_id>

    def test_14_get_place_by_id_valid(self):
        """Récupération d'un place existant -> 200"""
        place_id = self.create_place(self.owner_id).get_json()['id']
        response = self.client.get(f'/api/v1/places/{place_id}')
        self.assertEqual(response.status_code, 200)

    def test_15_get_place_by_id_not_found(self):
        """ID inexistant -> 404"""
        response = self.client.get('/api/v1/places/nonexistent-id')
        self.assertEqual(response.status_code, 404)

    # PUT /api/v1/places/<place_id>

    def test_16_update_place_valid(self):
        """Mise à jour valide par le owner -> 200"""
        place_id = self.create_place(self.owner_id).get_json()['id']
        response = self.client.put(f'/api/v1/places/{place_id}', json=self._valid_place(
            title='Updated Title', price=200.0
        ), headers=self.user_headers(self.owner_id))
        self.assertEqual(response.status_code, 200)

    def test_17_update_place_not_owner(self):
        """Mise à jour par un non-owner -> 403"""
        place_id = self.create_place(self.owner_id).get_json()['id']
        other_user_id = self.create_user().get_json()['id']
        response = self.client.put(f'/api/v1/places/{place_id}', json=self._valid_place(),
                                   headers=self.user_headers(other_user_id))
        self.assertEqual(response.status_code, 403)

    def test_18_update_place_not_found(self):
        """ID inexistant -> 404"""
        response = self.client.put('/api/v1/places/nonexistent-id',
                                   json=self._valid_place(),
                                   headers=self.user_headers(self.owner_id))
        self.assertEqual(response.status_code, 404)

    def test_19_update_place_invalid_price(self):
        """Prix négatif -> 400"""
        place_id = self.create_place(self.owner_id).get_json()['id']
        response = self.client.put(f'/api/v1/places/{place_id}', json=self._valid_place(
            price=-50.0
        ), headers=self.user_headers(self.owner_id))
        self.assertEqual(response.status_code, 400)

    def test_20_update_place_admin_bypass(self):
        """Admin peut modifier n'importe quel place -> 200"""
        place_id = self.create_place(self.owner_id).get_json()['id']
        response = self.client.put(f'/api/v1/places/{place_id}', json=self._valid_place(
            title='Admin Updated'
        ), headers=self.admin_headers())
        self.assertEqual(response.status_code, 200)


# =============================================================
# TESTS REVIEWS
# =============================================================

class TestReviewEndpoints(BaseTestCase):
    """Tests pour les endpoints /api/v1/reviews/"""

    def setUp(self):
        super().setUp()
        self.user_id = self.create_user().get_json()['id']
        self.other_user_id = self.create_user().get_json()['id']
        self.place_id = self.create_place(self.other_user_id).get_json()['id']

    def _valid_review(self, **kwargs):
        data = {
            'text': 'Great place to stay!',
            'rating': 5,
            'user_id': self.user_id,
            'place_id': self.place_id
        }
        data.update(kwargs)
        return data

    # POST /api/v1/reviews/

    def test_01_create_review_valid(self):
        """Création d'une review valide -> 201"""
        response = self.create_review(self.user_id, self.place_id)
        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertIn('id', data)
        self.assertEqual(data['rating'], 5)

    def test_02_create_review_no_token(self):
        """Création sans token -> 401"""
        response = self.client.post('/api/v1/reviews/', json=self._valid_review())
        self.assertEqual(response.status_code, 401)

    def test_03_create_review_own_place(self):
        """Review de son propre place -> 400"""
        response = self.create_review(self.other_user_id, self.place_id)
        self.assertEqual(response.status_code, 400)

    def test_04_create_review_already_reviewed(self):
        """Deuxième review du même place -> 400"""
        self.create_review(self.user_id, self.place_id)
        response = self.create_review(self.user_id, self.place_id)
        self.assertEqual(response.status_code, 400)

    def test_05_create_review_rating_too_high(self):
        """Rating > 5 -> 400"""
        response = self.client.post('/api/v1/reviews/', json=self._valid_review(rating=6),
                                    headers=self.user_headers(self.user_id))
        self.assertEqual(response.status_code, 400)

    def test_06_create_review_rating_too_low(self):
        """Rating < 1 -> 400"""
        response = self.client.post('/api/v1/reviews/', json=self._valid_review(rating=0),
                                    headers=self.user_headers(self.user_id))
        self.assertEqual(response.status_code, 400)

    def test_07_create_review_empty_text(self):
        """Texte vide -> 400"""
        response = self.client.post('/api/v1/reviews/', json=self._valid_review(text=''),
                                    headers=self.user_headers(self.user_id))
        self.assertEqual(response.status_code, 400)

    def test_08_create_review_invalid_place(self):
        """Place inexistant -> 400"""
        response = self.client.post('/api/v1/reviews/', json=self._valid_review(
            place_id='nonexistent-place-id'
        ), headers=self.user_headers(self.user_id))
        self.assertEqual(response.status_code, 400)

    # GET /api/v1/reviews/

    def test_09_get_all_reviews(self):
        """Liste des reviews -> 200"""
        response = self.client.get('/api/v1/reviews/')
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.get_json(), list)

    def test_10_get_all_reviews_after_creation(self):
        """Liste non vide après création -> 200"""
        self.create_review(self.user_id, self.place_id)
        response = self.client.get('/api/v1/reviews/')
        self.assertGreater(len(response.get_json()), 0)

    # GET /api/v1/reviews/<review_id>

    def test_11_get_review_by_id_valid(self):
        """Récupération d'une review existante -> 200"""
        review_id = self.create_review(self.user_id, self.place_id).get_json()['id']
        response = self.client.get(f'/api/v1/reviews/{review_id}')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('user_id', data)
        self.assertIn('place_id', data)

    def test_12_get_review_by_id_not_found(self):
        """ID inexistant -> 404"""
        response = self.client.get('/api/v1/reviews/nonexistent-id')
        self.assertEqual(response.status_code, 404)

    # GET /api/v1/places/<place_id>/reviews

    def test_13_get_reviews_by_place_valid(self):
        """Reviews d'un place existant -> 200"""
        self.create_review(self.user_id, self.place_id)
        response = self.client.get(f'/api/v1/places/{self.place_id}/reviews')
        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(response.get_json()), 0)

    def test_14_get_reviews_by_place_not_found(self):
        """Place inexistant -> 404"""
        response = self.client.get('/api/v1/places/nonexistent-id/reviews')
        self.assertEqual(response.status_code, 404)

    def test_15_get_reviews_by_place_empty(self):
        """Place sans reviews -> 200 avec []"""
        new_owner_id = self.create_user().get_json()['id']
        place_id = self.create_place(new_owner_id).get_json()['id']
        response = self.client.get(f'/api/v1/places/{place_id}/reviews')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [])

    # PUT /api/v1/reviews/<review_id>

    def test_16_update_review_valid(self):
        """Mise à jour valide par le auteur -> 200"""
        review_id = self.create_review(self.user_id, self.place_id).get_json()['id']
        response = self.client.put(f'/api/v1/reviews/{review_id}', json=self._valid_review(
            text='Updated review!', rating=4
        ), headers=self.user_headers(self.user_id))
        self.assertEqual(response.status_code, 200)

    def test_17_update_review_not_author(self):
        """Mise à jour par un non-auteur -> 403"""
        review_id = self.create_review(self.user_id, self.place_id).get_json()['id']
        response = self.client.put(f'/api/v1/reviews/{review_id}', json=self._valid_review(
            text='Hacked!'
        ), headers=self.user_headers(self.other_user_id))
        self.assertEqual(response.status_code, 403)

    def test_18_update_review_not_found(self):
        """ID inexistant -> 404"""
        response = self.client.put('/api/v1/reviews/nonexistent-id',
                                   json=self._valid_review(),
                                   headers=self.user_headers(self.user_id))
        self.assertEqual(response.status_code, 404)

    def test_19_update_review_invalid_rating(self):
        """Rating invalide -> 400"""
        review_id = self.create_review(self.user_id, self.place_id).get_json()['id']
        response = self.client.put(f'/api/v1/reviews/{review_id}', json=self._valid_review(
            rating=10
        ), headers=self.user_headers(self.user_id))
        self.assertEqual(response.status_code, 400)

    def test_20_update_review_admin_bypass(self):
        """Admin peut modifier n'importe quelle review -> 200"""
        review_id = self.create_review(self.user_id, self.place_id).get_json()['id']
        response = self.client.put(f'/api/v1/reviews/{review_id}', json=self._valid_review(
            text='Admin updated', rating=3
        ), headers=self.admin_headers())
        self.assertEqual(response.status_code, 200)

    # DELETE /api/v1/reviews/<review_id>

    def test_21_delete_review_valid(self):
        """Suppression d'une review existante -> 200"""
        review_id = self.create_review(self.user_id, self.place_id).get_json()['id']
        response = self.client.delete(f'/api/v1/reviews/{review_id}',
                                      headers=self.user_headers(self.user_id))
        self.assertEqual(response.status_code, 200)
        self.assertIn('message', response.get_json())

    def test_22_delete_review_not_author(self):
        """Suppression par un non-auteur -> 403"""
        review_id = self.create_review(self.user_id, self.place_id).get_json()['id']
        response = self.client.delete(f'/api/v1/reviews/{review_id}',
                                      headers=self.user_headers(self.other_user_id))
        self.assertEqual(response.status_code, 403)

    def test_23_delete_review_not_found(self):
        """ID inexistant -> 404"""
        response = self.client.delete('/api/v1/reviews/nonexistent-id',
                                      headers=self.user_headers(self.user_id))
        self.assertEqual(response.status_code, 404)

    def test_24_delete_review_then_get(self):
        """Après suppression, GET retourne 404"""
        review_id = self.create_review(self.user_id, self.place_id).get_json()['id']
        self.client.delete(f'/api/v1/reviews/{review_id}',
                           headers=self.user_headers(self.user_id))
        response = self.client.get(f'/api/v1/reviews/{review_id}')
        self.assertEqual(response.status_code, 404)

    def test_25_delete_review_admin_bypass(self):
        """Admin peut supprimer n'importe quelle review -> 200"""
        review_id = self.create_review(self.user_id, self.place_id).get_json()['id']
        response = self.client.delete(f'/api/v1/reviews/{review_id}',
                                      headers=self.admin_headers())
        self.assertEqual(response.status_code, 200)


if __name__ == '__main__':
    unittest.main(verbosity=2)