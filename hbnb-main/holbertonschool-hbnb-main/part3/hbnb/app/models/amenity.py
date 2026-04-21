#!/usr/bin/python3
"""
Amenity - HBnB amenity model (Wi-Fi, Parking, etc.)
"""
from app import db
from .basemodel import BaseModel

class Amenity(BaseModel):
    """
    Represents an amenity in the HBnB system, mapped to the database.
    """
    __tablename__ = 'amenities'

    _name = db.Column('name', db.String(50), nullable=False)

    def __init__(self, name, **kwargs):
        """
        Initializes a new Amenity instance.
        """
        super().__init__(**kwargs)
        self.name = name

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, value):
        if not value or len(value) > 50:
            raise ValueError("Amenity name required (max 50 characters).")
        self._name = value
