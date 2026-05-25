"""Rutas de autenticación: login y logout con JWT + bcrypt."""

from datetime import datetime, timedelta, timezone
import jwt
from flask import Blueprint, current_app, jsonify, request

# IMPORTANTE: Cambiamos User por Usuario para que coincida con tu base de datos
from usuario import Usuario
from password_utils import verify_password

auth_bp = Blueprint('auth', __name__)

JWT_EXPIRACION_HORAS = 24

def _extraer_credenciales() -> tuple[str, str]:
    datos = request.get_json(silent=True) or request.form.to_dict() or {}
    # Ajustado para buscar 'email' ya que es tu campo principal
    email = str(datos.get('email') or '').strip()
    password = str(datos.get('contrasena') or datos.get('password') or '')
    return email, password

def _generar_token(user: Usuario) -> str:
    payload = {
        'sub': user.id,
        'email': user.email,
        'role': user.rol,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRACION_HORAS),
    }
    return jwt.encode(
        payload,
        current_app.config['SECRET_KEY'],
        algorithm='HS256',
    )

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    email, password = _extraer_credenciales()
    if not email or not password:
        return jsonify({'error': 'Email y contraseña son obligatorios'}), 400

    # BUSCAMOS EN EL MODELO Usuario
    user = Usuario.query.filter_by(email=email).first()
    
    # VALIDAMOS CON contrasena_hash
    if not user or not verify_password(password, user.contrasena_hash):
        return jsonify({'error': 'Usuario o contraseña incorrectos'}), 401

    token = _generar_token(user)
    
    # Asumimos que tu modelo Usuario tiene un método serializar o creamos el dict manualmente
    usuario_data = {
        'id': user.id,
        'nombre': user.nombre,
        'email': user.email,
        'rol': user.rol
    }

    return jsonify({
        'access_token': token,
        'usuario': usuario_data,
        'rol': user.rol,
        'email': user.email,
    }), 200

@auth_bp.route('/logout', methods=['POST', 'OPTIONS'])
def logout():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    return jsonify({'message': 'Sesión cerrada correctamente'}), 200