import sqlite3

try:
    conn = sqlite3.connect('instance/site.db')
    cursor = conn.cursor()
    
    # Получаем список таблиц
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print("Таблицы в базе данных:")
    for table in tables:
        print(f"  - {table[0]}")
    
    # Проверяем структуру таблицы comment если она существует
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='comment'")
    if cursor.fetchone():
        print("\nСтруктура таблицы comment:")
        cursor.execute("PRAGMA table_info(comment)")
        columns = cursor.fetchall()
        for column in columns:
            print(f"  - {column[1]} ({column[2]})")
    else:
        print("\nТаблица comment не существует!")
    
    conn.close()
    
except Exception as e:
    print(f"Ошибка: {e}")
