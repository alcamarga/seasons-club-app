"""
🌌 SEASONS CLUB - DB RESET UTILITY (FORCE CASCADE)
@author Camilo Martinez Galarza
"""
from app import app
from models.database import db
from models.mesa import Mesa
from models.pedido import Pedido
from models.producto import Producto

print("⏳ Conectando con PostgreSQL para reestructurar tablas...")

with app.app_context():
    print("🔥 Forzando limpieza absoluta en Postgres (CASCADE)...")
    try:
        # 💥 Le decimos a PostgreSQL de forma directa que rompa las tablas existentes y sus llaves foráneas antiguas
        db.session.execute(db.text("DROP TABLE IF EXISTS pedido CASCADE;"))
        db.session.execute(db.text("DROP TABLE IF EXISTS mesas CASCADE;"))
        db.session.execute(db.text("DROP TABLE IF EXISTS producto CASCADE;"))
        db.session.commit()
        print("🔓 Candados relacionales rotos con éxito.")
    except Exception as e:
        db.session.rollback()
        print(f"⚠️ Nota de limpieza cruda: {e}")

    # Ahora sí ejecutamos el drop y create normales por si queda algún residuo del ORM
    db.drop_all()
    
    print("🛠️ Creando tablas nuevas con la columna 'mesa_id' e indices perfectos...")
    db.create_all()

print("✅ ¡Base de datos completamente alineada con éxito, Camilo!")