#!/usr/bin/python3
"""
User - HBnB user model
Fields: first_name(max 50), last_name(max 50), email, is_admin(bool)
Relationships: owner of Places (1:N)
"""
from app import db, bcrypt
import re
from .basemodel import BaseModel

class User(BaseModel):
    """
    Represents a user in the HBnB system, mapped to a database table.
    """
    __tablename__ = 'users'

    _first_name = db.Column('first_name', db.String(50), nullable=False)
    _last_name = db.Column('last_name', db.String(50), nullable=False)
    _email = db.Column('email', db.String(255), unique=True, nullable=False)
    _is_admin = db.Column('is_admin', db.Boolean, default=False, nullable=False)
    _password = db.Column('password', db.String(255), nullable=False)
    reviews = db.relationship('Review', backref='author', lazy=True)

    def __init__(self, first_name, last_name, email, password, is_admin=False, **kwargs):
        """
        Initializes a new User instance and hashes the password before storing it.
        """
        super().__init__(**kwargs)
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.is_admin = is_admin
        self.password = password

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
    def password(self):
        return self._password

    @password.setter
    def password(self, password):
        """
        On ne hache QUE si la chaîne ne ressemble pas déjà à un hash Bcrypt.
        Bcrypt commence toujours par $2b$ ou $2a$.
        """
        if password.startswith('$2b$') or password.startswith('$2a$'):
            self._password = password
        else:
            self._password = bcrypt.generate_password_hash(password).decode('utf-8')

    def verify_password(self, password):
        """Verifies if the provided password matches the hashed password."""
        from flask_bcrypt import check_password_hash
        return check_password_hash(self._password, password)

    @property
    def is_admin(self):
        return self._is_admin

    @is_admin.setter
    def is_admin(self, value):
        if not isinstance(value, bool):
            raise ValueError("is_admin must be a boolean.")
        self._is_admin = value