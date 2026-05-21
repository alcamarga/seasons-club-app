"""
🌌 SEASONS CLUB APP - DATA SEEDER
@author Camilo Martinez Galarza
"""
from app import app
from models.database import db
from models.mesa import Mesa
from models.producto import Producto  # Importamos tu modelo de productos de la pizzería

with app.app_context():
    print("🌱 Iniciando siembra de datos para Seasons Club...")

    # --- 1. SEED DE MESAS (Asegúrate de mantener el tuyo si ya funciona) ---
    if Mesa.query.count() == 0:
        print("🪑 Creando 20 mesas en PostgreSQL...")
        for i in range(1, 21):
            nueva_mesa = Mesa(numero_mesa=i, estado='LIBRE')
            db.session.add(nueva_mesa)
        db.session.commit()
        print("✅ Mesas creadas.")

    # --- 2. 🍹 NUEVO: SEED DE LICORES PARA LA BARRA ---
    if Producto.query.count() == 0:
        print("🍾 Inyectando licores de prueba al inventario...")
        
        # Usamos 'precio_base' que es la columna real de tu modelo físico
        licores = [
            Producto(nombre="Aguardiente Antioqueño (Trago)", precio_base=8500, categoria="Licores"),
            Producto(nombre="Ron Medellín 8 Años (Trago)", precio_base=12000, categoria="Licores"),
            Producto(nombre="Coctel Margarita Blue", precio_base=22000, categoria="Cocteles"),
            Producto(nombre="Cerveza Club Colombia", precio_base=7000, categoria="Cervezas"),
            Producto(nombre="Botella Whisky Old Parr", precio_base=180000, categoria="Botellas")
        ]
        
        for licor in licores:
            db.session.add(licor)
        
        db.session.commit()
        print("✅ Inventario de barra cargado.")

    print("🚀 ¡Todo el sistema quedó poblado con éxito, Camilo!")