from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Article, Comment, Review, User, Company
from sqlalchemy import inspect
from datetime import datetime

moderation_bp = Blueprint('moderation', __name__, url_prefix='/api/moderation')

# Проверка прав администратора
def require_admin():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'error': 'Недостаточно прав'}), 403
    return None

# Получение статей на модерации
@moderation_bp.route('/articles', methods=['GET'])
@jwt_required()
def get_pending_articles():
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status', 'pending')
    
    articles = Article.query.filter_by(status=status).order_by(Article.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'articles': [article.to_dict() for article in articles.items],
        'total': articles.total,
        'pages': articles.pages,
        'current_page': articles.page,
        'per_page': articles.per_page
    })

# Получение комментариев на модерации
@moderation_bp.route('/comments', methods=['GET'])
@jwt_required()
def get_pending_comments():
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status', 'pending')
    
    comments = Comment.query.filter_by(status=status).order_by(Comment.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'comments': [comment.to_dict() for comment in comments.items],
        'total': comments.total,
        'pages': comments.pages,
        'current_page': comments.page,
        'per_page': comments.per_page
    })

# Получение отзывов на модерации
@moderation_bp.route('/reviews', methods=['GET'])
@jwt_required()
def get_pending_reviews():
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status', 'pending')
    
    reviews = Review.query.filter_by(status=status).order_by(Review.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'reviews': [review.to_dict() for review in reviews.items],
        'total': reviews.total,
        'pages': reviews.pages,
        'current_page': reviews.page,
        'per_page': reviews.per_page
    })

# Компании на модерации
@moderation_bp.route('/companies', methods=['GET'])
@jwt_required()
def get_pending_companies():
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status', 'pending')
    
    companies = Company.query.filter_by(status=status).order_by(Company.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'companies': [{
            'id': c.id,
            'name': c.name,
            'category': c.category,
            'city': c.city,
            'created_at': c.created_at.isoformat()
        } for c in companies.items],
        'total': companies.total,
        'pages': companies.pages,
        'current_page': companies.page,
        'per_page': companies.per_page
    })

# Модерация статьи
@moderation_bp.route('/articles/<int:article_id>/moderate', methods=['POST'])
@jwt_required()
def moderate_article(article_id):
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    data = request.get_json()
    status = data.get('status')
    
    if status not in ['pending', 'approved', 'rejected']:
        return jsonify({'error': 'Недопустимый статус'}), 400
    
    article = Article.query.get_or_404(article_id)
    article.status = status
    article.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({'message': 'Статус статьи обновлен', 'article': article.to_dict()})

# Модерация комментария
@moderation_bp.route('/comments/<int:comment_id>/moderate', methods=['POST'])
@jwt_required()
def moderate_comment(comment_id):
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    data = request.get_json()
    status = data.get('status')
    
    if status not in ['pending', 'approved', 'rejected']:
        return jsonify({'error': 'Недопустимый статус'}), 400
    
    comment = Comment.query.get_or_404(comment_id)
    comment.status = status
    
    db.session.commit()
    
    return jsonify({'message': 'Статус комментария обновлен', 'comment': comment.to_dict()})

# Модерация отзыва
@moderation_bp.route('/reviews/<int:review_id>/moderate', methods=['POST'])
@jwt_required()
def moderate_review(review_id):
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    data = request.get_json()
    status = data.get('status')
    
    if status not in ['pending', 'approved', 'rejected']:
        return jsonify({'error': 'Недопустимый статус'}), 400
    
    review = Review.query.get_or_404(review_id)
    review.status = status
    
    db.session.commit()
    
    return jsonify({'message': 'Статус отзыва обновлен', 'review': review.to_dict()})

# Модерация компании
@moderation_bp.route('/companies/<int:company_id>/moderate', methods=['POST'])
@jwt_required()
def moderate_company(company_id):
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    data = request.get_json()
    status = data.get('status')
    if status not in ['pending', 'approved', 'rejected']:
        return jsonify({'error': 'Недопустимый статус'}), 400
    
    company = Company.query.get_or_404(company_id)
    company.status = status
    db.session.commit()
    
    return jsonify({'message': 'Статус компании обновлен', 'company': {
        'id': company.id,
        'name': company.name,
        'status': company.status
    }})
