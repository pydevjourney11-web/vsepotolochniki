import sqlite3

try:
    conn = sqlite3.connect('instance/database.db')
    cursor = conn.cursor()
    
    # Проверяем, есть ли уже поле anonymous_name
    cursor.execute("PRAGMA table_info(comment)")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]
    
    if 'anonymous_name' not in column_names:
        print("Добавляем поле anonymous_name в таблицу comment...")
        cursor.execute("ALTER TABLE comment ADD COLUMN anonymous_name VARCHAR(100)")
        print("Поле anonymous_name добавлено!")
    else:
        print("Поле anonymous_name уже существует!")
    
    # Проверяем, можно ли user_id быть NULL
    cursor.execute("PRAGMA table_info(comment)")
    columns = cursor.fetchall()
    for col in columns:
        if col[1] == 'user_id':
            print(f"user_id: nullable={col[3] == 0}")
            break
    
    conn.commit()
    conn.close()
    print("Обновление завершено!")
    
except Exception as e:
    print(f"Ошибка: {e}")
