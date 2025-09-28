import sqlite3

try:
    conn = sqlite3.connect('instance/database.db')
    cursor = conn.cursor()
    
    # Создаем временную таблицу с правильной структурой
    cursor.execute("""
        CREATE TABLE comment_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id INTEGER NOT NULL,
            user_id INTEGER,
            anonymous_name VARCHAR(100),
            text TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'approved',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (article_id) REFERENCES article (id),
            FOREIGN KEY (user_id) REFERENCES user (id)
        )
    """)
    
    # Копируем данные из старой таблицы
    cursor.execute("""
        INSERT INTO comment_new (id, article_id, user_id, text, status, created_at)
        SELECT id, article_id, user_id, text, status, created_at FROM comment
    """)
    
    # Удаляем старую таблицу
    cursor.execute("DROP TABLE comment")
    
    # Переименовываем новую таблицу
    cursor.execute("ALTER TABLE comment_new RENAME TO comment")
    
    conn.commit()
    conn.close()
    print("Таблица comment обновлена успешно!")
    
    # Проверяем результат
    conn = sqlite3.connect('instance/database.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(comment)")
    columns = cursor.fetchall()
    print("\nНовая структура таблицы comment:")
    for column in columns:
        nullable = "NULL" if column[3] == 0 else "NOT NULL"
        print(f"  - {column[1]} ({column[2]}) {nullable}")
    conn.close()
    
except Exception as e:
    print(f"Ошибка: {e}")
