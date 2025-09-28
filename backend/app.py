from flask import Flask, request, jsonify, send_from_directory
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
from datetime import datetime, timedelta
import json

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
from models import db, User, Company, Review, Article, Comment

# Инициализируем расширения
db.init_app(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)
CORS(app)  # Разрешаем CORS для всех доменов

# Импортируем роуты
from routes.auth import auth_bp
from routes.catalog import catalog_bp
from routes.forum import forum_bp
from routes.reviews import reviews_bp
from routes.moderation import moderation_bp
from routes.search import search_bp

# Регистрируем блюпринты
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(catalog_bp, url_prefix='/api/catalog')
app.register_blueprint(forum_bp, url_prefix='/api/forum')
app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
app.register_blueprint(moderation_bp, url_prefix='/api/moderation')
app.register_blueprint(search_bp, url_prefix='/api/search')

@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend', path)

@app.route('/api/health')
def health_check():
    return jsonify({'status': 'ok', 'message': 'Server is running'})

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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)
