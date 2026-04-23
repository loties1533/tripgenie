#!/usr/bin/python3
"""
Amenity - HBnB amenity model (Wi-Fi, Parking, etc.)
Fields: name(max 50)
Relationships: many-to-many with Place (Place.add_amenity)
"""
from .basemodel import BaseModel

class Amenity(BaseModel):
    """
    Represents an amenity in the HBnB system.

    Attributes:
        name (str): The name of the amenity (max 50 chars).
    """

    def __init__(self, name, **kwargs):
        """
        Initializes a new Amenity instance.

        Args:
            name (str): Name of the amenity.
            **kwargs: Additional base model attributes (id, dates).
        """

        self._name = None

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
