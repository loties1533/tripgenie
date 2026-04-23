#!/usr/bin/python3
"""
Tests couvrant les cas NON testés dans test_endpoints.py

Bugs ciblés :
  1. Endpoint POST /api/v1/auth/login (jamais testé)
  2. filter_by(_email=email) dans UserRepository → retourne None → login échoue
  3. Double hachage password (setter + hash_password)
  4. Vérification login après update password
  5. Cas limites non couverts (login mauvais mdp, email inconnu, token expiré, etc.)
"""

import unittest
import uuid
from flask_jwt_extended import create_access_token
from app import create_app, db


class TestConfig:
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test_secret_key'
    JWT_SECRET_KEY = 'test_jwt_secret_key'


def unique_email():
    return f"test_{uuid.uuid4().hex[:8]}@example.com"


class BaseTestCase(unittest.TestCase):

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
        with self.app.app_context():
            return create_access_token(
                identity='admin-test-id',
                additional_claims={'is_admin': True}
            )

    def get_user_token(self, user_id):
        with self.app.app_context():
            return create_access_token(
                identity=user_id,
                additional_claims={'is_admin': False}
            )

    def admin_headers(self):
        return {'Authorization': f'Bearer {self.get_admin_token()}'}

    def user_headers(self, user_id):
        return {'Authorization': f'Bearer {self.get_user_token(user_id)}'}

    def register_user(self, email=None, password='password123', **kwargs):
        """Crée un user via l'API (comme le vrai flow)."""
        data = {
            'first_name': 'Test',
            'last_name': 'User',
            'email': email or unique_email(),
            'password': password,
        }
        data.update(kwargs)
        return self.client.post(
            '/api/v1/users/',
            json=data,
            headers=self.admin_headers()
        )

    def login(self, email, password):
        """Appelle le vrai endpoint de login."""
        return self.client.post(
            '/api/v1/auth/login',
            json={'email': email, 'password': password}
        )

    def create_place(self, owner_id, **kwargs):
        data = {
            'title': 'Test Place',
            'description': 'Nice place',
            'price': 100.0,
            'latitude': 48.8566,
            'longitude': 2.3522,
            'owner_id': owner_id,
        }
        data.update(kwargs)
        return self.client.post(
            '/api/v1/places/',
            json=data,
            headers=self.user_headers(owner_id)
        )


# ============================================================
# TESTS LOGIN — endpoint jamais testé dans test_endpoints.py
# ============================================================

