from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), default='user')  # user, admin
    avatar = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Связи
    companies = db.relationship('Company', backref='owner', lazy=True)
    reviews = db.relationship('Review', backref='author', lazy=True)
    articles = db.relationship('Article', backref='author', lazy=True)
    comments = db.relationship('Comment', backref='author', lazy=True)

class Company(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    city = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    address = db.Column(db.String(200))
    phone = db.Column(db.String(20))
    website = db.Column(db.String(200))
    description = db.Column(db.Text)
    logo = db.Column(db.String(200))
    rating = db.Column(db.Float, default=0.0)
    review_count = db.Column(db.Integer, default=0)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Связи
    reviews = db.relationship('Review', backref='company', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'city': self.city,
            'status': self.status,
            'address': self.address,
            'phone': self.phone,
            'website': self.website,
            'description': self.description,
            'logo': self.logo,
            'rating': self.rating,
            'review_count': self.review_count,
            'owner_id': self.owner_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'owner': {
                'id': self.owner.id,
                'name': self.owner.name,
                'email': self.owner.email
            } if self.owner else None
        }

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Может быть NULL для анонимных
    anonymous_name = db.Column(db.String(100))  # Имя для анонимных отзывов
    rating = db.Column(db.Integer, nullable=False)  # 1-5 звезд
    text = db.Column(db.Text)
    photos = db.Column(db.Text)  # JSON array of photo paths
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'rating': self.rating,
            'text': self.text,
            'photos': json.loads(self.photos) if self.photos else [],
            'created_at': self.created_at.isoformat(),
            'author': {
                'id': self.author.id if self.author else None,
                'name': self.author.name if self.author else self.anonymous_name,
                'avatar': self.author.avatar if self.author else None
            } if self.author else {
                'id': None,
                'name': self.anonymous_name or 'Анонимный пользователь',
                'avatar': None
            }
        }

class Article(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    excerpt = db.Column(db.Text)
    cover_image = db.Column(db.String(200))
    tags = db.Column(db.Text)  # JSON array
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Может быть None для анонимных
    anonymous_author = db.Column(db.String(100), nullable=True)  # Имя для анонимных авторов
    views = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Связи
    comments = db.relationship('Comment', backref='article', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'excerpt': self.excerpt,
            'cover_image': self.cover_image,
            'tags': json.loads(self.tags) if self.tags else [],
            'status': self.status,
            'views': self.views,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'author': {
                'id': self.author.id if self.author else None,
                'name': self.author.name if self.author else self.anonymous_author,
                'avatar': self.author.avatar if self.author else None
            } if self.author else {
                'id': None,
                'name': self.anonymous_author or 'Анонимный автор',
                'avatar': None
            }
        }

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('article.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Может быть None для анонимных
    anonymous_name = db.Column(db.String(100), nullable=True)  # Имя для анонимных комментариев
    text = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='approved')  # pending, approved, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        if self.user_id:
            # Авторизованный пользователь
            return {
                'id': self.id,
                'text': self.text,
                'created_at': self.created_at.isoformat(),
                'author': {
                    'id': self.author.id,
                    'name': self.author.name,
                    'avatar': self.author.avatar
                }
            }
        else:
            # Анонимный пользователь
            return {
                'id': self.id,
                'text': self.text,
                'created_at': self.created_at.isoformat(),
                'author': {
                    'id': None,
                    'name': self.anonymous_name or 'Анонимный пользователь',
                    'avatar': None
                }
            }
