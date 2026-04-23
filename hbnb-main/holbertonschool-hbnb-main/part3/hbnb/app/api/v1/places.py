#!/usr/bin/python3
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services import facade

api = Namespace('places', description='Places operations')

amenity_model = api.model('PlaceAmenity', {
    'id': fields.String(description='Amenity ID'),
    'name': fields.String(description='Name of the amenity')
})

user_model = api.model('PlaceUser', {
    'id': fields.String(description='User ID'),
    'first_name': fields.String(description='First name of the owner'),
    'last_name': fields.String(description='Last name of the owner'),
    'email': fields.String(description='Email of the owner')
})

review_model = api.model('PlaceReview', {
    'id': fields.String(description='Review ID'),
    'text': fields.String(description='Text of the review'),
    'rating': fields.Integer(description='Rating of the place (1-5)'),
    'user_id': fields.String(description='ID of the user')
})

place_model = api.model('Place', {
    'title': fields.String(required=True, description='Title of the place'),
    'description': fields.String(description='Description of the place'),
    'price': fields.Float(required=True, description='Price per night'),
    'latitude': fields.Float(required=True, description='Latitude of the place'),
    'longitude': fields.Float(required=True, description='Longitude of the place'),
    'owner_id': fields.String(required=True, description='ID of the owner')
})

@api.route('/')
class PlaceList(Resource):
    @api.expect(place_model, validate=True)
    @api.response(201, 'Place successfully created')
    @api.response(400, 'Invalid input data')
    @jwt_required()
    def post(self):
        """Register a new place"""
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        place_data = api.payload.copy()

        requested_owner_id = place_data.get('owner_id')
        if not claims.get('is_admin') and requested_owner_id != current_user_id:
            return {'error': 'Invalid input data'}, 400

        place_data['owner_id'] = current_user_id

        try:
            new_place = facade.create_place(place_data)
            return {
                'id': new_place.id,
                'title': new_place.title,
                'description': new_place.description,
                'price': new_place.price,
                'latitude': new_place.latitude,
                'longitude': new_place.longitude,
                'owner_id': new_place.owner_id,
            }, 201
        except ValueError as e:
            return {'error': str(e)}, 400

    @api.response(200, 'List of places retrieved successfully')
    def get(self):
        """Retrieve a list of all places"""
        places = facade.get_all_places()
        return [{
            'id': p.id,
            'title': p.title,
            'latitude': p.latitude,
            'longitude': p.longitude,
            'price': p.price
        } for p in places], 200


@api.route('/<place_id>')
class PlaceResource(Resource):
    @api.response(200, 'Place details retrieved successfully')
    @api.response(404, 'Place not found')
    def get(self, place_id):
        """Get place details by ID"""
        place = facade.get_place(place_id)
        if not place:
            return {'error': 'Place not found'}, 404

        owner = facade.get_user(place.owner_id)

        return {
            'id': place.id,
            'title': place.title,
            'description': place.description,
            'latitude': place.latitude,
            'longitude': place.longitude,
            'price': place.price,
            'owner': {
                'id': owner.id,
                'first_name': owner.first_name,
                'last_name': owner.last_name,
                'email': owner.email,
            } if owner else None,
            'amenities': [{'id': a.id, 'name': a.name} for a in place.amenities],
        }, 200

    @api.expect(place_model)
    @api.response(200, 'Place updated successfully')
    @api.response(404, 'Place not found')
    @api.response(400, 'Invalid input data')
    @jwt_required()
    def put(self, place_id):
        """Update a place's information"""
        current_user_id = get_jwt_identity()
        claims = get_jwt()

        place = facade.get_place(place_id)
        if not place:
            return {'error': 'Place not found'}, 404

        if place.owner_id != current_user_id and not claims.get('is_admin'):
            return {'error': 'Unauthorized action'}, 403

        try:
            updated_place = facade.update_place(place_id, api.payload)
            if not updated_place:
                return {'error': 'Place not found'}, 404
            return {'message': 'Place updated successfully'}, 200
        except ValueError as e:
            return {'error': str(e)}, 400


@api.route('/<place_id>/reviews')
class PlaceReviewList(Resource):
    @api.response(200, 'List of reviews for the place retrieved successfully')
    @api.response(404, 'Place not found')
    def get(self, place_id):
        """Get all reviews for a specific place"""
        place = facade.get_place(place_id)
        if not place:
            return {'error': 'Place not found'}, 404

        reviews = facade.get_reviews_by_place(place_id)
        
        # C'est ici qu'on ajoute les noms !
        results = []
        for r in reviews:
            user = facade.get_user(r.user_id)
            results.append({
                'id': r.id,
                'text': r.text,
                'rating': r.rating,
                'user': {
                    'first_name': user.first_name if user else "Unknown",
                    'last_name': user.last_name if user else "User"
                }
            })
        return results, 200

@api.route('/<place_id>/amenities/<amenity_id>')
class PlaceAmenityResource(Resource):
    @jwt_required()
    def post(self, place_id, amenity_id):
        try:
            facade.add_amenity_to_place(place_id, amenity_id)
            return {'message': 'Amenity linked'}, 200
        except Exception as e:
            return {'error': str(e)}, 400