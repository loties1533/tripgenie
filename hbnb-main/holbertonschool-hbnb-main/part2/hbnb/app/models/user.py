#!/usr/bin/python3
"""
User - HBnB user model
Fields: first_name(max 50), last_name(max 50), email, is_admin(bool)
Relationships: owner of Places (1:N)
"""
import re
from .basemodel import BaseModel

class User(BaseModel):
    """
    Represents a user in the HBnB system.

    Attributes:
        first_name (str): The user's first name (max 50 chars).
        last_name (str): The user's last name (max 50 chars).
        email (str): Unique email address.
        is_admin (bool): Administrative status of the user.
    """

    def __init__(self, first_name, last_name, email, is_admin=False, **kwargs):
        """
        Initializes a new User instance.

        Args:
            first_name (str): First name of the user.
            last_name (str): Last name of the user.
            email (str): Email address of the user.
            is_admin (bool): Whether the user has admin privileges.
            **kwargs: Additional base model attributes (id, dates).
        """

        self._first_name = None
        self._last_name = None
        self._email = None

        super().__init__(**kwargs)

        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.is_admin = is_admin

    @property
    def first_name(self):
        return self._first_name
    
    @first_name.setter
    def first_name(self, value):
        if not value or len(value) > 50:
            raise ValueError("First name required (maximum 50 characters).")
        self._first_name = value

    @property
    def last_name(self):
        return self._last_name
    
    @last_name.setter
    def last_name(self, value):
        if not value or len(value) > 50:
            raise ValueError("Last name required (maximum 50 characters).")
        self._last_name = value
        
    @property
    def email(self):
        return self._email
    
    @email.setter
    def email(self, value):
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not value or not re.match(email_regex, value):
            raise ValueError("Invalid email format.")
        self._email = value

    @property
    def is_admin(self):
        return self._is_admin

    @is_admin.setter
    def is_admin(self, value):
        if not isinstance(value, bool):
            raise ValueError("is_admin must be a boolean.")
        self._is_admin = value
