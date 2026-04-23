#!/usr/bin/python3
"""
Review - HBnB review model
Fields: text, rating(1-5), place(Place), user(User)
Relationships: belongs_to Place+User (auto-add via place.add_review)
Methods: update_rating
"""
from .basemodel import BaseModel
from .place import Place
from .user import User

class Review(BaseModel):
    """
    Represents a review in the HBnB system.

    Attributes:
        text (str): The content of the review.
        rating (int): Rating given to the place (1-5).
        place (Place): The place being reviewed.
        user (User): The user who wrote the review.
    """

    def __init__(self, text, rating, place, user, **kwargs):
        """
        Initializes a new Review instance.

        Args:
            text (str): Content of the review.
            rating (int): Rating from 1 to 5.
            place (Place): Place instance associated with the review.
            user (User): User instance who authored the review.
            **kwargs: Additional base model attributes.
        """

        self._text = None
        self._rating = None
        self._place = None
        self._user = None

        super().__init__(**kwargs)

        self.text = text
        self.rating = rating
        self.place = place
        self.user = user

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
    def place(self):
        return self._place

    @place.setter
    def place(self, value):
        if not isinstance(value, Place):
            raise ValueError("Invalid place instance.")
        self._place = value

    @property
    def user(self):
        return self._user

    @user.setter
    def user(self, value):
        if not isinstance(value, User):
            raise ValueError("Invalid user instance.")
        self._user = value
