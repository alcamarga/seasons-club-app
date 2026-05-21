# backend/migrar_stock.py
import psycopg2
import os
from config import Config  # Importamos la clase Config

def ejecutar_migracion():
    try:
        # Extraemos la URI de la clase Config
        db_uri = Config.SQLALCHEMY_DATABASE_URI
        
        # Psycopg2 necesita que la URL empiece con postgresql://
        # Si tu URI es de SQLAlchemy (que empieza con postgresql://), funciona directo
        conn = psycopg2.connect(db_uri)
        cur = conn.cursor()
        
        print("🛠️ Ejecutando migración: Agregando columna stock_actual...")
        
        # Añadimos la columna de forma segura
        cur.execute("ALTER TABLE producto ADD COLUMN IF NOT EXISTS stock_actual INTEGER DEFAULT 0;")
        
        conn.commit()
        print("✅ ¡Éxito! Columna 'stock_actual' añadida a la tabla 'producto'.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error durante la migración: {e}")

if __name__ == "__main__":
    ejecutar_migracion()