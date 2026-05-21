from flask import Blueprint, jsonify, request
from models.database import db
from models.producto import Producto  # Asegúrate de tener el modelo 'Producto'

producto_blueprint = Blueprint('productos', __name__)

@producto_blueprint.route('/productos', methods=['GET'])
def get_productos():
    try:
        productos = Producto.query.all()
        return jsonify([p.serializar() for p in productos]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@producto_blueprint.route('/productos/<int:id>/stock', methods=['PATCH'])
def actualizar_stock(id):
    datos = request.get_json()
    cantidad = datos.get('cantidad') # Puede ser positivo o negativo
    
    try:
        producto = Producto.query.get(id)
        if not producto:
            return jsonify({"error": "Producto no encontrado"}), 404
        
        # Actualizamos el stock
        producto.stock_actual += int(cantidad)
        db.session.commit()
        
        return jsonify({"mensaje": "Stock actualizado", "nuevo_stock": producto.stock_actual}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500