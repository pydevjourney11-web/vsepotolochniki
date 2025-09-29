// Функции для страницы каталога
let currentPage = 1;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    loadCities();
    setupFilters();
    loadCompanies();
    setupRatingInput();
});

// Загрузка категорий
async function loadCategories() {
    try {
        const categories = await api.getCategories();
        const categorySelect = document.getElementById('categorySelect');
        const categoryFilter = document.getElementById('categoryFilter');
        
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Все категории</option>' + 
                categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        }
        
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">Все категории</option>' + 
                categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        }
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
            citySelect.innerHTML = '<option value="">Все города</option>' + 
                cities.map(city => `<option value="${city}">${city}</option>`).join('');
        }
        
        if (cityFilter) {
            cityFilter.innerHTML = '<option value="">Все города</option>' + 
                cities.map(city => `<option value="${city}">${city}</option>`).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки городов:', error);
    }
}

// Настройка фильтров
function setupFilters() {
    const filterForm = document.getElementById('filterForm');
    if (!filterForm) return;
    
    // Загружаем параметры из URL
    const urlParams = getUrlParams();
    currentFilters = {
        search: urlParams.search,
        category: urlParams.category,
        city: urlParams.city
    };
    
    // Заполняем форму фильтрами из URL
    if (urlParams.search) {
        document.getElementById('searchInput').value = urlParams.search;
    }
    if (urlParams.category) {
        document.getElementById('categoryFilter').value = urlParams.category;
    }
    if (urlParams.city) {
        document.getElementById('cityFilter').value = urlParams.city;
    }
    
    filterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        applyFilters();
    });
}

// Применение фильтров
function applyFilters() {
    currentFilters = {
        search: document.getElementById('searchInput').value,
        category: document.getElementById('categoryFilter').value,
        city: document.getElementById('cityFilter').value,
        rating: document.getElementById('ratingFilter').value
    };
    
    currentPage = 1;
    loadCompanies();
    updateUrl(currentFilters);
}

// Сброс фильтров
function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('cityFilter').value = '';
    document.getElementById('ratingFilter').value = '';
    
    currentFilters = {};
    currentPage = 1;
    loadCompanies();
    updateUrl({});
}

// Загрузка компаний
async function loadCompanies() {
    try {
        const response = await api.getCompanies(currentPage, currentFilters);
        displayCompanies(response.companies);
        setupPagination(response);
    } catch (error) {
        handleError(error, 'загрузки компаний');
    }
}

