import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from models.database import db

# 1. IMPORTAR MODELOS (Ya sincronizados con la discoteca)
from models.usuario import Usuario
from models.insumo import Insumo
from models.producto import Producto
from models.receta import Receta
from models.mesa import Mesa  # <-- Importamos tu modelo de mesas listo

# 2. IMPORTAR RUTAS
from routes.pedido_routes import pedidos_blueprint
from routes.admin_routes import admin_bp
from routes.auth_routes import auth_bp
from routes.mesa_routes import mesa_bp
from routes.producto_routes import producto_blueprint

app = Flask(__name__)
app.config.from_object(Config)

# Configuración de CORS abierta para validación en local y Azure
CORS(app, resources={r"/api/*": {"origins": "*"}})

db.init_app(app)

# Registramos los blueprints con los prefijos corregidos
app.register_blueprint(pedidos_blueprint, url_prefix='/api')
app.register_blueprint(admin_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(mesa_bp, url_prefix='/api')
app.register_blueprint(producto_blueprint, url_prefix='/api')

@app.route('/')
def index():
    return "<h1>¡Seasons Club Backend Funcionando!</h1><p>Sistema de Gestión de Mesas y Comandas Activo.</p>"

@app.route('/api/seed', methods=['GET'])
def trigger_seed():
    try:
        from werkzeug.security import generate_password_hash
        print("🚀 Iniciando Seed desde endpoint...")
        
        # 1. Crear tablas si no existen en la base de datos
        db.create_all()
        
        # 2. Crear Admin de la discoteca si no existe
        admin_email = 'admin@seasonsclub.com'
        if not Usuario.query.filter_by(email=admin_email).first():
            admin = Usuario(
                nombre='Admin Seasons',
                email=admin_email,
                contrasena_hash=generate_password_hash('admin123'),
                rol='admin'
            )
            db.session.add(admin)
            
        # 3. Productos básicos para barra/discoteca de prueba
        if not Producto.query.filter_by(nombre='Coctel de la Casa').first():
            p1 = Producto(
                nombre='Coctel de la Casa', 
                descripcion='Bebida premium neón', 
                categoria='Cocteles', 
                precio_base=35000, 
                precio_pequena=35000
            )
            db.session.add(p1)
            
        # 4. Poblar las 20 mesas si la base de datos está vacía
        if Mesa.query.count() == 0:
            for i in range(1, 21):
                db.session.add(Mesa(numero_mesa=i, estado='LIBRE'))
            
        db.session.commit()
        return jsonify({"status": "success", "message": "¡Base de datos de Seasons Club inicializada con éxito!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        # Crear todas las tablas que Flask "conoce" gracias a los imports
        print("🛠️ [DB] Creando tablas en PostgreSQL...")
        db.create_all()
        
        from werkzeug.security import generate_password_hash
        
        # Lógica del Administrador de la discoteca
        admin_email = 'admin@seasonsclub.com'
        admin_existente = Usuario.query.filter_by(email=admin_email).first()
        
        if not admin_existente:
            nuevo_admin = Usuario(
                nombre='Administrador',
                email=admin_email,
                contrasena_hash=generate_password_hash('admin123'),
                rol='admin'
            )
            db.session.add(nuevo_admin)
            db.session.commit()
            print("✅ [DB] Usuario administrador creado: admin@seasonsclub.com / admin123")
        else:
            admin_existente.contrasena_hash = generate_password_hash('admin123')
            db.session.commit()
            print("✅ [DB] Usuario administrador verificado para Seasons Club.")

        # Lógica automática para inicializar las 20 mesas en la base de datos física
        mesas_en_bd = Mesa.query.count()
        if mesas_en_bd == 0:
            print("🎛️ [DB] Inicializando las 20 mesas de Seasons Club...")
            for i in range(1, 21):
                nueva_mesa = Mesa(numero_mesa=i, estado='LIBRE')
                db.session.add(nueva_mesa)
            db.session.commit()
            print("✅ [DB] ¡Las 20 mesas fueron guardadas exitosamente!")
        else:
            print(f"✅ [DB] Estructura de mesas verificada ({mesas_en_bd} encontradas).")

    app.run(debug=True, host='0.0.0.0', port=5000)