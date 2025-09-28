import sqlite3

try:
    conn = sqlite3.connect('instance/database.db')
    cursor = conn.cursor()
    
    # Проверяем, есть ли уже поле anonymous_author
    cursor.execute("PRAGMA table_info(article)")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]
    
    if 'anonymous_author' not in column_names:
        print("Добавляем поле anonymous_author в таблицу article...")
        cursor.execute("ALTER TABLE article ADD COLUMN anonymous_author VARCHAR(100)")
        print("Поле anonymous_author добавлено!")
    else:
        print("Поле anonymous_author уже существует!")
    
    # Проверяем, можно ли author_id быть NULL
    cursor.execute("PRAGMA table_info(article)")
    columns = cursor.fetchall()
    for col in columns:
        if col[1] == 'author_id':
            print(f"author_id: nullable={col[3] == 0}")
            break
    
    conn.commit()
    conn.close()
    print("Обновление завершено!")
    
except Exception as e:
    print(f"Ошибка: {e}")