// Отображение компаний
function displayCompanies(companies) {
    const companiesList = document.getElementById('companiesList');
    if (!companiesList) return;
    
    if (companies.length === 0) {
        companiesList.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fas fa-building"></i>
                    <h4>Компании не найдены</h4>
                    <p>Попробуйте изменить параметры поиска</p>
                </div>
            </div>
        `;
        return;
    }
    
    companiesList.innerHTML = companies.map(company => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card company-card h-100">
                <div class="card-body">
                    <div class="d-flex align-items-start mb-3">
                        ${company.logo ? `
                            <img src="${company.logo}" class="company-logo me-3" alt="${company.name}">
                        ` : `
                            <div class="company-logo me-3 bg-light d-flex align-items-center justify-content-center">
                                <i class="fas fa-building text-muted"></i>
                            </div>
                        `}
                        <div class="flex-grow-1">
                            <h5 class="card-title mb-1">${company.name}</h5>
                            <p class="text-muted mb-1">${company.category}</p>
                            <div class="rating mb-2">
                                ${formatRating(company.rating)}
                                <span class="ms-1">(${company.review_count})</span>
                            </div>
                        </div>
                    </div>
                    
                    <p class="card-text text-muted">
                        <i class="fas fa-map-marker-alt"></i> ${company.city}
                    </p>
                    
                    ${company.description ? `
                        <p class="card-text">${company.description.substring(0, 100)}...</p>
                    ` : ''}
                    
                    <div class="d-flex gap-2">
                        <button class="btn btn-primary btn-sm flex-grow-1" onclick="goToCompanyPage(${company.id})">
                            Подробнее
                        </button>
                        ${auth.isAuthenticated() ? `
                            <button class="btn btn-outline-success btn-sm" onclick="openReviewModal(${company.id})">
                                <i class="fas fa-star"></i>
                            </button>
                        ` : ''}
                        ${auth.isAdmin() ? `
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteCompanyFromCatalog(${company.id})" title="Удалить компанию">
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
    const pagination = document.getElementById('pagination');
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
    loadCompanies();
    updateUrl({ ...currentFilters, page });
}

// Переход на страницу компании
function goToCompanyPage(companyId) {
    window.location.href = `company.html?id=${companyId}`;
}

// Просмотр компании (модальное окно)
async function viewCompany(companyId) {
    try {
        const company = await api.getCompany(companyId);
        showCompanyModal(company);
    } catch (error) {
        handleError(error, 'загрузки информации о компании');
    }
}

// Показ модального окна компании
function showCompanyModal(company) {
    const modalTitle = document.getElementById('companyModalTitle');
    const modalBody = document.getElementById('companyModalBody');
    
    modalTitle.textContent = company.name;
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-4">
                ${company.logo ? `
                    <img src="${company.logo}" class="img-fluid rounded mb-3" alt="${company.name}">
                ` : ''}
                <div class="rating mb-3">
                    ${formatRating(company.rating)}
                    <span class="ms-2">(${company.review_count} отзывов)</span>
                </div>
            </div>
            <div class="col-md-8">
                <h5>Информация</h5>
                <table class="table table-sm">
                    <tr><td><strong>Категория:</strong></td><td>${company.category}</td></tr>
                    <tr><td><strong>Город:</strong></td><td>${company.city}</td></tr>
                    ${company.address ? `<tr><td><strong>Адрес:</strong></td><td>${company.address}</td></tr>` : ''}
                    ${company.phone ? `<tr><td><strong>Телефон:</strong></td><td>${company.phone}</td></tr>` : ''}
                    ${company.website ? `<tr><td><strong>Сайт:</strong></td><td><a href="${company.website}" target="_blank">${company.website}</a></td></tr>` : ''}
                </table>
                
                ${company.description ? `
                    <h5>Описание</h5>
                    <p>${company.description}</p>
                ` : ''}
                
                <h5>Последние отзывы</h5>
                <div id="companyReviews">
                    ${company.reviews.map(review => `
                        <div class="review-card p-3 mb-3">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <strong>${review.author.name}</strong>
                                    <div class="rating">${formatRating(review.rating)}</div>
                                </div>
                                <small class="text-muted">${formatDate(review.created_at)}</small>
                            </div>
                            <p class="mb-2">${review.text}</p>
                            ${review.photos.length > 0 ? `
                                <div class="review-photos">
                                    ${review.photos.map(photo => `
                                        <img src="${photo}" class="review-photo" alt="Фото отзыва">
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('companyModal'));
    modal.show();
}

// Настройка рейтинга
function setupRatingInput() {
    const ratingInputs = document.querySelectorAll('.rating-input');
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

// Открытие модального окна отзыва
function openReviewModal(companyId) {
    auth.requireAuth(() => {
        document.getElementById('reviewCompanyId').value = companyId;
        const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
        modal.show();
    });
}

// Получение параметров из URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        search: params.get('search') || '',
        category: params.get('category') || '',
        city: params.get('city') || '',
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

// Форматирование рейтинга
function formatRating(rating) {
    const stars = Math.round(rating);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// Обработка ошибок
function handleError(error, action) {
    console.error(`Ошибка ${action}:`, error);
    alert(`Ошибка ${action}: ${error.message}`);
}

// Показ уведомления
function showNotification(message, type = 'info') {
    // Простое уведомление через alert
    alert(message);
}

// Отправка отзыва
document.getElementById('reviewForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Проверяем авторизацию
    if (!auth.isAuthenticated()) {
        alert('Для оставления отзыва необходимо войти в систему');
        return;
    }
    
    const companyId = document.getElementById('reviewCompanyId').value;
    const rating = document.querySelector('.rating-input .active')?.getAttribute('data-rating') || 0;
    const text = document.getElementById('reviewText').value;
    const photos = document.getElementById('reviewPhotos').files;
    
    if (!rating) {
        alert('Пожалуйста, выберите оценку');
        return;
    }
    
    try {
        const reviewData = {
            company_id: parseInt(companyId),
            rating: parseInt(rating),
            text: text
        };
        
        // TODO: Загрузка фотографий
        if (photos.length > 0) {
            try {
                const uploadResult = await api.uploadPhotos(photos);
                reviewData.photos = uploadResult.files;
                console.log('📸 Фотографии отзыва загружены:', uploadResult.files);
            } catch (error) {
                console.error('Ошибка загрузки фотографий:', error);
                alert('Ошибка загрузки фотографий: ' + error.message);
                return;
            }
        }
        
        await api.createReview(reviewData);
        
        showNotification('Отзыв успешно добавлен!', 'success');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('reviewModal'));
        modal.hide();
        
        // Обновляем информацию о компании
        viewCompany(companyId);
        
    } catch (error) {
        handleError(error, 'добавления отзыва');
    }
});

// Удаление компании из каталога (только для админов)
async function deleteCompanyFromCatalog(companyId) {
    if (!confirm('Вы уверены, что хотите удалить эту компанию? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        await api.deleteCompany(companyId);
        showNotification('Компания успешно удалена', 'success');
        loadCompanies(); // Перезагружаем список компаний
    } catch (error) {
        handleError(error, 'удаления компании');
    }
}
