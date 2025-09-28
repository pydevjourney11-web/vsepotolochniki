// Функции для страницы профиля
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем авторизацию
    if (!auth.isAuthenticated()) {
        alert('Для просмотра профиля необходимо войти в систему');
        window.location.href = 'login.html';
        return;
    }
    
    loadUserProfile();
    loadUserCompanies();
    setupTabNavigation();
    setupEditForms();
});

// Загрузка профиля пользователя
async function loadUserProfile() {
    try {
        const user = await api.getProfile();
        displayUserProfile(user);
    } catch (error) {
        handleError(error, 'загрузки профиля');
    }
}

// Отображение профиля пользователя
function displayUserProfile(user) {
    const userName = document.getElementById('userProfileName');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) userName.textContent = user.name;
    if (userEmail) userEmail.textContent = user.email;
    if (userAvatar) {
        userAvatar.src = user.avatar || 'https://via.placeholder.com/100';
    }
}

// Загрузка компаний пользователя
async function loadUserCompanies() {
    try {
        const response = await api.getCompanies(1, { owner_id: auth.getCurrentUser().id });
        displayUserCompanies(response.companies);
    } catch (error) {
        handleError(error, 'загрузки компаний пользователя');
    }
}

// Отображение компаний пользователя
function displayUserCompanies(companies) {
    const userCompanies = document.getElementById('userCompanies');
    if (!userCompanies) return;
    
    if (companies.length === 0) {
        userCompanies.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-building"></i>
                <h4>У вас пока нет компаний</h4>
                <p>Добавьте свою первую компанию в каталог</p>
                <a href="add-company.html" class="btn btn-primary">Добавить компанию</a>
            </div>
        `;
        return;
    }
    
    userCompanies.innerHTML = companies.map(company => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center">
                            ${company.logo ? `
                                <img src="${company.logo}" class="company-logo me-3" alt="${company.name}">
                            ` : `
                                <div class="company-logo me-3 bg-light d-flex align-items-center justify-content-center">
                                    <i class="fas fa-building text-muted"></i>
                                </div>
                            `}
                            <div>
                                <h5 class="mb-1">${company.name}</h5>
                                <p class="text-muted mb-1">${company.category} • ${company.city}</p>
                                <div class="d-flex align-items-center mb-2">
                                    <div class="rating me-3">
                                        ${formatRating(company.rating)}
                                        <span class="ms-1">(${company.review_count})</span>
                                    </div>
                                    <span class="badge ${getStatusBadgeClass(company.status)}">${getStatusText(company.status)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 text-md-end">
                        <div class="btn-group">
                            <button class="btn btn-outline-primary btn-sm" onclick="editCompany(${company.id})">
                                <i class="fas fa-edit"></i> Редактировать
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteCompany(${company.id})">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Настройка навигации по вкладкам
function setupTabNavigation() {
    const tabLinks = document.querySelectorAll('[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetTab = this.getAttribute('data-tab');
            
            // Убираем активный класс со всех ссылок
            tabLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Скрываем все вкладки
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            
            // Показываем нужную вкладку
            const targetContent = document.getElementById(targetTab + 'Tab');
            if (targetContent) {
                targetContent.style.display = 'block';
                
                // Загружаем данные для вкладки
                switch(targetTab) {
                    case 'reviews':
                        loadUserReviews();
                        break;
                    case 'articles':
                        loadUserArticles();
                        break;
                }
            }
        });
    });
}

// Загрузка отзывов пользователя
async function loadUserReviews() {
    try {
        const response = await api.getUserReviews();
        displayUserReviews(response.reviews);
    } catch (error) {
        handleError(error, 'загрузки отзывов пользователя');
    }
}

// Отображение отзывов пользователя
function displayUserReviews(reviews) {
    const userReviews = document.getElementById('userReviews');
    if (!userReviews) return;
    
    if (reviews.length === 0) {
        userReviews.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <h4>У вас пока нет отзывов</h4>
                <p>Оставьте свой первый отзыв о компании</p>
            </div>
        `;
        return;
    }
    
    userReviews.innerHTML = reviews.map(review => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h6 class="mb-2">${review.company.name}</h6>
                        <div class="rating mb-2">${formatRating(review.rating)}</div>
                        <p class="mb-2">${review.text}</p>
                        <small class="text-muted">${formatDate(review.created_at)}</small>
                    </div>
                    <div class="col-md-4 text-md-end">
                        <div class="btn-group">
                            <button class="btn btn-outline-primary btn-sm" onclick="editReview(${review.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteReview(${review.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Загрузка статей пользователя
async function loadUserArticles() {
    try {
        const response = await api.getArticles(1, { author_id: auth.getCurrentUser().id });
        displayUserArticles(response.articles);
    } catch (error) {
        handleError(error, 'загрузки статей пользователя');
    }
}

// Отображение статей пользователя
function displayUserArticles(articles) {
    const userArticles = document.getElementById('userArticles');
    if (!userArticles) return;
    
    if (articles.length === 0) {
        userArticles.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-newspaper"></i>
                <h4>У вас пока нет статей</h4>
                <p>Напишите свою первую статью</p>
                <a href="add-article.html" class="btn btn-primary">Написать статью</a>
            </div>
        `;
        return;
    }
    
    userArticles.innerHTML = articles.map(article => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h5 class="mb-2">${article.title}</h5>
                        <p class="text-muted mb-2">${article.excerpt}</p>
                        <div class="article-tags mb-2">
                            ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                        <small class="text-muted">
                            <i class="fas fa-eye"></i> ${article.views} просмотров • 
                            ${formatDate(article.created_at)}
                        </small>
                    </div>
                    <div class="col-md-4 text-md-end">
                        <div class="btn-group">
                            <button class="btn btn-outline-primary btn-sm" onclick="editArticle(${article.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteArticle(${article.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Настройка форм редактирования
function setupEditForms() {
    // Форма редактирования профиля
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('editName').value;
            const avatar = document.getElementById('editAvatar').value;
            
            try {
                await api.updateProfile({ name, avatar });
                showNotification('Профиль успешно обновлен!', 'success');
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
                modal.hide();
                
                loadUserProfile();
            } catch (error) {
                handleError(error, 'обновления профиля');
            }
        });
    }
    
    // Форма редактирования компании
    const editCompanyForm = document.getElementById('editCompanyForm');
    if (editCompanyForm) {
        editCompanyForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const companyId = document.getElementById('editCompanyId').value;
            const data = {
                name: document.getElementById('editCompanyName').value,
                category: document.getElementById('editCompanyCategory').value,
                city: document.getElementById('editCompanyCity').value,
                address: document.getElementById('editCompanyAddress').value,
                phone: document.getElementById('editCompanyPhone').value,
                website: document.getElementById('editCompanyWebsite').value,
                logo: document.getElementById('editCompanyLogo').value,
                description: document.getElementById('editCompanyDescription').value
            };
            
            try {
                await api.updateCompany(companyId, data);
                showNotification('Компания успешно обновлена!', 'success');
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('editCompanyModal'));
                modal.hide();
                
                loadUserCompanies();
            } catch (error) {
                handleError(error, 'обновления компании');
            }
        });
    }
    
    // Форма редактирования отзыва
    const editReviewForm = document.getElementById('editReviewForm');
    if (editReviewForm) {
        editReviewForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const reviewId = document.getElementById('editReviewId').value;
            const activeStars = document.querySelectorAll('#editReviewModal .rating-input .active');
            const rating = activeStars.length;
            const text = document.getElementById('editReviewText').value.trim();
            
            if (!rating) {
                alert('Пожалуйста, выберите оценку');
                return;
            }
            
            if (!text) {
                alert('Пожалуйста, напишите отзыв');
                return;
            }
            
            try {
                await api.updateReview(reviewId, { rating, text });
                showNotification('Отзыв успешно обновлен!', 'success');
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('editReviewModal'));
                modal.hide();
                
                loadUserReviews();
            } catch (error) {
                handleError(error, 'обновления отзыва');
            }
        });
    }
    
    // Настройка рейтинга для модального окна редактирования отзыва
    setupRatingInput('#editReviewModal .rating-input');
}

// Настройка рейтинга
function setupRatingInput(selector) {
    const ratingInputs = document.querySelectorAll(selector);
    ratingInputs.forEach(ratingInput => {
        const stars = ratingInput.querySelectorAll('i');
        let selectedRating = 0;
        
        stars.forEach((star, index) => {
            star.addEventListener('click', function() {
                selectedRating = index + 1;
                updateRatingDisplay(stars, selectedRating);
            });
            
            star.addEventListener('mouseenter', function() {
                updateRatingDisplay(stars, index + 1);
            });
        });
        
        ratingInput.addEventListener('mouseleave', function() {
            updateRatingDisplay(stars, selectedRating);
        });
    });
}

// Обновление отображения рейтинга
function updateRatingDisplay(stars, rating) {
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Редактирование профиля
function editProfile() {
    const user = auth.getCurrentUser();
    document.getElementById('editName').value = user.name;
    document.getElementById('editAvatar').value = user.avatar || '';
    
    const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
    modal.show();
}

// Редактирование компании
async function editCompany(companyId) {
    try {
        const company = await api.getCompany(companyId);
        
        document.getElementById('editCompanyId').value = company.id;
        document.getElementById('editCompanyName').value = company.name;
        document.getElementById('editCompanyCategory').value = company.category;
        document.getElementById('editCompanyCity').value = company.city;
        document.getElementById('editCompanyAddress').value = company.address || '';
        document.getElementById('editCompanyPhone').value = company.phone || '';
        document.getElementById('editCompanyWebsite').value = company.website || '';
        document.getElementById('editCompanyLogo').value = company.logo || '';
        document.getElementById('editCompanyDescription').value = company.description || '';
        
        const modal = new bootstrap.Modal(document.getElementById('editCompanyModal'));
        modal.show();
    } catch (error) {
        handleError(error, 'загрузки данных компании');
    }
}

// Удаление компании
async function deleteCompany(companyId) {
    if (!confirm('Вы уверены, что хотите удалить эту компанию?')) {
        return;
    }
    
    try {
        await api.deleteCompany(companyId);
        showNotification('Компания успешно удалена!', 'success');
        loadUserCompanies();
    } catch (error) {
        handleError(error, 'удаления компании');
    }
}

// Редактирование отзыва
async function editReview(reviewId) {
    try {
        const response = await api.getReview(reviewId);
        const review = response.review;
        
        // Заполняем форму данными отзыва
        document.getElementById('editReviewId').value = review.id;
        document.getElementById('editReviewText').value = review.text || '';
        
        // Устанавливаем рейтинг
        const ratingStars = document.querySelectorAll('#editReviewModal .rating-input i');
        ratingStars.forEach((star, index) => {
            if (index < review.rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        
        const modal = new bootstrap.Modal(document.getElementById('editReviewModal'));
        modal.show();
    } catch (error) {
        handleError(error, 'загрузки данных отзыва');
    }
}

// Удаление отзыва
async function deleteReview(reviewId) {
    if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) {
        return;
    }
    
    try {
        await api.deleteReview(reviewId);
        showNotification('Отзыв успешно удален!', 'success');
        loadUserReviews();
    } catch (error) {
        handleError(error, 'удаления отзыва');
    }
}

// Редактирование статьи
function editArticle(articleId) {
    // TODO: Реализовать редактирование статьи
    alert('Функция редактирования статьи будет реализована позже');
}

// Удаление статьи
async function deleteArticle(articleId) {
    if (!confirm('Вы уверены, что хотите удалить эту статью?')) {
        return;
    }
    
    try {
        await api.deleteArticle(articleId);
        showNotification('Статья успешно удалена!', 'success');
        loadUserArticles();
    } catch (error) {
        handleError(error, 'удаления статьи');
    }
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// Получение CSS класса для статуса
function getStatusBadgeClass(status) {
    switch(status) {
        case 'approved': return 'bg-success';
        case 'pending': return 'bg-warning';
        case 'rejected': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Получение текста статуса
function getStatusText(status) {
    switch(status) {
        case 'approved': return 'Одобрено';
        case 'pending': return 'На модерации';
        case 'rejected': return 'Отклонено';
        default: return 'Неизвестно';
    }
}

// Форматирование рейтинга
function formatRating(rating) {
    const stars = Math.round(rating);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

// Обработка ошибок
function handleError(error, action) {
    console.error(`Ошибка ${action}:`, error);
    alert(`Ошибка ${action}: ${error.message}`);
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
