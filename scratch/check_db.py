import sqlite3
import os

db_path = 'backend/pizzeria_core.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, nombre, email FROM usuarios")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    conn.close()
else:
    print("DB not found")
