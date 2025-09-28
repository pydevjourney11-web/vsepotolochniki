// Основные функции для главной страницы
document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    loadCities();
    loadLatestArticles();
    loadLatestDiscussions();
    loadLatestReviews();
    setupSearchForm();
    setupCategoryCards();
    setupTabs();
});

// Загрузка категорий
async function loadCategories() {
    try {
        const categories = await api.getCategories();
        const categorySelect = document.getElementById('categorySelect');
        const categoryFilter = document.getElementById('categoryFilter');
        
        if (categorySelect) {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }
        
        if (categoryFilter) {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
        }
        
        // Отображаем категории на главной странице
        displayCategories(categories);
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
    }
}

// Загрузка городов
async function loadCities() {
    try {
        const cities = await api.getCities();
        const citySelect = document.getElementById('citySelect');
        const cityFilter = document.getElementById('cityFilter');
        
        if (citySelect) {
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        }
        
        if (cityFilter) {
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                cityFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки городов:', error);
    }
}

// Отображение категорий на главной странице
function displayCategories(categories) {
    const categoriesGrid = document.getElementById('categoriesGrid');
    if (!categoriesGrid) return;
    
    const popularCategories = categories.slice(0, 6); // Показываем только первые 6
    
    categoriesGrid.innerHTML = popularCategories.map(category => `
        <div class="col-md-4 mb-3">
            <div class="card category-card h-100 text-center">
                <div class="card-body">
                    <i class="fas fa-tag fa-2x text-primary mb-3"></i>
                    <h5 class="card-title">${category}</h5>
                    <a href="catalog.html?category=${encodeURIComponent(category)}" class="btn btn-outline-primary btn-sm">
                        Посмотреть
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

// Загрузка последних статей
async function loadLatestArticles() {
    try {
        const response = await api.getArticles(1, { per_page: 3 });
        displayLatestArticles(response.articles);
    } catch (error) {
        console.error('Ошибка загрузки статей:', error);
    }
}

// Отображение последних статей
function displayLatestArticles(articles) {
    const latestArticles = document.getElementById('latestArticles');
    if (!latestArticles) return;
    
    if (articles.length === 0) {
        latestArticles.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fas fa-newspaper"></i>
                    <h4>Статьи не найдены</h4>
                    <p>Пока что никто не написал статьи</p>
                </div>
            </div>
        `;
        return;
    }
    
    latestArticles.innerHTML = articles.map(article => `
        <div class="col-md-4 mb-4">
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
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-user"></i> ${article.author.name}
                        </small>
                        <small class="text-muted">
                            <i class="fas fa-eye"></i> ${article.views}
                        </small>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary btn-sm w-100" onclick="viewArticle(${article.id})">
                        Читать статью
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Настройка формы поиска
function setupSearchForm() {
    const searchForm = document.getElementById('searchForm');
    if (!searchForm) return;
    
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const query = document.getElementById('searchQuery').value.trim();
        
        if (query) {
            // Перенаправляем на страницу поиска
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        } else {
            // Если нет текстового запроса, идем в каталог с фильтрами
            const category = document.getElementById('categorySelect').value;
            const city = document.getElementById('citySelect').value;
            
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            if (city) params.append('city', city);
            
            window.location.href = `catalog.html?${params.toString()}`;
        }
    });
}

// Настройка карточек категорий
function setupCategoryCards() {
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const category = this.querySelector('.card-title').textContent;
            window.location.href = `catalog.html?category=${encodeURIComponent(category)}`;
        });
    });
}

// Просмотр статьи
function viewArticle(articleId) {
    // Открываем статью в модальном окне или переходим на страницу статьи
    window.location.href = `article.html?id=${articleId}`;
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

// Обработка ошибок
function handleError(error, context = '') {
    console.error(`Ошибка ${context}:`, error);
    showNotification(`Ошибка: ${error.message}`, 'danger');
}

// Проверка URL параметров
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        search: params.get('search') || '',
        category: params.get('category') || '',
        city: params.get('city') || '',
        page: parseInt(params.get('page')) || 1
    };
}

// Обновление URL без перезагрузки страницы
function updateUrl(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        if (params[key]) {
            url.searchParams.set(key, params[key]);
        } else {
            url.searchParams.delete(key);
        }
    });
    window.history.pushState({}, '', url);
}

// Загрузка последних обсуждений
async function loadLatestDiscussions() {
    try {
        // Пока загружаем статьи как обсуждения
        const response = await api.getArticles(1, { per_page: 3 });
        displayLatestDiscussions(response.articles);
    } catch (error) {
        console.error('Ошибка загрузки обсуждений:', error);
    }
}

// Отображение последних обсуждений
function displayLatestDiscussions(discussions) {
    const latestDiscussions = document.getElementById('latestDiscussions');
    if (!latestDiscussions) return;
    
    if (discussions.length === 0) {
        latestDiscussions.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h4>Обсуждения не найдены</h4>
                    <p>Пока что никто не начал обсуждения</p>
                </div>
            </div>
        `;
        return;
    }
    
    latestDiscussions.innerHTML = discussions.map(discussion => `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${discussion.title}</h5>
                    <p class="card-text">${discussion.excerpt}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-user"></i> ${discussion.author.name}
                        </small>
                        <small class="text-muted">
                            <i class="fas fa-comments"></i> ${discussion.comments?.length || 0}
                        </small>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-outline-primary btn-sm w-100" onclick="viewArticle(${discussion.id})">
                        Участвовать в обсуждении
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Загрузка последних отзывов
async function loadLatestReviews() {
    try {
        // Пока загружаем компании и их отзывы
        const response = await api.getCompanies(1, { per_page: 3 });
        displayLatestReviews(response.companies);
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
    }
}

// Отображение последних отзывов
function displayLatestReviews(companies) {
    const latestReviews = document.getElementById('latestReviews');
    if (!latestReviews) return;
    
    if (companies.length === 0) {
        latestReviews.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fas fa-star"></i>
                    <h4>Отзывы не найдены</h4>
                    <p>Пока что никто не оставил отзывы</p>
                </div>
            </div>
        `;
        return;
    }
    
    latestReviews.innerHTML = companies.map(company => `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        ${company.logo ? `
                            <img src="${company.logo}" class="company-logo me-3" alt="${company.name}">
                        ` : `
                            <div class="company-logo me-3 bg-light d-flex align-items-center justify-content-center">
                                <i class="fas fa-building text-muted"></i>
                            </div>
                        `}
                        <div>
                            <h6 class="mb-1">${company.name}</h6>
                            <div class="rating">
                                ${formatRating(company.rating)}
                                <span class="ms-1">(${company.review_count})</span>
                            </div>
                        </div>
                    </div>
                    <p class="text-muted mb-3">${company.category} • ${company.city}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-star"></i> ${company.rating.toFixed(1)}/5
                        </small>
                        <small class="text-muted">
                            <i class="fas fa-comments"></i> ${company.review_count} отзывов
                        </small>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-outline-primary btn-sm w-100" onclick="viewCompany(${company.id})">
                        Посмотреть отзывы
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Настройка вкладок
function setupTabs() {
    const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabButtons.forEach(button => {
        button.addEventListener('shown.bs.tab', function(event) {
            const target = event.target.getAttribute('data-bs-target');
            
            // Загружаем данные при переключении вкладок
            switch(target) {
                case '#discussions':
                    if (document.getElementById('latestDiscussions').innerHTML === '') {
                        loadLatestDiscussions();
                    }
                    break;
                case '#reviews':
                    if (document.getElementById('latestReviews').innerHTML === '') {
                        loadLatestReviews();
                    }
                    break;
            }
        });
    });
}

// Сброс фильтров поиска
function clearSearchFilters() {
    document.getElementById('searchQuery').value = '';
    document.getElementById('categorySelect').value = '';
    document.getElementById('citySelect').value = '';
    document.getElementById('ratingSelect').value = '';
    document.getElementById('priceSelect').value = '';
    document.getElementById('experienceSelect').value = '';
}

// Просмотр компании
function viewCompany(companyId) {
    window.location.href = `catalog.html?company=${companyId}`;
}
