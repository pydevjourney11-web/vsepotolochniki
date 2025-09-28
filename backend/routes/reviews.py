from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Review, Company, User
import json

reviews_bp = Blueprint('reviews', __name__)

@reviews_bp.route('/', methods=['POST'])
@jwt_required()
def create_review():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or not data.get('company_id') or not data.get('rating'):
        return jsonify({'error': 'Company ID and rating are required'}), 400
    
    company_id = data['company_id']
    rating = data['rating']
    
    # Проверяем, что компания существует
    company = Company.query.get_or_404(company_id)
    
    # Проверяем, что пользователь не оставлял отзыв на эту компанию
    existing_review = Review.query.filter_by(company_id=company_id, user_id=int(user_id)).first()
    if existing_review:
        return jsonify({'error': 'You have already reviewed this company'}), 400
    
    # Создаем отзыв
    review = Review(
        company_id=company_id,
        user_id=int(user_id),
        rating=rating,
        text=data.get('text'),
        photos=json.dumps(data.get('photos', [])),
        status='approved'  # Автоматически одобряем отзывы
    )
    
    db.session.add(review)
    
    # Пересчитываем рейтинг компании
    all_reviews = Review.query.filter_by(company_id=company_id, status='approved').all()
    if all_reviews:
        total_rating = sum(r.rating for r in all_reviews)
        company.rating = total_rating / len(all_reviews)
        company.review_count = len(all_reviews)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Review created successfully',
        'review': review.to_dict()
    }), 201

@reviews_bp.route('/<int:review_id>', methods=['GET'])
@jwt_required()
def get_review(review_id):
    user_id = get_jwt_identity()
    review = Review.query.get_or_404(review_id)
    
    # Проверяем права доступа
    if review.user_id != int(user_id):
        return jsonify({'error': 'Access denied'}), 403
    
    return jsonify({
        'review': {
            **review.to_dict(),
            'company': {
                'id': review.company.id,
                'name': review.company.name,
                'category': review.company.category
            }
        }
    })

@reviews_bp.route('/<int:review_id>', methods=['PUT'])
@jwt_required()
def update_review(review_id):
    user_id = get_jwt_identity()
    review = Review.query.get_or_404(review_id)
    
    # Проверяем права доступа
    if review.user_id != int(user_id):
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    if 'rating' in data:
        review.rating = data['rating']
    if 'text' in data:
        review.text = data['text']
    if 'photos' in data:
        review.photos = json.dumps(data['photos'])
    
    db.session.commit()
    
    # Пересчитываем рейтинг компании
    company = Company.query.get(review.company_id)
    all_reviews = Review.query.filter_by(company_id=company.id, status='approved').all()
    if all_reviews:
        total_rating = sum(r.rating for r in all_reviews)
        company.rating = total_rating / len(all_reviews)
        company.review_count = len(all_reviews)
        db.session.commit()
    
    return jsonify({
        'message': 'Review updated successfully',
        'review': review.to_dict()
    })

@reviews_bp.route('/<int:review_id>', methods=['DELETE'])
@jwt_required()
def delete_review(review_id):
    user_id = get_jwt_identity()
    review = Review.query.get_or_404(review_id)
    
    # Проверяем права доступа
    if review.user_id != int(user_id):
        return jsonify({'error': 'Access denied'}), 403
    
    company_id = review.company_id
    db.session.delete(review)
    
    # Пересчитываем рейтинг компании
    company = Company.query.get(company_id)
    all_reviews = Review.query.filter_by(company_id=company_id, status='approved').all()
    if all_reviews:
        total_rating = sum(r.rating for r in all_reviews)
        company.rating = total_rating / len(all_reviews)
        company.review_count = len(all_reviews)
    else:
        company.rating = 0.0
        company.review_count = 0
    
    db.session.commit()
    
    return jsonify({'message': 'Review deleted successfully'})

@reviews_bp.route('/company/<int:company_id>', methods=['GET'])
def get_company_reviews(company_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    reviews = Review.query.filter_by(company_id=company_id, status='approved').order_by(Review.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'reviews': [review.to_dict() for review in reviews.items],
        'total': reviews.total,
        'pages': reviews.pages,
        'current_page': page
    })

@reviews_bp.route('/user', methods=['GET'])
@jwt_required()
def get_user_reviews():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    reviews = Review.query.filter_by(user_id=int(user_id)).order_by(Review.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'reviews': [{
            **review.to_dict(),
            'company': {
                'id': review.company.id,
                'name': review.company.name,
                'category': review.company.category
            }
        } for review in reviews.items],
        'total': reviews.total,
        'pages': reviews.pages,
        'current_page': page
    })
