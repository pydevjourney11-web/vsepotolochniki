// Поиск
let currentQuery = '';
let currentPage = 1;
let currentType = 'all';
let searchTimeout;

document.addEventListener('DOMContentLoaded', function() {
    auth.updateUI();
    setupSearchForm();
    setupSearchInput();
    
    // Проверяем URL параметры
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    const type = urlParams.get('type') || 'all';
    
    if (query) {
        document.getElementById('searchInput').value = query;
        document.getElementById('typeFilter').value = type;
        performSearch(query, 1, type);
    }
});

function setupSearchForm() {
    const searchForm = document.getElementById('searchForm');
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const query = document.getElementById('searchInput').value.trim();
        const type = document.getElementById('typeFilter').value;
        
        if (query) {
            performSearch(query, 1, type);
            // Обновляем URL
            const url = new URL(window.location);
            url.searchParams.set('q', query);
            url.searchParams.set('type', type);
            window.history.pushState({}, '', url);
        }
    });
}

function setupSearchInput() {
    const searchInput = document.getElementById('searchInput');
    const suggestions = document.getElementById('suggestions');
    
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Очищаем предыдущий таймер
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        if (query.length >= 2) {
            // Задержка перед запросом предложений
            searchTimeout = setTimeout(() => {
                loadSuggestions(query);
            }, 300);
        } else {
            suggestions.style.display = 'none';
        }
    });
    
    // Скрываем предложения при клике вне поля
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });
}

async function loadSuggestions(query) {
    try {
        const response = await api.getSearchSuggestions(query);
        displaySuggestions(response.suggestions);
    } catch (error) {
        console.error('Ошибка загрузки предложений:', error);
    }
}

function displaySuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('suggestions');
    
    if (suggestions.length === 0) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    suggestionsContainer.innerHTML = suggestions.map(suggestion => {
        const icon = getSuggestionIcon(suggestion.type);
        return `
            <a href="#" class="list-group-item list-group-item-action suggestion-item" 
               data-text="${suggestion.text}" data-type="${suggestion.type}">
                <i class="${icon} me-2"></i>
                <strong>${suggestion.text}</strong>
                <small class="text-muted ms-2">${getSuggestionDescription(suggestion)}</small>
            </a>
        `;
    }).join('');
    
    // Добавляем обработчики кликов
    suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const text = this.dataset.text;
            const type = this.dataset.type;
            
            document.getElementById('searchInput').value = text;
            document.getElementById('typeFilter').value = type;
            suggestionsContainer.style.display = 'none';
            
            performSearch(text, 1, type);
            
            // Обновляем URL
            const url = new URL(window.location);
            url.searchParams.set('q', text);
            url.searchParams.set('type', type);
            window.history.pushState({}, '', url);
        });
    });
    
    suggestionsContainer.style.display = 'block';
}

function getSuggestionIcon(type) {
    switch(type) {
        case 'company': return 'fas fa-building';
        case 'article': return 'fas fa-newspaper';
        case 'category': return 'fas fa-tags';
        case 'city': return 'fas fa-map-marker-alt';
        default: return 'fas fa-search';
    }
}

function getSuggestionDescription(suggestion) {
    switch(suggestion.type) {
        case 'company': return `${suggestion.category} • ${suggestion.city}`;
        case 'article': return `Статья • ${suggestion.author}`;
        case 'category': return 'Категория';
        case 'city': return 'Город';
        default: return '';
    }
}

async function performSearch(query, page = 1, type = 'all') {
    currentQuery = query;
    currentPage = page;
    currentType = type;
    
    try {
        showLoading();
        const response = await api.search(query, page, type);
        displaySearchResults(response);
        setupPagination(response);
    } catch (error) {
        showError('Ошибка поиска: ' + error.message);
    }
}