class TestAuthLogin(BaseTestCase):
    """
    Ces tests ciblent POST /api/v1/auth/login.
    Ils révèlent le bug filter_by(_email=email) dans UserRepository :
    get_user_by_email() retourne None car SQLAlchemy cherche la colonne
    '_email' qui n'existe pas — la vraie colonne SQL s'appelle 'email'.
    """

    def test_01_login_valid_credentials(self):
        """
        Login avec email + password corrects → 200 + access_token.

        BUG ATTENDU : retourne 401 car get_user_by_email() retourne None
        à cause de filter_by(_email=email) au lieu de filter_by(email=email).
        """
        email = unique_email()
        self.register_user(email=email, password='mypassword')

        response = self.login(email, 'mypassword')

        self.assertEqual(
            response.status_code, 200,
            "Le login avec des credentials valides doit retourner 200. "
            "Si tu obtiens 401, c'est le bug filter_by(_email=email) dans UserRepository."
        )
        data = response.get_json()
        self.assertIn('access_token', data, "La réponse doit contenir un access_token.")

    def test_02_login_wrong_password(self):
        """Login avec mauvais password → 401."""
        email = unique_email()
        self.register_user(email=email, password='goodpassword')

        response = self.login(email, 'wrongpassword')

        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.get_json())

    def test_03_login_unknown_email(self):
        """Login avec email inexistant → 401."""
        response = self.login('nobody@nowhere.com', 'password')
        self.assertEqual(response.status_code, 401)

    def test_04_login_empty_email(self):
        """Login sans email → 400 (validation flask-restx)."""
        response = self.client.post('/api/v1/auth/login', json={
            'email': '',
            'password': 'password'
        })
        self.assertIn(response.status_code, [400, 401])

    def test_05_login_empty_password(self):
        """Login sans password → 400 ou 401."""
        email = unique_email()
        self.register_user(email=email)
        response = self.client.post('/api/v1/auth/login', json={
            'email': email,
            'password': ''
        })
        self.assertIn(response.status_code, [400, 401])

    def test_06_login_missing_fields(self):
        """Login sans body → 400."""
        response = self.client.post(
            '/api/v1/auth/login',
            json={},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_07_login_returns_usable_token(self):
        """
        Le token retourné par le login doit permettre d'accéder
        à un endpoint protégé.

        Ce test ne peut passer que si test_01 passe (login fonctionnel).
        """
        email = unique_email()
        user_resp = self.register_user(email=email, password='tokentest')
        user_id = user_resp.get_json()['id']

        login_resp = self.login(email, 'tokentest')
        if login_resp.status_code != 200:
            self.skipTest("Login non fonctionnel (bug filter_by), test ignoré.")

        token = login_resp.get_json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        # Utilise le token pour modifier son propre profil
        update_resp = self.client.put(
            f'/api/v1/users/{user_id}',
            json={'first_name': 'Updated'},
            headers=headers
        )
        self.assertEqual(update_resp.status_code, 200)

    def test_08_login_case_sensitive_email(self):
        """Email avec casse différente → 401 (emails sont case-sensitive)."""
        email = unique_email()
        self.register_user(email=email)
        response = self.login(email.upper(), 'password123')
        self.assertEqual(response.status_code, 401)


# ============================================================
# TESTS HACHAGE PASSWORD — bug double hachage
# ============================================================

class TestPasswordHashing(BaseTestCase):
    """
    Ces tests vérifient que le password est haché exactement une fois
    et que verify_password fonctionne après création ET après update.

    BUG CIBLÉ : le setter de password hache automatiquement, ET
    hash_password() hache aussi → si les deux sont appelés, le hash
    est haché deux fois → verify_password retourne toujours False.
    """

    def test_01_password_hashed_once_at_creation(self):
        """
        Après création via l'API, le login doit fonctionner.
        Prouve que le password n'est haché qu'une seule fois.
        """
        email = unique_email()
        self.register_user(email=email, password='simplepwd')

        response = self.login(email, 'simplepwd')
        self.assertEqual(
            response.status_code, 200,
            "verify_password échoue → le password a probablement été haché deux fois."
        )

    def test_02_password_verify_directly_on_model(self):
        """
        Vérifie verify_password() directement sur l'objet User
        sans passer par l'API de login.
        """
        from app.services import facade

        email = unique_email()
        self.register_user(email=email, password='directcheck')

        with self.app.app_context():
            user = facade.get_user_by_email(email)
            if user is None:
                self.skipTest(
                    "get_user_by_email() retourne None (bug filter_by). "
                    "Corrige d'abord UserRepository."
                )
            self.assertTrue(
                user.verify_password('directcheck'),
                "verify_password doit retourner True avec le bon password. "
                "Si False → double hachage au moment de la création."
            )
            self.assertFalse(
                user.verify_password('wrongpwd'),
                "verify_password doit retourner False avec un mauvais password."
            )

    def test_03_login_after_admin_password_update(self):
        """
        Après qu'un admin change le password d'un user,
        le user doit pouvoir se connecter avec le nouveau password.

        BUG CIBLÉ : si update_user appelle hash_password() sur un password
        déjà haché par le setter, le nouveau login échouera.
        """
        email = unique_email()
        user_id = self.register_user(
            email=email, password='oldpassword'
        ).get_json()['id']

        # Admin change le password
        self.client.put(
            f'/api/v1/users/{user_id}',
            json={
                'first_name': 'Test',
                'last_name': 'User',
                'email': email,
                'password': 'newpassword'
            },
            headers=self.admin_headers()
        )

        # Login avec l'ancien password → doit échouer
        old_resp = self.login(email, 'oldpassword')
        self.assertEqual(
            old_resp.status_code, 401,
            "L'ancien password ne doit plus fonctionner après update."
        )

        # Login avec le nouveau password → doit réussir
        new_resp = self.login(email, 'newpassword')
        self.assertEqual(
            new_resp.status_code, 200,
            "Le nouveau password doit fonctionner après update admin. "
            "Si 401 → le password a été doublement haché lors de l'update."
        )

    def test_04_hash_password_method_idempotent(self):
        """
        Appeler hash_password() puis verify_password() doit fonctionner.
        Vérifie que hash_password() ne double-hache pas.
        """
        from app.models.user import User
        from app import bcrypt

        with self.app.app_context():
            user = User(
                first_name='Test',
                last_name='Hash',
                email=unique_email(),
                password='initial'
            )
            # Réinitialise avec hash_password explicite
            user.hash_password('myplainpassword')

            self.assertTrue(
                user.verify_password('myplainpassword'),
                "verify_password doit retourner True après hash_password(). "
                "Si False → double hachage dans hash_password() ou le setter."
            )

    def test_05_password_not_stored_in_plaintext(self):
        """Le password stocké ne doit pas être en clair."""
        from app.services import facade

        email = unique_email()
        self.register_user(email=email, password='plaintext123')

        with self.app.app_context():
            user = facade.get_user_by_email(email)
            if user is None:
                self.skipTest("get_user_by_email() retourne None (bug filter_by).")

            self.assertNotEqual(
                user._password, 'plaintext123',
                "Le password ne doit jamais être stocké en clair."
            )
            self.assertTrue(
                user._password.startswith('$2b$'),
                "Le password doit être un hash bcrypt (commence par $2b$)."
            )


# ============================================================
# TESTS get_user_by_email — bug filter_by
# ============================================================

class TestUserRepository(BaseTestCase):
    """
    Teste get_user_by_email() directement via la façade.
    Révèle le bug filter_by(_email=email) dans UserRepository.
    """

    def test_01_get_user_by_email_existing(self):
        """
        get_user_by_email() doit retourner le user avec l'email donné.

        BUG ATTENDU : retourne None car SQLAlchemy fait
        SELECT ... WHERE _email = ? et la colonne SQL s'appelle 'email'.
        """
        from app.services import facade

        email = unique_email()
        self.register_user(email=email)

        with self.app.app_context():
            user = facade.get_user_by_email(email)
            self.assertIsNotNone(
                user,
                f"get_user_by_email('{email}') retourne None. "
                "Bug dans UserRepository : filter_by(_email=email) "
                "doit être filter_by(email=email)."
            )
            self.assertEqual(user.email, email)

    def test_02_get_user_by_email_nonexistent(self):
        """get_user_by_email() avec email inexistant → None."""
        from app.services import facade

        with self.app.app_context():
            user = facade.get_user_by_email('nobody@example.com')
            self.assertIsNone(user)

    def test_03_get_user_by_email_after_update(self):
        """
        Après update de l'email par un admin,
        get_user_by_email() doit trouver le user avec le nouvel email.
        """
        from app.services import facade

        old_email = unique_email()
        new_email = unique_email()
        user_id = self.register_user(email=old_email).get_json()['id']

        self.client.put(
            f'/api/v1/users/{user_id}',
            json={
                'first_name': 'Test',
                'last_name': 'User',
                'email': new_email,
                'password': 'password123'
            },
            headers=self.admin_headers()
        )

        with self.app.app_context():
            old = facade.get_user_by_email(old_email)
            new = facade.get_user_by_email(new_email)

            self.assertIsNone(old, "L'ancien email ne doit plus trouver le user.")
            if new is None:
                self.skipTest("get_user_by_email retourne None (bug filter_by).")
            self.assertEqual(new.id, user_id)

    def test_04_duplicate_email_rejected_at_db_level(self):
        """
        Créer deux users avec le même email → 400.
        Vérifie la contrainte UNIQUE sur la colonne email.
        """
        email = unique_email()
        r1 = self.register_user(email=email)
        r2 = self.register_user(email=email)

        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r2.status_code, 400)


