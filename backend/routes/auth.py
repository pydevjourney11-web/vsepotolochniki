from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from backend.models import db, User
import logging

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/test', methods=['GET'])
def test_auth():
    logger.info("Auth test endpoint called")
    try:
        # Проверяем подключение к базе данных
        user_count = User.query.count()
        return jsonify({
            'message': 'Auth blueprint is working',
            'user_count': user_count,
            'database_connected': True
        }), 200
    except Exception as e:
        logger.error(f"Auth test failed: {str(e)}", exc_info=True)
        return jsonify({
            'message': 'Auth blueprint error',
            'error': str(e),
            'database_connected': False
        }), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    logger.info("Register endpoint called")
    try:
        logger.info("Getting JSON data")
        data = request.get_json()
        logger.info(f"Received data: {data}")
        
        if not data or not data.get('email') or not data.get('password') or not data.get('name'):
            logger.warning("Missing required fields")
            return jsonify({'error': 'Email, password and name are required'}), 400
        
        logger.info("Checking if user exists")
        # Проверяем, существует ли пользователь
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            logger.warning(f"User already exists: {data['email']}")
            return jsonify({'error': 'User already exists'}), 400
        
        logger.info("Creating new user")
        # Создаем нового пользователя
        user = User(
            email=data['email'],
            password=generate_password_hash(data['password']),
            name=data['name']
        )
        
        logger.info("Adding user to session")
        db.session.add(user)
        
        logger.info("Committing to database")
        db.session.commit()
        
        logger.info("Creating access token")
        # Создаем токен
        access_token = create_access_token(identity=str(user.id))
        
        logger.info("Registration successful")
        return jsonify({
            'message': 'User created successfully',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'role': user.role
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if user and check_password_hash(user.password, data['password']):
        # Автовыдача роли админа для служебного аккаунта
        if user.email == 'admin@test.com' and user.role != 'admin':
            user.role = 'admin'
            db.session.commit()
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'role': user.role
            }
        })
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'avatar': user.avatar,
        'created_at': user.created_at.isoformat()
    })

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if 'name' in data:
        user.name = data['name']
    
    if 'avatar' in data:
        user.avatar = data['avatar']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Profile updated successfully',
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role,
            'avatar': user.avatar
        }
    })
