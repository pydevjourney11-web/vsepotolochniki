#!/usr/bin/env python3
"""
Скрипт для обновления схемы базы данных на продакшене
Используется для изменения размера поля password в таблице user
"""

import os
import sys
from sqlalchemy import create_engine, text

def update_database():
    # Получаем URL базы данных из переменной окружения
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL не найден в переменных окружения")
        return False
    
    print(f"🗄️ Подключение к базе данных: {database_url}")
    
    try:
        # Создаем подключение к базе данных
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Проверяем текущий размер поля password
            result = conn.execute(text("""
                SELECT character_maximum_length 
                FROM information_schema.columns 
                WHERE table_name = 'user' AND column_name = 'password'
            """))
            
            current_length = result.fetchone()
            if current_length:
                print(f"📏 Текущий размер поля password: {current_length[0]} символов")
                
                if current_length[0] < 200:
                    print("🔧 Обновляем размер поля password до 200 символов...")
                    
                    # Обновляем размер поля password
                    conn.execute(text("ALTER TABLE \"user\" ALTER COLUMN password TYPE VARCHAR(200)"))
                    conn.commit()
                    
                    print("✅ Поле password успешно обновлено!")
                else:
                    print("ℹ️ Поле password уже имеет достаточный размер")
            else:
                print("❌ Таблица user не найдена")
                return False
                
    except Exception as e:
        print(f"❌ Ошибка при обновлении базы данных: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 Начинаем обновление базы данных...")
    success = update_database()
    
    if success:
        print("🎉 Обновление завершено успешно!")
        sys.exit(0)
    else:
        print("💥 Обновление завершилось с ошибкой!")
        sys.exit(1)
