// Функции для страницы форума
let currentPage = 1;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', function() {
    loadTags();
    loadPopularTags();
    setupFilters();
    loadArticles();
});

// Настройка фильтров
function setupFilters() {
    const filterForm = document.getElementById('forumFilterForm');
    if (!filterForm) return;
    
    // Загружаем параметры из URL
    const urlParams = getUrlParams();
    currentFilters = {
        search: urlParams.search,
        tag: urlParams.tag
    };
    
    // Заполняем форму фильтрами из URL
    if (urlParams.search) {
        document.getElementById('forumSearch').value = urlParams.search;
    }
    if (urlParams.tag) {
        document.getElementById('tagFilter').value = urlParams.tag;
    }
    
    filterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        applyFilters();
    });
}

// Применение фильтров
function applyFilters() {
    currentFilters = {
        search: document.getElementById('forumSearch').value,
        tag: document.getElementById('tagFilter').value
    };
    
    currentPage = 1;
    loadArticles();
    updateUrl(currentFilters);
}

// Сброс фильтров
function clearForumFilters() {
    document.getElementById('forumSearch').value = '';
    document.getElementById('tagFilter').value = '';
    
    currentFilters = {};
    currentPage = 1;
    loadArticles();
    updateUrl({});
}

// Загрузка тегов
async function loadTags() {
    try {
        const tags = await api.getTags();
        const tagFilter = document.getElementById('tagFilter');
        
        if (tagFilter) {
            tags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                tagFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки тегов:', error);
    }
}

// Загрузка популярных тегов
async function loadPopularTags() {
    try {
        const tags = await api.getTags();
        displayPopularTags(tags.slice(0, 10)); // Показываем первые 10
    } catch (error) {
        console.error('Ошибка загрузки популярных тегов:', error);
    }
}

// Отображение популярных тегов
function displayPopularTags(tags) {
    const popularTags = document.getElementById('popularTags');
    if (!popularTags) return;
    
    popularTags.innerHTML = tags.map(tag => `
        <span class="tag me-1 mb-1" style="cursor: pointer;" onclick="filterByTag('${tag}')">
            ${tag}
        </span>
    `).join('');
}

// Фильтрация по тегу
function filterByTag(tag) {
    document.getElementById('tagFilter').value = tag;
    applyFilters();
}

// Загрузка статей
async function loadArticles() {
    try {
        const response = await api.getArticles(currentPage, currentFilters);
        displayArticles(response.articles);
        setupPagination(response);
    } catch (error) {
        handleError(error, 'загрузки статей');
    }
}

// Отображение статей
function displayArticles(articles) {
    const articlesList = document.getElementById('articlesList');
    if (!articlesList) return;
    
    if (articles.length === 0) {
        articlesList.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fas fa-newspaper"></i>
                    <h4>Статьи не найдены</h4>
                    <p>Попробуйте изменить параметры поиска</p>
                </div>
            </div>
        `;
        return;
    }
    
    articlesList.innerHTML = articles.map(article => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card article-card h-100">
                ${article.cover_image ? `
                    <img src="${article.cover_image}" class="card-img-top article-cover" alt="${article.title}">
                ` : ''}
                <div class="card-body">
                    <h5 class="card-title">${article.title}</h5>
                    <p class="card-text">${article.excerpt}</p>
                    
                    <div class="article-tags mb-3">
                        ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <small class="text-muted">
                            <i class="fas fa-user"></i> ${article.author.name}
                        </small>
                        <small class="text-muted">
                            <i class="fas fa-eye"></i> ${article.views}
                        </small>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">${formatDate(article.created_at)}</small>
                        <span class="badge bg-primary">${article.comment_count} комментариев</span>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="d-flex gap-2">
                        <button class="btn btn-primary btn-sm flex-grow-1" onclick="viewArticle(${article.id})">
                            Читать статью
                        </button>
                        ${auth.isAdmin() ? `
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteArticleFromForum(${article.id})" title="Удалить статью">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Настройка пагинации
function setupPagination(response) {
    const pagination = document.getElementById('forumPagination');
    if (!pagination) return;
    
    const totalPages = response.pages;
    const currentPageNum = response.current_page;
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Предыдущая страница
    if (currentPageNum > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${currentPageNum - 1})">Предыдущая</a>
            </li>
        `;
    }
    
    // Номера страниц
    const startPage = Math.max(1, currentPageNum - 2);
    const endPage = Math.min(totalPages, currentPageNum + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPageNum ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }
    
    // Следующая страница
    if (currentPageNum < totalPages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${currentPageNum + 1})">Следующая</a>
            </li>
        `;
    }
    
    pagination.innerHTML = paginationHTML;
}

// Смена страницы
function changePage(page) {
    currentPage = page;
    loadArticles();
    updateUrl({ ...currentFilters, page });
}

// Просмотр статьи
async function viewArticle(articleId) {
    try {
        const article = await api.getArticle(articleId);
        showArticleModal(article);
    } catch (error) {
        handleError(error, 'загрузки статьи');
    }
}

// Показ модального окна статьи
function showArticleModal(article) {
    const modalTitle = document.getElementById('articleModalTitle');
    const modalBody = document.getElementById('articleModalBody');
    
    modalTitle.textContent = article.title;
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-12">
                ${article.cover_image ? `
                    <img src="${article.cover_image}" class="img-fluid rounded mb-4" alt="${article.title}">
                ` : ''}
                
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <strong>${article.author.name}</strong>
                        <small class="text-muted ms-2">${formatDate(article.created_at)}</small>
                    </div>
                    <div>
                        <i class="fas fa-eye"></i> ${article.views} просмотров
                    </div>
                </div>
                
                <div class="article-tags mb-4">
                    ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                
                <div class="article-content mb-4">
                    ${article.content.replace(/\n/g, '<br>')}
                </div>
                
                <hr>
                
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5>Комментарии (${article.comments.length})</h5>
                    <button class="btn btn-primary btn-sm" onclick="openCommentModal(${article.id})">
                        <i class="fas fa-plus"></i> Добавить комментарий
                    </button>
                </div>
                
                <div id="articleComments">
                    ${article.comments.map(comment => `
                        <div class="comment">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <strong class="comment-author">${comment.author.name}</strong>
                                    <small class="comment-date ms-2">${formatDate(comment.created_at)}</small>
                                </div>
                                ${auth.isOwner(comment.author.id) || auth.isAdmin() ? `
                                    <div class="btn-group btn-group-sm">
                                        ${auth.isOwner(comment.author.id) ? `
                                            <button class="btn btn-outline-primary" onclick="editComment(${comment.id})">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-outline-danger" onclick="deleteComment(${comment.id})">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                            <p class="mb-0">${comment.text}</p>
                            ${comment.photos && comment.photos.length > 0 ? `
                                <div class="comment-photos mt-2">
                                    ${comment.photos.map(photo => `
                                        <img src="/static/uploads/${photo}" alt="Фото комментария" class="comment-photo me-2 mb-2" style="max-width: 150px; max-height: 150px; object-fit: cover; border-radius: 8px; cursor: pointer;" onclick="openPhotoModal('/static/uploads/${photo}')">
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('articleModal'));
    modal.show();
}

// Открытие модального окна комментария
function openCommentModal(articleId) {
    document.getElementById('commentArticleId').value = articleId;
    
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
    
    const articleId = document.getElementById('commentArticleId').value;
    const text = document.getElementById('commentText').value;
    
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
            article_id: articleId,
            photos: [] // Массив для фотографий
        };
        
        // Загружаем фотографии если есть
        const photoFiles = document.getElementById('commentPhotos').files;
        if (photoFiles.length > 0) {
            try {
                const uploadResult = await api.uploadPhotos(photoFiles);
                commentData.photos = uploadResult.files;
                console.log('📸 Фотографии загружены:', uploadResult.files);
            } catch (error) {
                console.error('Ошибка загрузки фотографий:', error);
                alert('Ошибка загрузки фотографий: ' + error.message);
                return;
            }
        }
        
        // Добавляем имя только для неавторизованных пользователей (капча отключена)
        if (!auth.isAuthenticated()) {
            const anonymousName = document.getElementById('anonymousName').value.trim();
            if (!anonymousName) {
                alert('Пожалуйста, введите ваше имя');
                return;
            }
            
            commentData.anonymous_name = anonymousName;
        }
        
        await api.createComment(articleId, commentData);
        
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
        viewArticle(articleId);
        
    } catch (error) {
        handleError(error, 'добавления комментария');
    }
});

// Редактирование комментария
function editComment(commentId) {
    // TODO: Реализовать редактирование комментария
    alert('Функция редактирования комментария будет реализована позже');
}

// Удаление комментария
async function deleteComment(commentId) {
    if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) {
        return;
    }
    
    try {
        await api.deleteComment(commentId);
        showNotification('Комментарий успешно удален!', 'success');
        
        // Обновляем статью
        const articleId = document.getElementById('commentArticleId').value;
        if (articleId) {
            viewArticle(articleId);
        }
    } catch (error) {
        handleError(error, 'удаления комментария');
    }
}

// Получение параметров из URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        search: params.get('search') || '',
        tag: params.get('tag') || '',
        page: params.get('page') || 1
    };
}

// Обновление URL
function updateUrl(filters) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
        if (filters[key]) {
            params.set(key, filters[key]);
        }
    });
    
    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.pushState({}, '', newUrl);
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

// Форматирование рейтинга
function formatRating(rating) {
    const stars = Math.round(rating);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

// Открытие модального окна с фотографией
function openPhotoModal(photoUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Фотография</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center">
                    <img src="${photoUrl}" class="img-fluid" alt="Фотография">
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
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

// Предварительный просмотр фотографий
function setupPhotoPreview() {
    const photoInput = document.getElementById('commentPhotos');
    const previewContainer = document.getElementById('photoPreview');
    
    if (!photoInput || !previewContainer) return;
    
    photoInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        
        // Очищаем предыдущий предварительный просмотр
        previewContainer.innerHTML = '';
        
        // Проверяем количество файлов
        if (files.length > 5) {
            alert('Максимум 5 фотографий!');
            photoInput.value = '';
            return;
        }
        
        // Проверяем размер файлов
        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`Файл ${file.name} слишком большой! Максимум 5MB.`);
                photoInput.value = '';
                return;
            }
        });
        
        // Создаем предварительный просмотр
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'photo-preview me-2 mb-2 d-inline-block';
                previewDiv.innerHTML = `
                    <div class="position-relative">
                        <img src="${e.target.result}" class="img-thumbnail" style="width: 80px; height: 80px; object-fit: cover;">
                        <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0" style="transform: translate(50%, -50%);" onclick="removePhotoPreview(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                previewContainer.appendChild(previewDiv);
            };
            reader.readAsDataURL(file);
        });
    });
}

// Удаление фотографии из предварительного просмотра
function removePhotoPreview(index) {
    const photoInput = document.getElementById('commentPhotos');
    const dt = new DataTransfer();
    const files = Array.from(photoInput.files);
    
    files.forEach((file, i) => {
        if (i !== index) {
            dt.items.add(file);
        }
    });
    
    photoInput.files = dt.files;
    
    // Перезапускаем событие change для обновления предварительного просмотра
    photoInput.dispatchEvent(new Event('change'));
}

// Удаление статьи из форума (только для админов)
async function deleteArticleFromForum(articleId) {
    if (!confirm('Вы уверены, что хотите удалить эту статью? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        await api.deleteArticle(articleId);
        showNotification('Статья успешно удалена', 'success');
        loadArticles(); // Перезагружаем список статей
    } catch (error) {
        handleError(error, 'удаления статьи');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    setupPhotoPreview();
});