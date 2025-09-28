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
# Поддержка PostgreSQL для продакшена, SQLite для разработки
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'jwt-secret-string-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
# Определяем папку для загрузок - всегда используем папку в проекте
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Создаем папку для загрузок
try:
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    print(f"✅ Папка загрузок создана: {app.config['UPLOAD_FOLDER']}")
    print(f"✅ Переменная RENDER: {os.environ.get('RENDER')}")
    print(f"✅ Текущая рабочая директория: {os.getcwd()}")
    print(f"✅ BASE_DIR: {BASE_DIR}")
except Exception as e:
    print(f"⚠️ Не удалось создать папку загрузок: {e}")

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
            
            # Создаем админа если его нет
            admin_user = User.query.filter_by(email='admin@test.com').first()
            admin_created = False
            if not admin_user:
                from werkzeug.security import generate_password_hash
                admin_user = User(
                    email='admin@test.com',
                    password=generate_password_hash('admin123'),
                    name='Администратор',
                    role='admin'
                )
                db.session.add(admin_user)
                db.session.commit()
                admin_created = True
                
        return jsonify({
            'message': 'Database initialized successfully',
            'user_count': user_count,
            'admin_created': admin_created
        }), 200
    except Exception as e:
        return jsonify({
            'error': f'Database initialization failed: {str(e)}'
        }), 500

@app.route('/api/health')
def health_check():
    try:
        # Проверяем подключение к базе данных
        db.session.execute('SELECT 1')
        db_status = 'connected'
        
        # Проверяем существование админа
        from backend.models import User
        admin_user = User.query.filter_by(email='admin@test.com').first()
        admin_exists = admin_user is not None
        
    except Exception as e:
        db_status = f'error: {str(e)}'
        admin_exists = False
    
    return jsonify({
        'status': 'ok', 
        'message': 'Server is running', 
        'timestamp': datetime.utcnow().isoformat(),
        'frontend_dir': FRONTEND_DIR,
        'frontend_exists': os.path.exists(FRONTEND_DIR),
        'database_status': db_status,
        'admin_exists': admin_exists
    })

@app.route('/api/update-db', methods=['GET', 'POST'])
def update_database():
    """Обновление схемы базы данных для продакшена"""
    try:
        from sqlalchemy import text
        
        print("🔧 Начинаем обновление базы данных...")
        
        # Проверяем текущий размер поля password
        result = db.session.execute(text("""
            SELECT character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'user' AND column_name = 'password'
        """))
        
        current_length = result.fetchone()
        if current_length:
            print(f"📏 Текущий размер поля password: {current_length[0]} символов")
            
            if current_length[0] < 200:
                print("🔧 Обновляем размер поля password до 200 символов...")
                
                # Обновляем размер поля password
                db.session.execute(text("ALTER TABLE \"user\" ALTER COLUMN password TYPE VARCHAR(200)"))
                db.session.commit()
                
                print("✅ Поле password успешно обновлено!")
                
                return jsonify({
                    'success': True,
                    'message': 'Поле password успешно обновлено до 200 символов!',
                    'old_length': current_length[0],
                    'new_length': 200
                })
            else:
                return jsonify({
                    'success': True,
                    'message': 'Поле password уже имеет достаточный размер',
                    'current_length': current_length[0]
                })
        else:
            print("❌ Таблица user не найдена")
            return jsonify({
                'success': False,
                'error': 'Таблица user не найдена'
            }), 404
            
    except Exception as e:
        print(f"❌ Ошибка при обновлении базы данных: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Ошибка при обновлении базы данных: {str(e)}'
        }), 500

