// Глобальные переменные
let currentArticle = null;
let currentArticleId = null;

// Инициализация страницы
document.addEventListener('DOMContentLoaded', function() {
    // Обновляем UI навигации
    auth.updateUI();
    
    // Получаем ID статьи из URL
    const urlParams = new URLSearchParams(window.location.search);
    currentArticleId = urlParams.get('id');
    
    if (!currentArticleId) {
        showError('ID статьи не указан');
        return;
    }
    
    // Загружаем статью
    loadArticle();
});

// Загрузка статьи
async function loadArticle() {
    try {
        const article = await api.getArticle(currentArticleId);
        currentArticle = article;
        displayArticle(article);
        loadRelatedArticles(article);
    } catch (error) {
        console.error('Ошибка загрузки статьи:', error);
        showError('Ошибка загрузки статьи: ' + error.message);
    }
}

// Отображение статьи
function displayArticle(article) {
    // Скрываем загрузку
    document.getElementById('loadingState').style.display = 'none';
    
    // Показываем контент
    document.getElementById('articleContent').style.display = 'block';
    
    // Обновляем title и хлебные крошки
    document.title = `${article.title} | ВП | Все потолочные`;
    document.getElementById('articleBreadcrumb').textContent = article.title;
    
    // Заголовок
    document.getElementById('articleTitle').textContent = article.title;
    
    // Автор и дата
    document.getElementById('articleAuthor').textContent = article.author.name;
    document.getElementById('articleDate').textContent = formatDate(article.created_at);
    
    // Просмотры
    document.getElementById('articleViews').textContent = article.views;
    
    // Теги
    const tagsContainer = document.getElementById('articleTags');
    if (article.tags && article.tags.length > 0) {
        tagsContainer.innerHTML = article.tags.map(tag => 
            `<span class="tag">${tag}</span>`
        ).join('');
    } else {
        tagsContainer.innerHTML = '<span class="text-muted">Теги не указаны</span>';
    }
    
    // Обложка
    const coverContainer = document.getElementById('articleCover');
    if (article.cover_image) {
        coverContainer.innerHTML = `
            <img src="${article.cover_image}" class="img-fluid rounded" alt="${article.title}">
        `;
    } else {
        coverContainer.innerHTML = '';
    }
    
    // Содержимое
    document.getElementById('articleText').innerHTML = article.content.replace(/\n/g, '<br>');
    
    // Информация об авторе
    displayAuthorInfo(article.author);
    
    // Комментарии
    displayComments(article.comments);
    
    // Счетчик комментариев
    document.getElementById('commentsCount').textContent = article.comments.length;
    
    // Кнопка добавления комментария доступна всем
    const addCommentBtn = document.getElementById('addCommentBtn');
    addCommentBtn.style.display = 'block';
}

// Отображение информации об авторе
function displayAuthorInfo(author) {
    const authorInfo = document.getElementById('authorInfo');
    authorInfo.innerHTML = `
        <div class="text-center">
            ${author.avatar ? `
                <img src="${author.avatar}" class="rounded-circle mb-3" alt="${author.name}" style="width: 80px; height: 80px;">
            ` : `
                <div class="bg-light rounded-circle d-flex align-items-center justify-content-center mb-3 mx-auto" style="width: 80px; height: 80px;">
                    <i class="fas fa-user fa-2x text-muted"></i>
                </div>
            `}
            <h6>${author.name}</h6>
            <p class="text-muted small">Автор статьи</p>
        </div>
    `;
}

