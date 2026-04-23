#!/usr/bin/python3
"""
BaseModel - HBnB base class for all models
Fields: id(UUID), created_at, updated_at
Methods: save/delete/get/get_all/update/to_dict (repo integration)
"""
import uuid
from datetime import datetime


class BaseModel:
    def __init__(self, **kwargs):
        self.id = str(uuid.uuid4())
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)

    
    def save(self):
        self.updated_at = datetime.now()

    def update(self, data):
        for key, value in data.items():
            if hasattr(self, key) and key not in ['id', 'created_at', 'updated_at']:
                setattr(self, key, value)
        self.save()

    def to_dict(self):
        result = {}
        for attr, value in self.__dict__.items():
            if isinstance(value, datetime):
                result[attr] = value.isoformat()
            else:
                result[attr] = value
        return result
