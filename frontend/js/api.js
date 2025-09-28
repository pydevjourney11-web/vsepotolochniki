// API класс для работы с backend
class API {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('token');
        console.log('API initialized with token:', this.token ? 'present' : 'missing');
        console.log('Token value:', this.token);
    }

    // Установка токена
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
        console.log('Token updated:', token ? 'present' : 'missing');
        console.log('Current token value:', this.token);
    }

    // Удаление токена
    removeToken() {
        this.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    // Базовый метод для запросово
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
            console.log('Adding Authorization header:', `Bearer ${this.token}`);
        } else {
            console.log('No token available, request will be anonymous');
        }

        try {
            console.log('Making request to:', url, 'with config:', config);
            const response = await fetch(url, config);
            
            // Проверяем, что ответ получен
            if (!response.ok) {
                let errorMessage = 'Ошибка сервера';
                try {
                    const errorData = await response.json();
                    console.log('Server error response:', errorData);
                    errorMessage = errorData.error || errorData.msg || errorMessage;
                } catch (e) {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Error:', error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Не удается подключиться к серверу. Проверьте, что сервер запущен.');
            }
            throw error;
        }
    }

    // Аутентификация
    async register(name, email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
    }

    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async getProfile() {
        return this.request('/auth/profile');
    }

    async updateProfile(data) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Каталог компаний
    async getCompanies(page = 1, filters = {}) {
        const params = new URLSearchParams({ page, ...filters });
        return this.request(`/catalog?${params}`);
    }

    async getCompany(id) {
        return this.request(`/catalog/${id}`);
    }

    async createCompany(data) {
        return this.request('/catalog', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateCompany(id, data) {
        return this.request(`/catalog/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteCompany(id) {
        return this.request(`/catalog/${id}`, {
            method: 'DELETE'
        });
    }

    async getCategories() {
        return this.request('/catalog/categories');
    }

    async getCities() {
        return this.request('/catalog/cities');
    }

    // Отзывы
    async createReview(data) {
        return this.request('/reviews', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateReview(id, data) {
        return this.request(`/reviews/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteReview(id) {
        return this.request(`/reviews/${id}`, {
            method: 'DELETE'
        });
    }

    async getCompanyReviews(companyId, page = 1) {
        const params = new URLSearchParams({ page });
        return this.request(`/reviews/company/${companyId}?${params}`);
    }

    async getUserReviews(page = 1) {
        const params = new URLSearchParams({ page });
        return this.request(`/reviews/user?${params}`);
    }

    async getReview(id) {
        return this.request(`/reviews/${id}`);
    }

    // Форум
    async getArticles(page = 1, filters = {}) {
        const params = new URLSearchParams({ page, ...filters });
        return this.request(`/forum/articles?${params}`);
    }

    async getArticle(id) {
        return this.request(`/forum/articles/${id}`);
    }

    async createArticle(data) {
        return this.request('/forum/articles', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateArticle(id, data) {
        return this.request(`/forum/articles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteArticle(id) {
        return this.request(`/forum/articles/${id}`, {
            method: 'DELETE'
        });
    }

    async createComment(articleId, data) {
        return this.request(`/forum/articles/${articleId}/comments`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateComment(id, text) {
        return this.request(`/forum/comments/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ text })
        });
    }

    async deleteComment(id) {
        return this.request(`/forum/comments/${id}`, {
            method: 'DELETE'
        });
    }

    async getComment(id) {
        return this.request(`/forum/comments/${id}`);
    }

    async getTags() {
        return this.request('/forum/tags');
    }

    // Поиск
    async search(query, page = 1, type = 'all') {
        const params = new URLSearchParams({ q: query, page, type });
        return this.request(`/search?${params}`);
    }

    async getSearchSuggestions(query) {
        const params = new URLSearchParams({ q: query });
        return this.request(`/search/suggestions?${params}`);
    }

    // Модерация компаний
    async moderateCompany(id, status) {
        return this.request(`/moderation/companies/${id}/moderate`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
    }

    // Получение компаний на модерации
    async getPendingCompanies(status = 'pending', page = 1, per_page = 20) {
        return this.request(`/moderation/companies?status=${status}&page=${page}&per_page=${per_page}`);
    }

    // Модерация статей
    async moderateArticle(id, status) {
        return this.request(`/forum/articles/${id}/moderate`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
    }

    // Модерация комментариев
    async moderateComment(id, status) {
        return this.request(`/forum/comments/${id}/moderate`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
    }

    // Модерация отзывов
    async moderateReview(id, status) {
        return this.request(`/catalog/reviews/${id}/moderate`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
    }

    // Получение контента на модерации
    async getPendingContent(type) {
        return this.request(`/moderation/${type}`);
    }

    // Загрузка файлов
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseURL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Ошибка загрузки файла');
        }

        return response.json();
    }
}

// Создаем глобальный экземпляр API
const api = new API();
