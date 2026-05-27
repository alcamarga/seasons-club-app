import logging
import os
import uuid

from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename
from database import db
from models.producto import Producto

producto_blueprint = Blueprint('productos', __name__)
logger = logging.getLogger(__name__)


def _respuesta_error(exc: Exception, status: int):
    logger.exception("Error en rutas de productos: %s", exc)
    return jsonify({"error": str(exc)}), status


@producto_blueprint.route('/productos', methods=['GET', 'POST', 'OPTIONS'])
def gestionar_productos():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    if request.method == 'GET':
        try:
            productos = Producto.query.all()
            return jsonify([p.serializar() for p in productos]), 200
        except Exception as e:
            return _respuesta_error(e, 500)

    if request.method == 'POST':
        try:
            data = request.get_json(silent=True) or {}
            if not data.get('nombre'):
                return jsonify({"error": "El nombre es obligatorio"}), 400

            Producto.parse_costo_unitario(data)
            Producto.parse_precio_venta(data)

            nuevo_prod = Producto(nombre=data['nombre'], precio_base=0)
            nuevo_prod.aplicar_payload_inventario(data)
            db.session.add(nuevo_prod)
            db.session.commit()
            return jsonify(nuevo_prod.serializar()), 201
        except ValueError as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            db.session.rollback()
            return _respuesta_error(e, 400)


@producto_blueprint.route('/productos/<int:id>', methods=['PUT', 'DELETE', 'OPTIONS'])
def gestionar_producto_por_id(id: int):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    producto = Producto.query.get(id)
    if not producto:
        return jsonify({"error": "Producto no encontrado"}), 404

    if request.method == 'PUT':
        try:
            data = request.get_json(silent=True) or {}
            if not data.get('nombre'):
                return jsonify({"error": "El nombre es obligatorio"}), 400

            Producto.parse_costo_unitario(data)
            Producto.parse_precio_venta(data)

            producto.aplicar_payload_inventario(data)
            db.session.add(producto)
            db.session.commit()
            db.session.refresh(producto)
            return jsonify(producto.serializar()), 200
        except ValueError as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            db.session.rollback()
            return _respuesta_error(e, 400)

    if request.method == 'DELETE':
        try:
            db.session.delete(producto)
            db.session.commit()
            return jsonify({"mensaje": "Producto eliminado"}), 200
        except Exception as e:
            db.session.rollback()
            return _respuesta_error(e, 500)


@producto_blueprint.route('/productos/<int:id>/stock', methods=['PATCH', 'OPTIONS'])
def actualizar_stock(id: int):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    datos = request.get_json(silent=True) or {}
    cantidad = datos.get('delta', 0)

    try:
        producto = Producto.query.get(id)
        if not producto:
            return jsonify({"error": "Producto no encontrado"}), 404

        # Mantenemos tu lógica de validación de stock positivo
        producto.stock = max(0, int(producto.stock or 0) + int(cantidad))
        db.session.commit()

        return jsonify({
            "mensaje": "Stock actualizado",
            "nuevo_stock": producto.stock,
            "producto": producto.serializar(),
        }), 200
    except Exception as e:
        db.session.rollback()
        return _respuesta_error(e, 500)


@producto_blueprint.route('/productos/<int:id>/imagen', methods=['POST', 'OPTIONS'])
def subir_imagen_producto(id: int):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        producto = Producto.query.get(id)
        if not producto:
            return jsonify({"error": "Producto no encontrado"}), 404

        archivo = request.files.get('imagen') or request.files.get('file')
        if not archivo or not archivo.filename:
            return jsonify({"error": "No se recibió archivo de imagen"}), 400

        nombre_seguro = secure_filename(archivo.filename)
        extension = nombre_seguro.rsplit('.', 1)[-1].lower() if '.' in nombre_seguro else 'jpg'
        if extension not in {'png', 'jpg', 'jpeg', 'gif', 'webp'}:
            return jsonify({"error": "Formato de imagen no permitido"}), 400

        carpeta = current_app.config.get('UPLOAD_FOLDER', 'static/uploads')
        os.makedirs(carpeta, exist_ok=True)
        nombre_final = f"producto_{id}_{uuid.uuid4().hex[:8]}.{extension}"
        ruta_absoluta = os.path.join(carpeta, nombre_final)
        archivo.save(ruta_absoluta)

        url_publica = f"/static/uploads/{nombre_final}"
        producto.imagen_url = url_publica
        db.session.commit()

        return jsonify({
            "mensaje": "Imagen subida correctamente",
            "imagenUrl": url_publica,
            "producto": producto.serializar(),
        }), 200
    except Exception as e:
        db.session.rollback()
        return _respuesta_error(e, 400)
