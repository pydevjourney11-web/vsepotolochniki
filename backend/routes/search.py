from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Company, Article, Review
from sqlalchemy import or_, and_

search_bp = Blueprint('search', __name__, url_prefix='/search')

@search_bp.route('/', methods=['GET'])
def global_search():
    """
    Универсальный поиск по всему сайту
    """
    query = request.args.get('q', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    type_filter = request.args.get('type', '')  # companies, articles, reviews, all
    
    if not query:
        return jsonify({
            'companies': [],
            'articles': [],
            'reviews': [],
            'total': 0,
            'query': '',
            'current_page': page
        })
    
    search_term = f"%{query}%"
    results = {
        'companies': [],
        'articles': [],
        'reviews': [],
        'total': 0,
        'query': query,
        'current_page': page
    }
    
    # Поиск по компаниям
    if type_filter in ['', 'all', 'companies']:
        companies_query = Company.query.filter(
            and_(
                Company.status == 'approved',
                or_(
                    Company.name.ilike(search_term),
                    Company.category.ilike(search_term),
                    Company.city.ilike(search_term),
                    Company.description.ilike(search_term)
                )
            )
        ).order_by(Company.rating.desc())
        
        companies = companies_query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        results['companies'] = [{
            'id': company.id,
            'name': company.name,
            'category': company.category,
            'city': company.city,
            'description': company.description,
            'rating': company.rating,
            'review_count': company.review_count,
            'logo': company.logo,
            'type': 'company'
        } for company in companies.items]
        
        results['total'] += companies.total
    
    # Поиск по статьям
    if type_filter in ['', 'all', 'articles']:
        articles_query = Article.query.filter(
            and_(
                Article.status == 'approved',
                or_(
                    Article.title.ilike(search_term),
                    Article.content.ilike(search_term),
                    Article.tags.ilike(search_term),
                    Article.excerpt.ilike(search_term)
                )
            )
        ).order_by(Article.created_at.desc())
        
        articles = articles_query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        results['articles'] = [{
            'id': article.id,
            'title': article.title,
            'excerpt': article.excerpt,
            'content': article.content[:200] + '...' if len(article.content) > 200 else article.content,
            'tags': article.tags,
            'cover_image': article.cover_image,
            'views': article.views,
            'author': {
                'id': article.author.id if article.author else None,
                'name': article.author.name if article.author else article.anonymous_author,
                'avatar': article.author.avatar if article.author else None
            },
            'created_at': article.created_at.isoformat(),
            'type': 'article'
        } for article in articles.items]
        
        results['total'] += articles.total
    
    # Поиск по отзывам
    if type_filter in ['', 'all', 'reviews']:
        reviews_query = Review.query.filter(
            and_(
                Review.status == 'approved',
                or_(
                    Review.text.ilike(search_term)
                )
            )
        ).order_by(Review.created_at.desc())
        
        reviews = reviews_query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        results['reviews'] = [{
            'id': review.id,
            'text': review.text,
            'rating': review.rating,
            'company': {
                'id': review.company.id,
                'name': review.company.name,
                'category': review.company.category
            },
            'author': {
                'id': review.author.id,
                'name': review.author.name,
                'avatar': review.author.avatar
            },
            'created_at': review.created_at.isoformat(),
            'type': 'review'
        } for review in reviews.items]
        
        results['total'] += reviews.total
    
    return jsonify(results)

@search_bp.route('/suggestions', methods=['GET'])
def search_suggestions():
    """
    Получение предложений для автодополнения поиска
    """
    query = request.args.get('q', '').strip()
    
    if len(query) < 2:
        return jsonify({'suggestions': []})
    
    search_term = f"%{query}%"
    suggestions = []
    
    # Предложения из названий компаний
    companies = Company.query.filter(
        and_(
            Company.status == 'approved',
            Company.name.ilike(search_term)
        )
    ).limit(5).all()
    
    for company in companies:
        suggestions.append({
            'text': company.name,
            'type': 'company',
            'category': company.category,
            'city': company.city
        })
    
    # Предложения из заголовков статей
    articles = Article.query.filter(
        and_(
            Article.status == 'approved',
            Article.title.ilike(search_term)
        )
    ).limit(5).all()
    
    for article in articles:
        suggestions.append({
            'text': article.title,
            'type': 'article',
            'author': article.author.name if article.author else article.anonymous_author
        })
    
    # Предложения из категорий
    categories = db.session.query(Company.category).filter(
        and_(
            Company.status == 'approved',
            Company.category.ilike(search_term)
        )
    ).distinct().limit(3).all()
    
    for category in categories:
        suggestions.append({
            'text': category[0],
            'type': 'category'
        })
    
    # Предложения из городов
    cities = db.session.query(Company.city).filter(
        and_(
            Company.status == 'approved',
            Company.city.ilike(search_term)
        )
    ).distinct().limit(3).all()
    
    for city in cities:
        suggestions.append({
            'text': city[0],
            'type': 'city'
        })
    
    return jsonify({'suggestions': suggestions[:10]})  # Ограничиваем до 10 предложений
