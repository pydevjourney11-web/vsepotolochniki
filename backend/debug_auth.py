#!/usr/bin/env python3
"""
Скрипт для отладки аутентификации
"""

from backend.app import app, db
from backend.models import User
from werkzeug.security import generate_password_hash, check_password_hash

def debug_auth():
    with app.app_context():
        # Проверяем всех пользователей
        users = User.query.all()
        print(f"Всего пользователей в БД: {len(users)}")
        
        for user in users:
            print(f"\nПользователь:")
            print(f"  ID: {user.id}")
            print(f"  Email: {user.email}")
            print(f"  Name: {user.name}")
            print(f"  Password hash: {user.password}")
            print(f"  Role: {user.role}")
            
            # Тестируем пароль
            test_password = "test123"  # Попробуйте ваш пароль
            is_valid = check_password_hash(user.password, test_password)
            print(f"  Пароль 'test123' валиден: {is_valid}")
            
            # Попробуем другие варианты
            for pwd in ["123456", "password", "admin123", "user123"]:
                if check_password_hash(user.password, pwd):
                    print(f"  Найден правильный пароль: '{pwd}'")
                    break

if __name__ == "__main__":
    debug_auth()
