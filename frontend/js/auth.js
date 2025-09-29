// Функции для работы с аутентификацией
class AuthManager {
    constructor() {
        this.user = null;
        this.init();
    }

    init() {
        // Проверяем, есть ли сохраненный пользователь
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            this.user = JSON.parse(savedUser);
            // Автоматически даем роль admin для admin@test.com
            if (this.user.email === 'admin@test.com') {
                this.user.role = 'admin';
                localStorage.setItem('user', JSON.stringify(this.user));
            }
            this.updateUI();
        }
    }

    // Обновление UI в зависимости от статуса авторизации
    updateUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');
        const addCompanyBtn = document.getElementById('addCompanyBtn');
        const addArticleBtn = document.getElementById('addArticleBtn');
        const moderationLink = document.getElementById('moderationLink');

        if (this.user) {
            // Пользователь авторизован
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            if (userName) userName.textContent = this.user.name;
            if (addCompanyBtn) addCompanyBtn.style.display = 'block';
            if (addArticleBtn) addArticleBtn.style.display = 'block';
            
            // Показываем ссылку на модерацию только для администраторов
            if (moderationLink) {
                moderationLink.style.display = this.hasRole('admin') ? 'block' : 'none';
            }
        } else {
            // Пользователь не авторизован
            if (authButtons) authButtons.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
            if (addCompanyBtn) addCompanyBtn.style.display = 'none';
            if (addArticleBtn) addArticleBtn.style.display = 'none';
            if (moderationLink) moderationLink.style.display = 'none';
        }
    }

    // Проверка авторизации
    isAuthenticated() {
        return this.user !== null && api.token !== null;
    }

    // Получение текущего пользователя
    getCurrentUser() {
        return this.user;
    }

    // Выход из системы
    logout() {
        this.user = null;
        api.removeToken();
        this.updateUI();
        
        // Перенаправляем на главную страницу
        if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    }

    // Проверка прав доступа
    hasRole(role) {
        return this.user && this.user.role === role;
    }
    
    // Проверка, является ли пользователь администратором
    isAdmin() {
        return this.hasRole('admin');
    }
    
    // Установка роли (для тестирования)
    setRole(role) {
        if (this.user) {
            this.user.role = role;
            localStorage.setItem('user', JSON.stringify(this.user));
            this.updateUI();
        }
    }

    // Проверка, является ли пользователь владельцем ресурса
    isOwner(resourceUserId) {
        return this.user && this.user.id === resourceUserId;
    }

    // Проверка авторизации для защищенных действий
    requireAuth(callback) {
        if (!this.isAuthenticated()) {
            alert('Для выполнения этого действия необходимо войти в систему');
            window.location.href = 'login.html';
            return;
        }
        callback();
    }

    // Проверка прав администратора
    requireAdmin(callback) {
        if (!this.hasRole('admin')) {
            alert('У вас нет прав для выполнения этого действия');
            return;
        }
        callback();
    }
}

// Функция выхода (глобальная)
function logout() {
    auth.logout();
}

// Создаем глобальный экземпляр AuthManager
const auth = new AuthManager();

// Проверяем авторизацию при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    auth.updateUI();
});

// Обработка ошибок авторизации
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && event.reason.message.includes('401')) {
        // Неавторизованный доступ
        auth.logout();
    }
});
