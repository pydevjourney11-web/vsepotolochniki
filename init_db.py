#!/usr/bin/env python3
"""
Скрипт для инициализации базы данных на Render
Запускается автоматически при деплое
"""

import os
import sys
import requests
from datetime import datetime

def init_database():
    """Инициализация базы данных через API"""
    try:
        # Получаем URL приложения из переменных окружения
        app_url = os.environ.get('RENDER_EXTERNAL_URL', 'http://localhost:5000')
        
        print(f"🔧 Инициализация базы данных для {app_url}")
        
        # Отправляем POST запрос для инициализации БД
        response = requests.post(f"{app_url}/api/init-db", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ База данных успешно инициализирована!")
            print(f"📊 Пользователей в БД: {data.get('user_count', 0)}")
            print(f"👤 Администратор создан: {data.get('admin_created', False)}")
            return True
        else:
            print(f"❌ Ошибка инициализации БД: {response.status_code}")
            print(f"📝 Ответ сервера: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка подключения: {e}")
        return False
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
        return False

def check_health():
    """Проверка состояния приложения"""
    try:
        app_url = os.environ.get('RENDER_EXTERNAL_URL', 'http://localhost:5000')
        
        print(f"🏥 Проверка состояния приложения...")
        
        response = requests.get(f"{app_url}/api/health", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Приложение работает!")
            print(f"📊 Статус БД: {data.get('database_status', 'unknown')}")
            print(f"👤 Администратор существует: {data.get('admin_exists', False)}")
            return True
        else:
            print(f"❌ Приложение недоступно: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка проверки: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Запуск инициализации базы данных...")
    print(f"⏰ Время: {datetime.now().isoformat()}")
    
    # Проверяем состояние приложения
    if check_health():
        # Инициализируем базу данных
        if init_database():
            print("🎉 Инициализация завершена успешно!")
            sys.exit(0)
        else:
            print("💥 Ошибка инициализации базы данных!")
            sys.exit(1)
    else:
        print("💥 Приложение недоступно!")
        sys.exit(1)
