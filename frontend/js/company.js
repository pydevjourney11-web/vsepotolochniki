// Функции для страницы исполнителя
let currentCompany = null;

document.addEventListener('DOMContentLoaded', function() {
    loadCompany();
    setupRatingInput();
    setupReviewForm();
});

// Загрузка информации о компании
async function loadCompany() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const companyId = urlParams.get('id');
        
        if (!companyId) {
            showError('ID компании не указан');
            return;
        }
        
        const company = await api.getCompany(companyId);
        currentCompany = company;
        displayCompany(company);
        hideLoading();
    } catch (error) {
        console.error('Ошибка загрузки компании:', error);
        showError('Не удалось загрузить информацию об исполнителе: ' + error.message);
    }
}

// Отображение информации о компании
function displayCompany(company) {
    // Название и хлебные крошки
    document.getElementById('companyName').textContent = company.name;
    document.getElementById('companyBreadcrumb').textContent = company.name;
    document.title = `${company.name} | ВП | Все потолочные`;
    
    // Категория и город
    document.getElementById('companyCategory').textContent = company.category;
    document.getElementById('companyCity').textContent = company.city;
    
    // Логотип
    const logoContainer = document.getElementById('companyLogo');
    if (company.logo) {
        logoContainer.innerHTML = `
            <img src="${company.logo}" class="img-fluid rounded" alt="${company.name}" style="max-width: 200px;">
        `;
    } else {
        logoContainer.innerHTML = `
            <div class="bg-light rounded d-flex align-items-center justify-content-center" style="width: 200px; height: 200px; margin: 0 auto;">
                <i class="fas fa-building fa-3x text-muted"></i>
            </div>
        `;
    }
    
    // Рейтинг
    document.getElementById('companyRating').innerHTML = formatRating(company.rating);
    document.getElementById('companyReviewCount').textContent = `(${company.review_count} отзывов)`;
    
    // Контакты
    const contactsContainer = document.getElementById('companyContacts');
    let contactsHTML = '';
    
    if (company.address) {
        contactsHTML += `
            <div class="mb-2">
                <i class="fas fa-map-marker-alt text-muted me-2"></i>
                <strong>Адрес:</strong> ${company.address}
            </div>
        `;
    }
    
    if (company.phone) {
        contactsHTML += `
            <div class="mb-2">
                <i class="fas fa-phone text-muted me-2"></i>
                <strong>Телефон:</strong> 
                <a href="tel:${company.phone}">${company.phone}</a>
            </div>
        `;
    }
    
    if (company.website) {
        contactsHTML += `
            <div class="mb-2">
                <i class="fas fa-globe text-muted me-2"></i>
                <strong>Сайт:</strong> 
                <a href="${company.website}" target="_blank">${company.website}</a>
            </div>
        `;
    }
    
    contactsContainer.innerHTML = contactsHTML || '<p class="text-muted">Контактная информация не указана</p>';
    
    // Описание
    const descriptionContainer = document.getElementById('companyDescription');
    if (company.description) {
        descriptionContainer.innerHTML = `
            <h5>О компании</h5>
            <p>${company.description}</p>
        `;
    } else {
        descriptionContainer.innerHTML = `
            <h5>О компании</h5>
            <p class="text-muted">Описание компании не указано</p>
        `;
    }
    
    // Статистика
    document.getElementById('totalReviews').textContent = company.review_count;
    document.getElementById('averageRating').textContent = company.rating.toFixed(1);
    
    // Отзывы
    displayReviews(company.reviews);
    
    // Показываем карточку
    document.getElementById('companyCard').style.display = 'block';
}

// Отображение отзывов
function displayReviews(reviews) {
    const reviewsContainer = document.getElementById('reviewsList');
    
    if (reviews.length === 0) {
        reviewsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <h4>Пока нет отзывов</h4>
                <p>Станьте первым, кто оставит отзыв об этом исполнителе</p>
            </div>
        `;
        return;
    }
    
    reviewsContainer.innerHTML = reviews.map(review => `
        <div class="review-card p-3 mb-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <strong>${review.author.name}</strong>
                    <div class="rating">${formatRating(review.rating)}</div>
                </div>
                <small class="text-muted">${formatDate(review.created_at)}</small>
            </div>
            <p class="mb-2">${review.text}</p>
            ${review.photos && review.photos.length > 0 ? `
                <div class="review-photos">
                    ${review.photos.map(photo => `
                        <img src="${photo}" class="review-photo" alt="Фото отзыва" onclick="openPhotoModal('${photo}')">
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
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

// Настройка формы отзыва
function setupReviewForm() {
    const reviewForm = document.getElementById('reviewForm');
    if (!reviewForm) return;
    
    reviewForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const activeStars = document.querySelectorAll('.rating-input .active');
        const rating = activeStars.length;
        const text = document.getElementById('reviewText').value.trim();
        const photos = document.getElementById('reviewPhotos').files;
        
        if (!rating) {
            alert('Пожалуйста, выберите оценку');
            return;
        }
        
        if (!text) {
            alert('Пожалуйста, напишите отзыв');
            return;
        }
        
        try {
            const reviewData = {
                company_id: currentCompany.id,
                rating: parseInt(rating),
                text: text
            };
            
            console.log('📝 Данные отзыва:', reviewData);
            console.log('🏢 Текущая компания:', currentCompany);
            
            // TODO: Загрузка фотографий
            if (photos.length > 0) {
                reviewData.photos = []; // Пока без фотографий
            }
            
            // Добавляем имя только для неавторизованных пользователей (капча отключена)
            if (!auth.isAuthenticated()) {
                const anonymousName = document.getElementById('anonymousName')?.value.trim();
                if (!anonymousName) {
                    alert('Пожалуйста, введите ваше имя');
                    return;
                }
                
                reviewData.anonymous_name = anonymousName;
                console.log('🔒 Добавлены данные для анонимного пользователя:', {anonymous_name: anonymousName});
            }
            
            console.log('📤 Отправляем данные:', reviewData);
            await api.createReview(reviewData);
            
            showNotification('Отзыв успешно добавлен!', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('reviewModal'));
            modal.hide();
            
            // Обновляем информацию о компании
            loadCompany();
            
        } catch (error) {
            console.error('Ошибка при добавлении отзыва:', error);
            alert('Ошибка при добавлении отзыва: ' + error.message);
        }
    });
}

// Открытие модального окна отзыва
function openReviewModal() {
    const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
    modal.show();
}

// Поделиться компанией
function shareCompany() {
    if (navigator.share) {
        navigator.share({
            title: currentCompany.name,
            text: `Посмотрите на этого исполнителя: ${currentCompany.name}`,
            url: window.location.href
        });
    } else {
        // Копируем ссылку в буфер обмена
        navigator.clipboard.writeText(window.location.href).then(() => {
            showNotification('Ссылка скопирована в буфер обмена!', 'success');
        });
    }
}

// Пожаловаться на компанию
function reportCompany() {
    const reason = prompt('Укажите причину жалобы:');
    if (reason) {
        // TODO: Отправка жалобы на сервер
        showNotification('Жалоба отправлена. Спасибо за обратную связь!', 'info');
    }
}

// Открытие модального окна с фотографией
function openPhotoModal(photoUrl) {
    // TODO: Создать модальное окно для просмотра фотографий
    window.open(photoUrl, '_blank');
}

// Показ ошибки
function showError(message) {
    document.getElementById('errorText').textContent = message;
    document.getElementById('errorMessage').style.display = 'block';
    hideLoading();
}

// Скрытие загрузки
function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

// Форматирование рейтинга
function formatRating(rating) {
    const stars = Math.round(rating);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
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
