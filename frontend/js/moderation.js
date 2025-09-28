// Функции для панели модерации
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем авторизацию и права администратора
    if (!auth.isAuthenticated()) {
        alert('Для доступа к панели модерации необходимо войти в систему');
        window.location.href = 'login.html';
        return;
    }
    
    if (!auth.hasRole('admin')) {
        alert('У вас нет прав для доступа к панели модерации');
        window.location.href = 'index.html';
        return;
    }
    
    // Обновляем UI
    auth.updateUI();
    
    // Загружаем данные
    loadPendingArticles();
    setupTabs();
});

// Настройка вкладок
function setupTabs() {
    const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabButtons.forEach(button => {
        button.addEventListener('shown.bs.tab', function(event) {
            const target = event.target.getAttribute('data-bs-target');
            
            // Загружаем данные при переключении вкладок
            switch(target) {
                case '#comments':
                    if (document.getElementById('pendingComments').innerHTML === '') {
                        loadPendingComments();
                    }
                    break;
                case '#reviews':
                    if (document.getElementById('pendingReviews').innerHTML === '') {
                        loadPendingReviews();
                    }
                    break;
                case '#companies':
                    if (document.getElementById('pendingCompanies').innerHTML === '') {
                        loadPendingCompanies();
                    }
                    break;
            }
        });
    });
}

// Загрузка статей на модерации
async function loadPendingArticles() {
    try {
        // Пока загружаем все статьи, потом можно добавить фильтр по статусу
        const response = await api.getArticles(1, { per_page: 50 });
        displayPendingArticles(response.articles);
    } catch (error) {
        handleError(error, 'загрузки статей');
    }
}

// Отображение статей на модерации
function displayPendingArticles(articles) {
    const container = document.getElementById('pendingArticles');
    
    if (articles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-newspaper"></i>
                <h4>Нет статей на модерации</h4>
                <p>Все статьи уже проверены</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = articles.map(article => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h6 class="mb-2">${article.title}</h6>
                        <p class="text-muted mb-2">${article.excerpt}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-user"></i> ${article.author.name}
                            </small>
                            <small class="text-muted">
                                <i class="fas fa-calendar"></i> ${formatDate(article.created_at)}
                            </small>
                        </div>
                    </div>
                    <div class="col-md-4 text-md-end">
                        <div class="btn-group">
                            <button class="btn btn-success btn-sm" onclick="moderateArticle(${article.id}, 'approved')">
                                <i class="fas fa-check"></i> Одобрить
                            </button>
                            <button class="btn btn-warning btn-sm" onclick="moderateArticle(${article.id}, 'pending')">
                                <i class="fas fa-clock"></i> На проверку
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="moderateArticle(${article.id}, 'rejected')">
                                <i class="fas fa-times"></i> Отклонить
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Компании на модерации
async function loadPendingCompanies() {
    try {
        const response = await api.getPendingCompanies('pending');
        const container = document.getElementById('pendingCompanies');
        if (!response.companies || response.companies.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-building"></i>
                    <h4>Нет компаний на модерации</h4>
                </div>
            `;
            return;
        }
        container.innerHTML = response.companies.map(c => `
            <div class="card mb-3">
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${c.name}</strong>
                        <div class="text-muted">${c.category} · ${c.city}</div>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-success btn-sm" onclick="moderateCompany(${c.id}, 'approved')"><i class="fas fa-check"></i></button>
                        <button class="btn btn-warning btn-sm" onclick="moderateCompany(${c.id}, 'pending')"><i class="fas fa-clock"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="moderateCompany(${c.id}, 'rejected')"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        handleError(error, 'загрузки компаний на модерации');
    }
}

async function moderateCompany(id, status) {
    try {
        if (!auth.hasRole('admin')) {
            showNotification('У вас нет прав для модерации', 'error');
            return;
        }
        await api.moderateCompany(id, status);
        showNotification('Статус компании обновлен', 'success');
        loadPendingCompanies();
    } catch (error) {
        handleError(error, 'модерации компании');
    }
}

// Загрузка комментариев на модерации
async function loadPendingComments() {
    try {
        // TODO: Добавить API для получения комментариев на модерации
        const container = document.getElementById('pendingComments');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h4>Нет комментариев на модерации</h4>
                <p>Все комментарии уже проверены</p>
            </div>
        `;
    } catch (error) {
        handleError(error, 'загрузки комментариев');
    }
}

// Загрузка отзывов на модерации
async function loadPendingReviews() {
    try {
        // TODO: Добавить API для получения отзывов на модерации
        const container = document.getElementById('pendingReviews');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <h4>Нет отзывов на модерации</h4>
                <p>Все отзывы уже проверены</p>
            </div>
        `;
    } catch (error) {
        handleError(error, 'загрузки отзывов');
    }
}

// Модерация статьи
async function moderateArticle(articleId, status) {
    const statusText = {
        'approved': 'одобрить',
        'pending': 'отправить на проверку',
        'rejected': 'отклонить'
    };
    
    if (!confirm(`Вы уверены, что хотите ${statusText[status]} эту статью?`)) {
        return;
    }
    
    try {
        // Проверяем права администратора
        if (!auth.hasRole('admin')) {
            showNotification('У вас нет прав для модерации', 'error');
            return;
        }
        
        // Обновляем статус статьи через API модерации
        await api.moderateArticle(articleId, status);
        
        showNotification(`Статья ${statusText[status]}!`, 'success');
        
        // Обновляем список
        loadPendingArticles();
        
    } catch (error) {
        handleError(error, 'модерации статьи');
    }
}

// Модерация комментария
async function moderateComment(commentId, status) {
    const statusText = {
        'approved': 'одобрить',
        'pending': 'отправить на проверку',
        'rejected': 'отклонить'
    };
    
    if (!confirm(`Вы уверены, что хотите ${statusText[status]} этот комментарий?`)) {
        return;
    }
    
    try {
        // TODO: Добавить API для модерации комментариев
        await api.updateComment(commentId, { status: status });
        
        showNotification(`Комментарий ${statusText[status]}!`, 'success');
        
        // Обновляем список
        loadPendingComments();
        
    } catch (error) {
        handleError(error, 'модерации комментария');
    }
}

// Модерация отзыва
async function moderateReview(reviewId, status) {
    const statusText = {
        'approved': 'одобрить',
        'pending': 'отправить на проверку',
        'rejected': 'отклонить'
    };
    
    if (!confirm(`Вы уверены, что хотите ${statusText[status]} этот отзыв?`)) {
        return;
    }
    
    try {
        // TODO: Добавить API для модерации отзывов
        await api.updateReview(reviewId, { status: status });
        
        showNotification(`Отзыв ${statusText[status]}!`, 'success');
        
        // Обновляем список
        loadPendingReviews();
        
    } catch (error) {
        handleError(error, 'модерации отзыва');
    }
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Обработка ошибок
function handleError(error, action) {
    console.error(`Ошибка ${action}:`, error);
    alert(`Ошибка ${action}: ${error.message}`);
}

// Показ уведомлений
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