function displaySearchResults(response) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (response.total === 0) {
        resultsContainer.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-search fa-3x mb-3"></i>
                <h4>Ничего не найдено</h4>
                <p>Попробуйте изменить запрос или использовать другие ключевые слова</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="mb-3">
            <h4>Результаты поиска: "${response.query}"</h4>
            <p class="text-muted">Найдено: ${response.total} результатов</p>
        </div>
    `;
    
    // Компании
    if (response.companies.length > 0) {
        html += `
            <div class="mb-4">
                <h5><i class="fas fa-building me-2"></i>Компании (${response.companies.length})</h5>
                <div class="row">
                    ${response.companies.map(company => `
                        <div class="col-md-6 col-lg-4 mb-3">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6 class="card-title">${company.name}</h6>
                                    <p class="card-text text-muted small">${company.category} • ${company.city}</p>
                                    <p class="card-text">${company.description.substring(0, 100)}...</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div class="rating">
                                            ${formatRating(company.rating)}
                                            <span class="ms-1">(${company.review_count})</span>
                                        </div>
                                        <a href="company.html?id=${company.id}" class="btn btn-sm btn-outline-primary">
                                            Подробнее
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Статьи
    if (response.articles.length > 0) {
        html += `
            <div class="mb-4">
                <h5><i class="fas fa-newspaper me-2"></i>Статьи (${response.articles.length})</h5>
                <div class="row">
                    ${response.articles.map(article => `
                        <div class="col-md-6 col-lg-4 mb-3">
                            <div class="card h-100">
                                ${article.cover_image ? `<img src="${article.cover_image}" class="card-img-top" style="height: 200px; object-fit: cover;">` : ''}
                                <div class="card-body">
                                    <h6 class="card-title">${article.title}</h6>
                                    <p class="card-text">${article.excerpt}</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <small class="text-muted">
                                            <i class="fas fa-user me-1"></i>${article.author.name}
                                            <i class="fas fa-eye ms-2 me-1"></i>${article.views}
                                        </small>
                                        <a href="article.html?id=${article.id}" class="btn btn-sm btn-outline-primary">
                                            Читать
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Отзывы
    if (response.reviews.length > 0) {
        html += `
            <div class="mb-4">
                <h5><i class="fas fa-star me-2"></i>Отзывы (${response.reviews.length})</h5>
                <div class="row">
                    ${response.reviews.map(review => `
                        <div class="col-md-6 col-lg-4 mb-3">
                            <div class="card h-100">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <h6 class="card-title mb-0">${review.company.name}</h6>
                                        <div class="rating">${formatRating(review.rating)}</div>
                                    </div>
                                    <p class="card-text">${review.text.substring(0, 150)}...</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <small class="text-muted">
                                            <i class="fas fa-user me-1"></i>${review.author.name}
                                        </small>
                                        <a href="company.html?id=${review.company.id}" class="btn btn-sm btn-outline-primary">
                                            К компании
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    resultsContainer.innerHTML = html;
}

function setupPagination(response) {
    const pagination = document.getElementById('pagination');
    const paginationList = pagination.querySelector('.pagination');
    
    if (response.total <= 10) {
        pagination.style.display = 'none';
        return;
    }
    
    const totalPages = Math.ceil(response.total / 10);
    let html = '';
    
    // Предыдущая страница
    if (currentPage > 1) {
        html += `<li class="page-item">
            <a class="page-link" href="#" onclick="performSearch('${currentQuery}', ${currentPage - 1}, '${currentType}')">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>`;
    }
    
    // Страницы
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="performSearch('${currentQuery}', ${i}, '${currentType}')">${i}</a>
        </li>`;
    }
    
    // Следующая страница
    if (currentPage < totalPages) {
        html += `<li class="page-item">
            <a class="page-link" href="#" onclick="performSearch('${currentQuery}', ${currentPage + 1}, '${currentType}')">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>`;
    }
    
    paginationList.innerHTML = html;
    pagination.style.display = 'block';
}

function formatRating(rating) {
    const stars = Math.round(rating);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

function showLoading() {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Поиск...</span>
            </div>
            <p class="mt-2">Поиск...</p>
        </div>
    `;
}

function showError(message) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
        </div>
    `;
}