// Отображение комментариев
function displayComments(comments) {
    const commentsList = document.getElementById('commentsList');
    
    if (comments.length === 0) {
        commentsList.innerHTML = `
            <div class="empty-state text-center py-4">
                <i class="fas fa-comments fa-2x text-muted mb-3"></i>
                <h5>Пока нет комментариев</h5>
                <p class="text-muted">Станьте первым, кто оставит комментарий к этой статье</p>
            </div>
        `;
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => `
        <div class="comment mb-3 p-3 border rounded">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="d-flex align-items-center">
                    ${comment.author.avatar ? `
                        <img src="${comment.author.avatar}" class="rounded-circle me-2" alt="${comment.author.name}" style="width: 32px; height: 32px;">
                    ` : `
                        <div class="bg-light rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px;">
                            <i class="fas fa-user text-muted"></i>
                        </div>
                    `}
                    <div>
                        <strong class="comment-author">${comment.author.name}</strong>
                        <small class="comment-date text-muted d-block">${formatDate(comment.created_at)}</small>
                    </div>
                </div>
                ${auth.isOwner(comment.author.id) ? `
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="editComment(${comment.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteComment(${comment.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
            <p class="mb-0">${comment.text}</p>
        </div>
    `).join('');
}

// Загрузка похожих статей
async function loadRelatedArticles(article) {
    try {
        // Получаем статьи с похожими тегами
        const response = await api.getArticles(1, { tag: article.tags[0] });
        const relatedArticles = response.articles.filter(a => a.id !== article.id).slice(0, 3);
        
        displayRelatedArticles(relatedArticles);
    } catch (error) {
        console.error('Ошибка загрузки похожих статей:', error);
        document.getElementById('relatedArticles').innerHTML = '<p class="text-muted">Не удалось загрузить похожие статьи</p>';
    }
}

// Отображение похожих статей
function displayRelatedArticles(articles) {
    const relatedContainer = document.getElementById('relatedArticles');
    
    if (articles.length === 0) {
        relatedContainer.innerHTML = '<p class="text-muted">Похожих статей не найдено</p>';
        return;
    }
    
    relatedContainer.innerHTML = articles.map(article => `
        <div class="related-article mb-3">
            <h6><a href="article.html?id=${article.id}" class="text-decoration-none">${article.title}</a></h6>
            <p class="small text-muted mb-2">${article.excerpt}</p>
            <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">${formatDate(article.created_at)}</small>
                <small class="text-muted">
                    <i class="fas fa-eye"></i> ${article.views}
                </small>
            </div>
        </div>
    `).join('');
}

// Открытие модального окна комментария
function openCommentModal() {
    // Показываем капчу и поле имени только для неавторизованных пользователей
    const captchaContainer = document.getElementById('captchaContainer');
    const anonymousNameContainer = document.getElementById('anonymousNameContainer');
    
    if (auth.isAuthenticated()) {
        captchaContainer.style.display = 'none';
        anonymousNameContainer.style.display = 'none';
    } else {
        captchaContainer.style.display = 'block';
        anonymousNameContainer.style.display = 'block';
        // Перезагружаем капчу
        if (typeof grecaptcha !== 'undefined') {
            grecaptcha.reset();
        }
    }
    
    const modal = new bootstrap.Modal(document.getElementById('commentModal'));
    modal.show();
}

// Отправка комментария
document.getElementById('commentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const text = document.getElementById('commentText').value.trim();
    
    if (!text) {
        alert('Пожалуйста, напишите комментарий');
        return;
    }
    
    // Проверяем капчу для неавторизованных пользователей
    if (!auth.isAuthenticated()) {
        const captchaResponse = grecaptcha.getResponse();
        if (!captchaResponse) {
            alert('Пожалуйста, пройдите проверку капчи');
            return;
        }
    }
    
    try {
        const commentData = {
            text: text,
            article_id: currentArticleId
        };
        
        // Добавляем имя только для неавторизованных пользователей (капча отключена)
        if (!auth.isAuthenticated()) {
            const anonymousName = document.getElementById('anonymousName').value.trim();
            if (!anonymousName) {
                alert('Пожалуйста, введите ваше имя');
                return;
            }
            
            commentData.anonymous_name = anonymousName;
        }
        
        await api.createComment(currentArticleId, commentData);
        
        showNotification('Комментарий успешно добавлен!', 'success');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('commentModal'));
        modal.hide();
        
        // Очищаем форму
        document.getElementById('commentText').value = '';
        document.getElementById('anonymousName').value = '';
        if (typeof grecaptcha !== 'undefined') {
            grecaptcha.reset();
        }
        
        // Обновляем статью
        loadArticle();
        
    } catch (error) {
        console.error('Ошибка при добавлении комментария:', error);
        alert('Ошибка при добавлении комментария: ' + error.message);
    }
});

// Редактирование комментария
async function editComment(commentId) {
    try {
        const comment = await api.getComment(commentId);
        
        const newText = prompt('Редактировать комментарий:', comment.text);
        if (newText === null || newText.trim() === '') return;
        
        await api.updateComment(commentId, { text: newText.trim() });
        
        showNotification('Комментарий успешно обновлен!', 'success');
        loadArticle();
        
    } catch (error) {
        console.error('Ошибка при редактировании комментария:', error);
        alert('Ошибка при редактировании комментария: ' + error.message);
    }
}

// Удаление комментария
async function deleteComment(commentId) {
    if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) {
        return;
    }
    
    try {
        await api.deleteComment(commentId);
        
        showNotification('Комментарий успешно удален!', 'success');
        loadArticle();
        
    } catch (error) {
        console.error('Ошибка при удалении комментария:', error);
        alert('Ошибка при удалении комментария: ' + error.message);
    }
}

// Поделиться статьей
function shareArticle() {
    if (navigator.share) {
        navigator.share({
            title: currentArticle.title,
            text: currentArticle.excerpt,
            url: window.location.href
        });
    } else {
        // Fallback - копируем ссылку в буфер обмена
        navigator.clipboard.writeText(window.location.href).then(() => {
            showNotification('Ссылка скопирована в буфер обмена!', 'success');
        }).catch(() => {
            alert('Ссылка на статью: ' + window.location.href);
        });
    }
}

// Показ ошибки
function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorState').querySelector('p').textContent = message;
}

// Показ уведомления
function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