@app.route('/api/update-comment-photos', methods=['GET', 'POST'])
def update_comment_photos():
    """Добавление поля photos в таблицу comment"""
    try:
        from sqlalchemy import text
        
        print("🔧 Добавляем поле photos в таблицу comment...")
        
        # Проверяем, существует ли поле photos
        result = db.session.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'comment' AND column_name = 'photos'
        """))
        
        if result.fetchone():
            print("ℹ️ Поле photos уже существует в таблице comment")
            return jsonify({
                'success': True,
                'message': 'Поле photos уже существует в таблице comment'
            })
        else:
            print("🔧 Добавляем поле photos в таблицу comment...")
            
            # Добавляем поле photos
            db.session.execute(text("ALTER TABLE comment ADD COLUMN photos TEXT"))
            db.session.commit()
            
            print("✅ Поле photos успешно добавлено в таблицу comment!")
            
            return jsonify({
                'success': True,
                'message': 'Поле photos успешно добавлено в таблицу comment!'
            })
            
    except Exception as e:
        print(f"❌ Ошибка при добавлении поля photos: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Ошибка при добавлении поля photos: {str(e)}'
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error',
        'details': str(error)
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
    try:
        print(f"📁 Запрос файла: {filename}")
        print(f"📁 Путь к файлу: {os.path.join(app.config['UPLOAD_FOLDER'], filename)}")
        print(f"📁 Файл существует: {os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'], filename))}")
        
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except Exception as e:
        print(f"❌ Ошибка при обслуживании файла {filename}: {e}")
        return jsonify({'error': 'File not found'}), 404

@app.route('/uploads/<filename>')
def uploaded_file_alt(filename):
    """Альтернативный endpoint для обслуживания файлов"""
    try:
        print(f"📁 Альтернативный запрос файла: {filename}")
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        print(f"📁 Путь к файлу: {file_path}")
        print(f"📁 Файл существует: {os.path.exists(file_path)}")
        
        if os.path.exists(file_path):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
        else:
            print(f"❌ Файл не найден: {file_path}")
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        print(f"❌ Ошибка при обслуживании файла {filename}: {e}")
        return jsonify({'error': 'File not found'}), 404

@app.route('/api/debug-uploads')
def debug_uploads():
    """Отладочный endpoint для проверки загруженных файлов"""
    try:
        upload_folder = app.config['UPLOAD_FOLDER']
        files = []
        
        if os.path.exists(upload_folder):
            for filename in os.listdir(upload_folder):
                file_path = os.path.join(upload_folder, filename)
                if os.path.isfile(file_path):
                    files.append({
                        'name': filename,
                        'size': os.path.getsize(file_path),
                        'path': file_path
                    })
        
        return jsonify({
            'upload_folder': upload_folder,
            'folder_exists': os.path.exists(upload_folder),
            'files': files,
            'file_count': len(files)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API для загрузки фотографий
@app.route('/api/upload-photos', methods=['POST'])
def upload_photos():
    """Загрузка фотографий для комментариев и отзывов"""
    try:
        if 'photos' not in request.files:
            return jsonify({'error': 'No photos provided'}), 400
        
        files = request.files.getlist('photos')
        
        if len(files) > 5:
            return jsonify({'error': 'Maximum 5 photos allowed'}), 400
        
        uploaded_files = []
        
        for file in files:
            if file and file.filename:
                # Проверяем расширение файла
                if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                    return jsonify({'error': 'Only image files are allowed'}), 400
                
                # Проверяем размер файла (5MB)
                file_content = file.read()
                if len(file_content) > 5 * 1024 * 1024:
                    return jsonify({'error': 'File size too large (max 5MB)'}), 400
                
                file.seek(0)  # Возвращаем указатель в начало
                
                # Генерируем уникальное имя файла
                filename = secure_filename(file.filename)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                unique_filename = f"{timestamp}_{filename}"
                
                # Сохраняем файл
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                print(f"📁 Сохраняем файл: {file_path}")
                print(f"📁 Папка загрузок: {app.config['UPLOAD_FOLDER']}")
                print(f"📁 Файл существует: {os.path.exists(app.config['UPLOAD_FOLDER'])}")
                
                file.save(file_path)
                
                # Проверяем, что файл сохранился
                if os.path.exists(file_path):
                    print(f"✅ Файл успешно сохранен: {file_path}")
                else:
                    print(f"❌ Файл не сохранился: {file_path}")
                
                uploaded_files.append(unique_filename)
        
        return jsonify({
            'message': 'Photos uploaded successfully',
            'files': uploaded_files
        })
        
    except Exception as e:
        print(f"❌ Ошибка загрузки фотографий: {e}")
        return jsonify({'error': 'Failed to upload photos'}), 500

# Инициализация базы данных
def init_db():
    with app.app_context():
        try:
            print(f"🗄️ Подключение к базе данных: {app.config['SQLALCHEMY_DATABASE_URI']}")
        db.create_all()
            print("✅ Таблицы базы данных созданы/обновлены")
            
            # Создаем администратора если его нет
            from backend.models import User
            admin_user = User.query.filter_by(email='admin@test.com').first()
            if not admin_user:
                from werkzeug.security import generate_password_hash
                admin_user = User(
                    email='admin@test.com',
                    password=generate_password_hash('admin123'),
                    name='Администратор',
                    role='admin'
                )
                db.session.add(admin_user)
                db.session.commit()
                print("✅ Администратор создан: admin@test.com / admin123")
            else:
                print("ℹ️ Администратор уже существует")
                
        except Exception as e:
            print(f"❌ Ошибка инициализации базы данных: {e}")
            pass  # Игнорируем ошибки при инициализации

# Инициализируем базу данных при запуске
init_db()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
