from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models import db, Company, User, Review
import json

catalog_bp = Blueprint('catalog', __name__)

@catalog_bp.route('/', methods=['GET'])
def get_companies():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    category = request.args.get('category')
    city = request.args.get('city')
    search = request.args.get('search')
    rating = request.args.get('rating')
    owner_id = request.args.get('owner_id', type=int)
    
    # Если запрашиваются компании конкретного владельца, показываем все его компании
    # Иначе показываем только одобренные
    if owner_id:
        query = Company.query.filter_by(owner_id=owner_id)
    else:
        query = Company.query.filter_by(status='approved')
    
    if category:
        query = query.filter(Company.category == category)
    
    if city:
        query = query.filter(Company.city == city)
    
    if search:
        # Полнотекстовый поиск по названию, категории, городу и описанию
        search_term = f"%{search}%"
        query = query.filter(
            db.or_(
                Company.name.ilike(search_term),
                Company.category.ilike(search_term),
                Company.city.ilike(search_term),
                Company.description.ilike(search_term)
            )
        )
    
    if rating:
        min_rating = float(rating)
        query = query.filter(Company.rating >= min_rating)
    
    companies = query.order_by(Company.rating.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'companies': [{
            'id': company.id,
            'name': company.name,
            'category': company.category,
            'city': company.city,
            'address': company.address,
            'phone': company.phone,
            'website': company.website,
            'description': company.description,
            'logo': company.logo,
            'rating': company.rating,
            'review_count': company.review_count,
            'status': company.status,
            'created_at': company.created_at.isoformat()
        } for company in companies.items],
        'total': companies.total,
        'pages': companies.pages,
        'current_page': page
    })

@catalog_bp.route('/<int:company_id>', methods=['GET'])
def get_company(company_id):
    try:
        company = Company.query.get_or_404(company_id)
        
        # Получаем отзывы
        reviews = Review.query.filter_by(company_id=company_id, status='approved').order_by(Review.created_at.desc()).limit(10).all()
        
        return jsonify({
            'id': company.id,
            'name': company.name,
            'category': company.category,
            'city': company.city,
            'address': company.address,
            'phone': company.phone,
            'website': company.website,
            'description': company.description,
            'logo': company.logo,
            'rating': company.rating,
            'review_count': company.review_count,
            'owner': {
                'id': company.owner.id,
                'name': company.owner.name
            } if company.owner else None,
            'reviews': [review.to_dict() for review in reviews],
            'created_at': company.created_at.isoformat()
        })
    except Exception as e:
        return jsonify({'error': f'Ошибка загрузки компании: {str(e)}'}), 500

@catalog_bp.route('/', methods=['POST'])
@jwt_required()
def create_company():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or not data.get('name') or not data.get('category') or not data.get('city'):
        return jsonify({'error': 'Name, category and city are required'}), 400
    
    # Обрабатываем пустые строки как None
    def clean_field(value):
        return value if value and value.strip() else None
    
    company = Company(
        name=data['name'].strip(),
        category=data['category'].strip(),
        city=data['city'].strip(),
        address=clean_field(data.get('address')),
        phone=clean_field(data.get('phone')),
        website=clean_field(data.get('website')),
        description=clean_field(data.get('description')),
        logo=clean_field(data.get('logo')),
        owner_id=int(user_id)
    )
    
    try:
        db.session.add(company)
        db.session.commit()
        
        return jsonify({
            'message': 'Company created successfully',
            'company': {
                'id': company.id,
                'name': company.name,
                'category': company.category,
                'city': company.city,
                'rating': company.rating,
                'review_count': company.review_count
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create company: ' + str(e)}), 500

@catalog_bp.route('/<int:company_id>', methods=['PUT'])
@jwt_required()
def update_company(company_id):
    user_id = get_jwt_identity()
    company = Company.query.get_or_404(company_id)
    
    # Проверяем права доступа
    if company.owner_id != int(user_id):
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    if 'name' in data:
        company.name = data['name']
    if 'category' in data:
        company.category = data['category']
    if 'city' in data:
        company.city = data['city']
    if 'address' in data:
        company.address = data['address']
    if 'phone' in data:
        company.phone = data['phone']
    if 'website' in data:
        company.website = data['website']
    if 'description' in data:
        company.description = data['description']
    if 'logo' in data:
        company.logo = data['logo']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Company updated successfully',
        'company': {
            'id': company.id,
            'name': company.name,
            'category': company.category,
            'city': company.city,
            'rating': company.rating,
            'review_count': company.review_count
        }
    })

@catalog_bp.route('/<int:company_id>', methods=['DELETE'])
@jwt_required()
def delete_company(company_id):
    user_id = get_jwt_identity()
    company = Company.query.get_or_404(company_id)
    
    # Проверяем права доступа
    if company.owner_id != int(user_id):
        return jsonify({'error': 'Access denied'}), 403
    
    db.session.delete(company)
    db.session.commit()
    
    return jsonify({'message': 'Company deleted successfully'})

@catalog_bp.route('/categories', methods=['GET'])
def get_categories():
    categories = db.session.query(Company.category).distinct().all()
    return jsonify([cat[0] for cat in categories])

@catalog_bp.route('/cities', methods=['GET'])
def get_cities():
    cities = db.session.query(Company.city).distinct().all()
    return jsonify([city[0] for city in cities])
