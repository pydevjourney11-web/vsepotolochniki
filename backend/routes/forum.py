from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models import db, Article, Comment, User
import json

forum_bp = Blueprint('forum', __name__)

@forum_bp.route('/articles', methods=['GET'])
def get_articles():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    tag = request.args.get('tag')
    search = request.args.get('search')
    
    query = Article.query.filter_by(status='approved')
    
    if tag:
        query = query.filter(Article.tags.contains(tag))
    
    if search:
        # Полнотекстовый поиск по заголовку, содержанию, тегам и автору
        search_term = f"%{search}%"
        query = query.filter(
            db.or_(
                Article.title.ilike(search_term),
                Article.content.ilike(search_term),
                Article.tags.ilike(search_term),
                Article.excerpt.ilike(search_term)
            )
        )
    
    articles = query.order_by(Article.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'articles': [{
            'id': article.id,
            'title': article.title,
            'excerpt': article.excerpt,
            'cover_image': article.cover_image,
            'tags': json.loads(article.tags) if article.tags else [],
            'views': article.views,
            'author': {
                'id': article.author.id if article.author else None,
                'name': article.author.name if article.author else article.anonymous_author,
                'avatar': article.author.avatar if article.author else None
            },
            'created_at': article.created_at.isoformat(),
            'comment_count': len(article.comments)
        } for article in articles.items],
        'total': articles.total,
        'pages': articles.pages,
        'current_page': page
    })

@forum_bp.route('/articles/<int:article_id>', methods=['GET'])
def get_article(article_id):
    article = Article.query.get_or_404(article_id)
    
    # Увеличиваем счетчик просмотров
    article.views += 1
    db.session.commit()
    
    # Получаем комментарии
    comments = Comment.query.filter_by(article_id=article_id, status='approved').order_by(Comment.created_at.asc()).all()
    
    return jsonify({
        'id': article.id,
        'title': article.title,
        'content': article.content,
        'excerpt': article.excerpt,
        'cover_image': article.cover_image,
        'tags': json.loads(article.tags) if article.tags else [],
        'views': article.views,
        'status': article.status,
        'author': {
            'id': article.author.id if article.author else None,
            'name': article.author.name if article.author else article.anonymous_author,
            'avatar': article.author.avatar if article.author else None
        },
        'comments': [comment.to_dict() for comment in comments],
        'created_at': article.created_at.isoformat(),
        'updated_at': article.updated_at.isoformat()
    })

@forum_bp.route('/articles', methods=['POST'])
def create_article():
    data = request.get_json()
    
    if not data or not data.get('title') or not data.get('content'):
        return jsonify({'error': 'Title and content are required'}), 400
    
    # Проверяем авторизацию
    user_id = None
    anonymous_author = None
    
    try:
        user_id = get_jwt_identity()
        user_id = int(user_id)
    except:
        # Пользователь не авторизован - анонимная статья
        # Проверяем капчу
        captcha_response = data.get('captcha')
        if not captcha_response:
            return jsonify({'error': 'Captcha verification required for anonymous articles'}), 400
        
        # Проверяем капчу с Google
        import requests
        captcha_secret = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJZe"  # Тестовый секретный ключ
        captcha_verify_url = "https://www.google.com/recaptcha/api/siteverify"
        
        captcha_data = {
            'secret': captcha_secret,
            'response': captcha_response
        }
        
        try:
            captcha_result = requests.post(captcha_verify_url, data=captcha_data)
            captcha_result = captcha_result.json()
            
            if not captcha_result.get('success'):
                return jsonify({'error': 'Captcha verification failed'}), 400
        except:
            return jsonify({'error': 'Captcha verification failed'}), 400
        
        # Запрашиваем имя для анонимной статьи
        anonymous_author = data.get('anonymous_author', 'Анонимный автор')
    
    article = Article(
        title=data['title'],
        content=data['content'],
        excerpt=data.get('excerpt', data['content'][:200] + '...'),
        cover_image=data.get('cover_image'),
        tags=json.dumps(data.get('tags', [])),
        author_id=user_id,
        anonymous_author=anonymous_author,
        status='approved'  # Автоматически одобряем статьи
    )
    
    db.session.add(article)
    db.session.commit()
    
    return jsonify({
        'message': 'Article created successfully',
        'article': {
            'id': article.id,
            'title': article.title,
            'excerpt': article.excerpt,
            'tags': json.loads(article.tags),
            'created_at': article.created_at.isoformat()
        }
    }), 201

@forum_bp.route('/articles/<int:article_id>', methods=['PUT'])
@jwt_required()
def update_article(article_id):
    user_id = get_jwt_identity()
    article = Article.query.get_or_404(article_id)
    user = User.query.get(int(user_id))
    
    # Проверяем права доступа (автор или администратор)
    if article.author_id != int(user_id) and user.role != 'admin':
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    if 'title' in data:
        article.title = data['title']
    if 'content' in data:
        article.content = data['content']
        article.excerpt = data.get('excerpt', data['content'][:200] + '...')
    if 'cover_image' in data:
        article.cover_image = data['cover_image']
    if 'tags' in data:
        article.tags = json.dumps(data['tags'])
    if 'status' in data:
        article.status = data['status']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Article updated successfully',
        'article': {
            'id': article.id,
            'title': article.title,
            'excerpt': article.excerpt,
            'tags': json.loads(article.tags)
        }
    })