# ============================================================
# TESTS FLUX COMPLET — de l'inscription au login à l'action
# ============================================================

class TestFullAuthFlow(BaseTestCase):
    """
    Tests de bout en bout : inscription → login → action protégée.
    Ces tests ne bypasse PAS le login avec create_access_token.
    Ils simulent le vrai comportement d'un client.
    """

    def test_01_register_login_create_place(self):
        """
        Flux complet :
        1. Admin crée un user
        2. User se connecte (vrai login)
        3. User crée un place avec son token
        """
        email = unique_email()
        self.register_user(email=email, password='mypass')

        login_resp = self.login(email, 'mypass')
        if login_resp.status_code != 200:
            self.skipTest(
                "Login échoue (bug filter_by ou double hachage). "
                "Corrige ces bugs avant de lancer ce test."
            )

        token = login_resp.get_json()['access_token']
        user_id = login_resp.get_json().get('user_id')

        # On récupère l'user_id depuis la liste des users
        users = self.client.get('/api/v1/users/').get_json()
        found = next((u for u in users if u['email'] == email), None)
        self.assertIsNotNone(found)
        uid = found['id']

        headers = {'Authorization': f'Bearer {token}'}
        place_resp = self.client.post('/api/v1/places/', json={
            'title': 'My Place',
            'description': 'Nice',
            'price': 80.0,
            'latitude': 45.0,
            'longitude': 5.0,
            'owner_id': uid,
        }, headers=headers)

        self.assertEqual(place_resp.status_code, 201)

    def test_02_register_login_post_review(self):
        """
        Flux complet :
        1. Admin crée owner + reviewer
        2. Owner crée un place via vrai login
        3. Reviewer poste une review via vrai login
        """
        owner_email = unique_email()
        reviewer_email = unique_email()

        self.register_user(email=owner_email, password='ownerpass')
        self.register_user(email=reviewer_email, password='reviewpass')

        owner_login = self.login(owner_email, 'ownerpass')
        reviewer_login = self.login(reviewer_email, 'reviewpass')

        if owner_login.status_code != 200 or reviewer_login.status_code != 200:
            self.skipTest("Login non fonctionnel, test ignoré.")

        owner_token = owner_login.get_json()['access_token']
        reviewer_token = reviewer_login.get_json()['access_token']

        users = self.client.get('/api/v1/users/').get_json()
        owner_id = next(u['id'] for u in users if u['email'] == owner_email)
        reviewer_id = next(u['id'] for u in users if u['email'] == reviewer_email)

        place_resp = self.client.post('/api/v1/places/', json={
            'title': 'Owner Place',
            'description': 'Desc',
            'price': 120.0,
            'latitude': 48.0,
            'longitude': 2.0,
            'owner_id': owner_id,
        }, headers={'Authorization': f'Bearer {owner_token}'})
        self.assertEqual(place_resp.status_code, 201)
        place_id = place_resp.get_json()['id']

        review_resp = self.client.post('/api/v1/reviews/', json={
            'text': 'Amazing place!',
            'rating': 5,
            'user_id': reviewer_id,
            'place_id': place_id,
        }, headers={'Authorization': f'Bearer {reviewer_token}'})
        self.assertEqual(review_resp.status_code, 201)

    def test_03_invalid_token_rejected(self):
        """Un token forgé doit être rejeté par les endpoints protégés."""
        fake_headers = {'Authorization': 'Bearer this.is.not.a.valid.token'}
        response = self.client.post('/api/v1/places/', json={
            'title': 'X', 'price': 10.0,
            'latitude': 0.0, 'longitude': 0.0,
            'owner_id': 'fake-id'
        }, headers=fake_headers)
        self.assertEqual(response.status_code, 422)

    def test_04_no_token_rejected(self):
        """Sans token → 401 sur les endpoints protégés."""
        response = self.client.post('/api/v1/places/', json={
            'title': 'X', 'price': 10.0,
            'latitude': 0.0, 'longitude': 0.0,
            'owner_id': 'fake-id'
        })
        self.assertEqual(response.status_code, 401)

    def test_05_public_endpoints_no_token_needed(self):
        """GET /places/ et GET /places/<id> accessibles sans token."""
        resp_list = self.client.get('/api/v1/places/')
        self.assertEqual(resp_list.status_code, 200)

        # Crée un place pour tester GET par ID
        owner_id = self.register_user().get_json()['id']
        place_id = self.create_place(owner_id).get_json()['id']

        resp_detail = self.client.get(f'/api/v1/places/{place_id}')
        self.assertEqual(resp_detail.status_code, 200)


