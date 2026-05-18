import sqlite3
import os

db_path = 'backend/pizzeria_core.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Renombrar Harina a Masa si existe
    cursor.execute("UPDATE insumos SET nombre='Masa', unidad_medida='unidades' WHERE nombre='Harina'")
    
    # 2. Corregir unidades de Queso y Salsa
    cursor.execute("UPDATE insumos SET unidad_medida='gr' WHERE nombre='Queso Mozzarella'")
    cursor.execute("UPDATE insumos SET unidad_medida='ml' WHERE nombre='Salsa de Tomate'")
    
    # 3. Asegurar que las cantidades actuales sean razonables para gr/ml
    # Si Queso era 20.0 kg, ahora son 20000 gr.
    cursor.execute("UPDATE insumos SET cantidad_actual = cantidad_actual * 1000 WHERE nombre='Queso Mozzarella' AND unidad_medida='gr' AND cantidad_actual < 1000")
    cursor.execute("UPDATE insumos SET cantidad_actual = cantidad_actual * 1000 WHERE nombre='Salsa de Tomate' AND unidad_medida='ml' AND cantidad_actual < 1000")
    
    conn.commit()
    print("[INFO] DB actualizada con unidades métricas")
    conn.close()
else:
    print("DB not found")