@forum_bp.route('/articles/<int:article_id>', methods=['DELETE'])
@jwt_required()
def delete_article(article_id):
    user_id = get_jwt_identity()
    article = Article.query.get_or_404(article_id)
    user = User.query.get(int(user_id))
    
    # Проверяем права доступа (автор или администратор)
    if article.author_id != int(user_id) and user.role != 'admin':
        return jsonify({'error': 'Access denied'}), 403
    
    db.session.delete(article)
    db.session.commit()
    
    return jsonify({'message': 'Article deleted successfully'})

# Модерация статьи
@forum_bp.route('/articles/<int:article_id>/moderate', methods=['POST'])
@jwt_required()
def moderate_article(article_id):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    
    # Проверяем права администратора
    if user.role != 'admin':
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    status = data.get('status')
    
    if status not in ['pending', 'approved', 'rejected']:
        return jsonify({'error': 'Недопустимый статус'}), 400
    
    article = Article.query.get_or_404(article_id)
    article.status = status
    
    db.session.commit()
    
    article_data = {
        'id': article.id,
        'title': article.title,
        'content': article.content,
        'excerpt': article.excerpt,
        'cover_image': article.cover_image,
        'tags': json.loads(article.tags) if article.tags else [],
        'status': article.status,
        'author': {
            'id': article.author.id,
            'name': article.author.name,
            'avatar': article.author.avatar
        },
        'views': article.views,
        'created_at': article.created_at.isoformat(),
        'updated_at': article.updated_at.isoformat()
    }
    
    return jsonify({'message': 'Статус статьи обновлен', 'article': article_data})

@forum_bp.route('/articles/<int:article_id>/comments', methods=['POST'])
def create_comment(article_id):
    data = request.get_json()
    
    if not data or not data.get('text'):
        return jsonify({'error': 'Comment text is required'}), 400
    
    # Проверяем, что статья существует
    article = Article.query.get_or_404(article_id)
    
    # Проверяем авторизацию
    user_id = None
    anonymous_name = None
    
    try:
        user_id = get_jwt_identity()
        user_id = int(user_id)
    except:
        # Пользователь не авторизован - анонимный комментарий
        # Проверяем капчу
        captcha_response = data.get('captcha')
        if not captcha_response:
            return jsonify({'error': 'Captcha verification required for anonymous comments'}), 400
        
        # Проверяем капчу с Google
        import requests
        captcha_secret = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJZe"  # Тестовый секретный ключ
        captcha_verify_url = "https://www.google.com/recaptcha/api/siteverify"
        
        captcha_data = {
            'secret': captcha_secret,
            'response': captcha_response
        }
        
        try:
            captcha_result = requests.post(captcha_verify_url, data=captcha_data)
            captcha_result = captcha_result.json()
            
            if not captcha_result.get('success'):
                return jsonify({'error': 'Captcha verification failed'}), 400
        except:
            return jsonify({'error': 'Captcha verification failed'}), 400
        
        # Запрашиваем имя для анонимного комментария
        anonymous_name = data.get('anonymous_name', 'Анонимный пользователь')
    
    comment = Comment(
        article_id=article_id,
        user_id=user_id,
        anonymous_name=anonymous_name,
        text=data['text']
    )
    
    db.session.add(comment)
    db.session.commit()
    
    return jsonify({
        'message': 'Comment created successfully',
        'comment': comment.to_dict()
    }), 201

@forum_bp.route('/comments/<int:comment_id>', methods=['PUT'])
@jwt_required()
def update_comment(comment_id):
    user_id = get_jwt_identity()
    comment = Comment.query.get_or_404(comment_id)
    
    # Проверяем права доступа
    if comment.user_id != int(user_id):
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    if 'text' in data:
        comment.text = data['text']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Comment updated successfully',
        'comment': comment.to_dict()
    })

@forum_bp.route('/comments/<int:comment_id>', methods=['GET'])
@jwt_required()
def get_comment(comment_id):
    user_id = get_jwt_identity()
    comment = Comment.query.get_or_404(comment_id)
    
    # Проверяем права доступа
    if comment.user_id != int(user_id):
        return jsonify({'error': 'Access denied'}), 403
    
    return jsonify({
        'comment': comment.to_dict()
    })

@forum_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    user_id = get_jwt_identity()
    comment = Comment.query.get_or_404(comment_id)
    
    # Проверяем права доступа
    if comment.user_id != int(user_id):
        return jsonify({'error': 'Access denied'}), 403
    
    db.session.delete(comment)
    db.session.commit()
    
    return jsonify({'message': 'Comment deleted successfully'})

@forum_bp.route('/tags', methods=['GET'])
def get_tags():
    articles = Article.query.filter_by(status='approved').all()
    all_tags = []
    
    for article in articles:
        if article.tags:
            tags = json.loads(article.tags)
            all_tags.extend(tags)
    
    # Убираем дубликаты и сортируем
    unique_tags = sorted(list(set(all_tags)))
    
    return jsonify(unique_tags)
