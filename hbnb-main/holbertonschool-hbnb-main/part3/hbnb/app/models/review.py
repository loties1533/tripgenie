#!/usr/bin/python3
"""
Review - HBnB review model
Fields: text, rating(1-5), place(Place), user(User)
Relationships: belongs_to Place+User (auto-add via place.add_review)
Methods: update_rating
"""
from app import db
from .basemodel import BaseModel

class Review(BaseModel):
    """
    Represents a review in the HBnB system.

    Attributes:
        text (str): The content of the review.
        rating (int): Rating given to the place (1-5).
        place (Place): The place being reviewed.
        user (User): The user who wrote the review.
    """
    __tablename__ = 'reviews'

    _text = db.Column('text', db.String(1024), nullable=False)
    _rating = db.Column('rating', db.Integer, nullable=False)
    _place_id = db.Column('place_id', db.String(36), db.ForeignKey('places.id'), nullable=False)
    _user_id = db.Column('user_id', db.String(36), db.ForeignKey('users.id'), nullable=False)

    def __init__(self, text, rating, place_id, user_id, **kwargs):
        super().__init__(**kwargs)
        self.text = text
        self.rating = rating
        self.place_id = place_id
        self.user_id = user_id

    @property
    def text(self):
        return self._text

    @text.setter
    def text(self, value):
        if not value:
            raise ValueError("Review text required.")
        self._text = value

    @property
    def rating(self):
        return self._rating

    @rating.setter
    def rating(self, value):
        if not isinstance(value, int) or  not (1 <= value <= 5):
            raise ValueError("Rating must be an integer between 1 and 5.")
        self._rating = value

    @property
    def place_id(self):
        return self._place_id

    @place_id.setter
    def place_id(self, value):
        if not isinstance(value, str):
            raise ValueError("Invalid place_id.")
        self._place_id = value

    @property
    def user_id(self):
        return self._user_id

    @user_id.setter
    def user_id(self, value):
        if not isinstance(value, str):
            raise ValueError("Invalid user_id.")
        self._user_id = value

