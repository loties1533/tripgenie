#!/usr/bin/python3
"""
Place - HBnB place model
Fields: title(max 100), description, price, lat/lng, owner(User)
Relationships: reviews(1:N), amenities(N:N)
Methods: add/remove amenity/review
"""
from .basemodel import BaseModel
from .user import User

class Place(BaseModel):
    def __init__(self, title, price, longitude, latitude, owner, description="", **kwargs):
        self._title = None
        self._price = 0.0
        self._latitude = 0.0
        self._longitude = 0.0
        self._owner = None

        super().__init__(**kwargs)

        self.title = title
        self.description = description
        self.price = float(price)
        self.longitude = float(longitude)
        self.latitude = float(latitude)
        self.owner = owner
        self.amenities = []
        self.reviews = []

    @property
    def title(self):
        return self._title

    @title.setter
    def title(self, value):
        if not value or len(value) > 100:
            raise ValueError("Title required (maximum 100 characters).")
        self._title = value

    @property
    def price(self):
        return self._price

    @price.setter
    def price(self, value):
        if not isinstance(value, (float, int)):
            raise ValueError("Price must be an integer or of a float.")
        if value <= 0:
            raise ValueError("Price must be positive.")
        self._price = float(value)

    @property
    def latitude(self):
        return self._latitude

    @latitude.setter
    def latitude(self, value):
        if not isinstance(value, (float, int)):
            raise ValueError("Latitude must be an integer or a float.")
        if not -90 <= value <= 90:
            raise ValueError("latitude -90 to 90")
        self._latitude = float(value)

    @property
    def longitude(self):
        return self._longitude

    @longitude.setter
    def longitude(self, value):
        if not isinstance(value, (float, int)):
            raise ValueError("Longitude must be an integer or a float.")
        if not -180 <= value <= 180:
            raise ValueError("longitude -180 to 180")
        self._longitude = float(value)

    @property
    def owner(self):
        return self._owner

    @owner.setter
    def owner(self, value):
        if not isinstance(value, User):
            raise ValueError("owner must be User instance")
        self._owner = value

    def add_amenity(self, amenity):
        if amenity not in self.amenities:
            self.amenities.append(amenity)
            self.save()

    def remove_amenity(self, amenity):
        if amenity in self.amenities:
            self.amenities.remove(amenity)
            self.save()

    def add_review(self, review):
        if review not in self.reviews:
            self.reviews.append(review)
            self.save()
