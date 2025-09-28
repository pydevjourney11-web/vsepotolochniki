import sqlite3

try:
    conn = sqlite3.connect('instance/database.db')
    cursor = conn.cursor()
    
    # Создаем временную таблицу с правильной структурой
    cursor.execute("""
        CREATE TABLE article_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title VARCHAR(200) NOT NULL,
            content TEXT NOT NULL,
            excerpt TEXT,
            cover_image VARCHAR(200),
            tags TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            author_id INTEGER,
            anonymous_author VARCHAR(100),
            views INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES user (id)
        )
    """)
    
    # Копируем данные из старой таблицы
    cursor.execute("""
        INSERT INTO article_new (id, title, content, excerpt, cover_image, tags, status, author_id, views, created_at, updated_at)
        SELECT id, title, content, excerpt, cover_image, tags, status, author_id, views, created_at, updated_at FROM article
    """)
    
    # Удаляем старую таблицу
    cursor.execute("DROP TABLE article")
    
    # Переименовываем новую таблицу
    cursor.execute("ALTER TABLE article_new RENAME TO article")
    
    conn.commit()
    conn.close()
    print("Таблица article обновлена успешно!")
    
    # Проверяем результат
    conn = sqlite3.connect('instance/database.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(article)")
    columns = cursor.fetchall()
    print("\nНовая структура таблицы article:")
    for column in columns:
        nullable = "NULL" if column[3] == 0 else "NOT NULL"
        print(f"  - {column[1]} ({column[2]}) {nullable}")
    conn.close()
    
except Exception as e:
    print(f"Ошибка: {e}")
