from flask import Flask, request, jsonify, send_from_directory
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
from datetime import datetime, timedelta
import json

# Получаем абсолютный путь к корневой директории проекта
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'jwt-secret-string-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Создаем папку для загрузок
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Импортируем db из models
from backend.models import db, User, Company, Review, Article, Comment

# Инициализируем расширения
db.init_app(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)
CORS(app)  # Разрешаем CORS для всех доменов

# Импортируем роуты
from backend.routes.auth import auth_bp
from backend.routes.catalog import catalog_bp
from backend.routes.forum import forum_bp
from backend.routes.reviews import reviews_bp
from backend.routes.moderation import moderation_bp
from backend.routes.search import search_bp

# Регистрируем блюпринты
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(catalog_bp, url_prefix='/api/catalog')
app.register_blueprint(forum_bp, url_prefix='/api/forum')
app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
app.register_blueprint(moderation_bp, url_prefix='/api/moderation')
app.register_blueprint(search_bp, url_prefix='/api/search')

@app.route('/')
def index():
    try:
        return send_from_directory(FRONTEND_DIR, 'index.html')
    except Exception as e:
        return jsonify({'error': f'Frontend directory not found: {FRONTEND_DIR}', 'exception': str(e)}), 500

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'css'), filename)

@app.route('/<path:filename>')
def serve_html(filename):
    # Исключаем API маршруты
    if filename.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    return send_from_directory(FRONTEND_DIR, filename)

@app.route('/test')
def test():
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Page</title>
    </head>
    <body>
        <h1>Test Page Works!</h1>
        <p>Frontend directory: {}</p>
        <p>Frontend exists: {}</p>
        <p><a href="/api/health">Check API Health</a></p>
    </body>
    </html>
    '''.format(FRONTEND_DIR, os.path.exists(FRONTEND_DIR))

@app.route('/api/init-db', methods=['POST'])
def init_database():
    try:
        with app.app_context():
            db.create_all()
            # Проверяем, что таблицы созданы
            from backend.models import User
            user_count = User.query.count()
        return jsonify({
            'message': 'Database initialized successfully',
            'user_count': user_count
        }), 200
    except Exception as e:
        import traceback
        return jsonify({
            'error': f'Database initialization failed: {str(e)}',
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/health')
def health_check():
    try:
        # Проверяем подключение к базе данных
        db.session.execute('SELECT 1')
        db_status = 'connected'
    except Exception as e:
        db_status = f'error: {str(e)}'
    
    return jsonify({
        'status': 'ok', 
        'message': 'Server is running', 
        'timestamp': datetime.utcnow().isoformat(),
        'frontend_dir': FRONTEND_DIR,
        'frontend_exists': os.path.exists(FRONTEND_DIR),
        'database_status': db_status
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    import traceback
    return jsonify({
        'error': 'Internal server error',
        'details': str(error),
        'traceback': traceback.format_exc()
    }), 500

@app.route('/api/upload', methods=['POST'])
@jwt_required()
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Добавляем timestamp для уникальности
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        filename = timestamp + filename
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Возвращаем URL файла
        file_url = f'/static/uploads/{filename}'
        return jsonify({'url': file_url, 'filename': filename})
    
    return jsonify({'error': 'Invalid file type'}), 400

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/static/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Инициализация базы данных
def init_db():
    with app.app_context():
        try:
            db.create_all()
            print("Database tables created successfully")
        except Exception as e:
            print(f"Error creating database tables: {e}")

# Инициализируем базу данных при запуске
init_db()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
