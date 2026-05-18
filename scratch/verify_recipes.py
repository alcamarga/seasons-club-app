import sqlite3
import os

db_path = 'backend/pizzeria_core.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- RECETAS ---")
    cursor.execute("SELECT * FROM recetas")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
        
    print("--- ITEMS PEDIDO (pizza_id) ---")
    cursor.execute("PRAGMA table_info(items_pedido)")
    print(cursor.fetchall())
    
    conn.close()
else:
    print("DB not found")