# ============================================================
# TESTS EDGE CASES REVIEWS — non couverts
# ============================================================

class TestReviewEdgeCases(BaseTestCase):
    """
    Cas limites reviews non testés dans test_endpoints.py.
    """

    def setUp(self):
        super().setUp()
        self.owner_id = self.register_user().get_json()['id']
        self.reviewer_id = self.register_user().get_json()['id']
        self.place_id = self.create_place(self.owner_id).get_json()['id']

    def user_headers(self, user_id):
        return {'Authorization': f'Bearer {self.get_user_token(user_id)}'}

    def test_01_owner_cannot_review_own_place(self):
        """Le propriétaire ne peut pas noter son propre place → 400."""
        response = self.client.post('/api/v1/reviews/', json={
            'text': 'My own place is great',
            'rating': 5,
            'user_id': self.owner_id,
            'place_id': self.place_id,
        }, headers=self.user_headers(self.owner_id))
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.get_json())

    def test_02_duplicate_review_rejected(self):
        """Un user ne peut poster qu'une review par place → 2e tentative = 400."""
        payload = {
            'text': 'First review',
            'rating': 4,
            'user_id': self.reviewer_id,
            'place_id': self.place_id,
        }
        r1 = self.client.post(
            '/api/v1/reviews/', json=payload,
            headers=self.user_headers(self.reviewer_id)
        )
        self.assertEqual(r1.status_code, 201)

        r2 = self.client.post(
            '/api/v1/reviews/', json=payload,
            headers=self.user_headers(self.reviewer_id)
        )
        self.assertEqual(r2.status_code, 400)
        self.assertIn('already reviewed', r2.get_json().get('error', ''))

    def test_03_review_rating_boundary_1(self):
        """Rating = 1 (minimum) → 201."""
        response = self.client.post('/api/v1/reviews/', json={
            'text': 'Very bad but valid',
            'rating': 1,
            'user_id': self.reviewer_id,
            'place_id': self.place_id,
        }, headers=self.user_headers(self.reviewer_id))
        self.assertEqual(response.status_code, 201)

    def test_04_review_rating_boundary_5(self):
        """Rating = 5 (maximum) → 201."""
        response = self.client.post('/api/v1/reviews/', json={
            'text': 'Perfect',
            'rating': 5,
            'user_id': self.reviewer_id,
            'place_id': self.place_id,
        }, headers=self.user_headers(self.reviewer_id))
        self.assertEqual(response.status_code, 201)

    def test_05_different_users_can_review_same_place(self):
        """Deux users différents peuvent chacun poster une review sur le même place."""
        third_user_id = self.register_user().get_json()['id']

        r1 = self.client.post('/api/v1/reviews/', json={
            'text': 'User 1 review',
            'rating': 3,
            'user_id': self.reviewer_id,
            'place_id': self.place_id,
        }, headers=self.user_headers(self.reviewer_id))

        r2 = self.client.post('/api/v1/reviews/', json={
            'text': 'User 2 review',
            'rating': 4,
            'user_id': third_user_id,
            'place_id': self.place_id,
        }, headers=self.user_headers(third_user_id))

        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r2.status_code, 201)

    def test_06_deleted_review_cannot_be_updated(self):
        """Après suppression d'une review, PUT → 404."""
        r = self.client.post('/api/v1/reviews/', json={
            'text': 'To be deleted',
            'rating': 2,
            'user_id': self.reviewer_id,
            'place_id': self.place_id,
        }, headers=self.user_headers(self.reviewer_id))
        review_id = r.get_json()['id']

        self.client.delete(
            f'/api/v1/reviews/{review_id}',
            headers=self.user_headers(self.reviewer_id)
        )

        update_resp = self.client.put(
            f'/api/v1/reviews/{review_id}',
            json={'text': 'Ghost update', 'rating': 5},
            headers=self.user_headers(self.reviewer_id)
        )
        self.assertEqual(update_resp.status_code, 404)


if __name__ == '__main__':
    unittest.main(verbosity=2)