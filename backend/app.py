import logging
import os
from flask import Flask, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename
from flask_cors import CORS
from config import Config
from database import db
from usuario import Usuario
from password_utils import hash_password

# 1. IMPORTAR MODELOS
from models.insumo import Insumo
from models.producto import Producto
from models.receta import Receta
from models.mesa import Mesa
from models.pedido import Pedido
from models.pedido_linea import PedidoLinea
from models.grupo_mesa import GrupoMesa, MesaGrupoMiembro
from models.venta import Venta
from models.corte_caja import CorteCaja
from models.historial_ventas import HistorialVentas
from models.user import User

# 2. IMPORTAR RUTAS
from routes.admin_routes import admin_bp
from auth import auth_bp
from routes.mesa_routes import mesa_bp
from routes.producto_routes import producto_blueprint
from db_schema import ensure_producto_costo_unitario

app = Flask(__name__)
app.config.from_object(Config)

# --- CONFIGURACIÓN DE CARPETAS DE SUBIDA ---
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# CONFIGURACIÓN CORS REFORZADA
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return '', 200

db.init_app(app)

# Registramos los blueprints con el prefijo /api
app.register_blueprint(admin_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(mesa_bp, url_prefix='/api')
app.register_blueprint(producto_blueprint, url_prefix='/api')

# --- RUTA PARA SERVIR LAS IMÁGENES ---
@app.route('/static/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/')
def index():
    return "<h1>¡Seasons Club Backend Funcionando!</h1><p>Sistema de Gestión de Mesas y Comandas Activo.</p>"

@app.route('/api/seed', methods=['GET'])
def trigger_seed():
    try:
        from password_utils import hash_password
        db.create_all()
        
        admin_email = 'admin@seasonsclub.com'
        if not Usuario.query.filter_by(email=admin_email).first():
            admin = Usuario(
                nombre='Admin Seasons',
                email=admin_email,
                contrasena_hash=hash_password('admin1'),
                rol='admin'
            )
            db.session.add(admin)
            
        if not Producto.query.filter_by(nombre='Coctel de la Casa').first():
            p1 = Producto(
                nombre='Coctel de la Casa',
                descripcion='Bebida premium neón',
                categoria='Cocteles',
                precio_base=35000,
                precio_pequena=35000,
                precio_venta=35000,
                costo_unitario=15000,
                precio_compra=15000,
                stock=50,
            )
            db.session.add(p1)
            
        if Mesa.query.count() == 0:
            for i in range(1, 21):
                db.session.add(Mesa(numero_mesa=i, estado='LIBRE'))
            
        db.session.commit()
        return jsonify({"status": "success", "message": "¡Base de datos de Seasons Club inicializada!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    logging.basicConfig(level=logging.WARNING)
    with app.app_context():
        db.create_all()
        try:
            ensure_producto_costo_unitario()
        except Exception as e:
            logging.warning('No se pudo verificar costo_unitario en producto: %s', e)
        admin_email = 'admin@seasonsclub.com'
        admin_existente = Usuario.query.filter_by(email=admin_email).first()
        
        if not admin_existente:
            nuevo_hash = hash_password('admin1')
            nuevo_admin = Usuario(
                nombre='Administrador',
                email=admin_email,
                contrasena_hash=nuevo_hash,
                rol='admin'
            )
            db.session.add(nuevo_admin)
            db.session.commit()

        mesero_email = 'mesero@seasonsclub.com'
        if not Usuario.query.filter_by(email=mesero_email).first():
            db.session.add(Usuario(
                nombre='Mesero Demo',
                email=mesero_email,
                contrasena_hash=hash_password('mesero1'),
                rol='mesero',
            ))
            db.session.commit()
            
        if Mesa.query.count() == 0:
            for i in range(1, 21):
                db.session.add(Mesa(numero_mesa=i, estado='LIBRE'))
            db.session.commit()

    app.run(debug=True, host='0.0.0.0', port=5000)