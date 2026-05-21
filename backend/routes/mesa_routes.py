"""
-------------------------------------------------------------
🌌 SEASONS CLUB APP - BACKEND ROUTES
-------------------------------------------------------------
  @file        mesa_routes.py
  @description Endpoints del ORM para controlar el estado y consumos de mesas.
  @author      Camilo Martinez Galarza <Developer>
  @created     2026-05-19
  @version     1.1.0
-------------------------------------------------------------
"""

from flask import Blueprint, jsonify, request
from models.database import db
from models.mesa import Mesa
from models.pedido import Pedido

mesa_bp = Blueprint('mesa_bp', __name__)

# 🟢 GET: Obtener todas las mesas desde PostgreSQL usando el ORM
@mesa_bp.route('/mesas', methods=['GET'])
def obtener_mesas():
    try:
        mesas = Mesa.query.order_by(Mesa.numero_mesa.asc()).all()
        return jsonify([m.to_dict() for m in mesas]), 200
    except Exception as e:
        print(f"❌ Error al consultar mesas en BD: {e}")
        return jsonify({"status": "error", "message": "No se pudieron cargar las mesas"}), 500


# 💳 PATCH: Cambiar estado de la mesa (Con cierre de cuenta REAL estilo POS)
@mesa_bp.route('/mesas/<int:id>/estado', methods=['PATCH'])
def cambiar_estado_mesa(id):
    datos = request.get_json() or {}
    nuevo_estado = datos.get('estado')

    if not nuevo_estado or nuevo_estado not in ['LIBRE', 'OCUPADA']:
        return jsonify({"status": "error", "message": "Estado inválido"}), 400

    try:
        mesa = Mesa.query.get(id)
        if not mesa:
            return jsonify({"status": "error", "message": "Mesa no encontrada"}), 404

        # 🚀 ESCENARIO A: Si abrimos la comanda (LIBRE -> OCUPADA)
        if nuevo_estado == 'OCUPADA':
            pedido_activo = Pedido.query.filter_by(mesa_id=id, estado='pendiente').first()
            if not pedido_activo:
                nuevo_pedido = Pedido(mesa_id=id, estado='pendiente', total=0.0, articulos_json='[]')
                db.session.add(nuevo_pedido)
            mesa.estado = 'OCUPADA'

        # 🚀 ESCENARIO B: Si cerramos la cuenta (OCUPADA -> LIBRE)
        elif nuevo_estado == 'LIBRE':
            pedido_activo = Pedido.query.filter_by(mesa_id=id, estado='pendiente').first()
            if pedido_activo:
                # Cambiamos el estado a 'pagado' para guardarlo en las ventas del club
                pedido_activo.estado = 'pagado'
                # NOTA: Mantenemos mesa_id=id para evitar conflictos con restricciones 'NOT NULL' en PostgreSQL
            
            # Liberamos el estado físico de la mesa para nuevos clientes
            mesa.estado = 'LIBRE'
        db.session.commit()
        return jsonify({"status": "success", "message": f"Mesa #{mesa.numero_mesa} ahora está {mesa.estado}"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error al cambiar estado de mesa {id}: {e}")
        return jsonify({"status": "error", "message": "Error interno del servidor"}), 500


# 📊 POST: Modificar cantidades en el JSON ([+] [-] o eliminar ítem)
@mesa_bp.route('/mesas/<int:id>/cantidad', methods=['POST'])
def modificar_cantidad_articulo(id):
    datos = request.get_json() or {}
    producto_id = datos.get('producto_id')
    operacion = datos.get('operacion') # 'sumar' o 'restar'

    if not producto_id or operacion not in ['sumar', 'restar']:
        return jsonify({"status": "error", "message": "Parámetros insuficientes"}), 400

    try:
        import json
        pedido_activo = Pedido.query.filter_by(mesa_id=id, estado='pendiente').first()
        if not pedido_activo or not pedido_activo.articulos_json:
            return jsonify({"status": "error", "message": "No hay comanda activa"}), 404

        articulos = json.loads(pedido_activo.articulos_json)
        nuevos_articulos = []

        for art in articulos:
            if art['producto_id'] == producto_id:
                if operacion == 'sumar':
                    art['cantidad'] += 1
                    nuevos_articulos.append(art)
                elif operacion == 'restar':
                    art['cantidad'] -= 1
                    # Si la cantidad baja de 1, el producto se elimina automáticamente del ticket
                    if art['cantidad'] > 0:
                        nuevos_articulos.append(art)
            else:
                nuevos_articulos.append(art)

        # Recalculamos el total acumulado exacto con los ítems que quedaron
        nuevo_total = sum(item['cantidad'] * item['precio'] for item in nuevos_articulos)

        pedido_activo.articulos_json = json.dumps(nuevos_articulos)
        pedido_activo.total = nuevo_total
        db.session.commit()

        return jsonify({"status": "success", "pedido": pedido_activo.serialize()}), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error al modificar cantidad en mesa {id}: {e}")
        return jsonify({"status": "error", "message": "Error al alterar cantidades"}), 500

# 💰 POST: Modificar el PRECIO de un artículo en caliente (Para descuentos de Admin)
@mesa_bp.route('/mesas/<int:id>/precio', methods=['POST'])
def modificar_precio_articulo(id):
    datos = request.get_json() or {}
    producto_id = datos.get('producto_id')
    nuevo_precio = datos.get('nuevo_precio')

    if not producto_id or nuevo_precio is None:
        return jsonify({"status": "error", "message": "Parámetros insuficientes"}), 400

    try:
        try:
            nuevo_precio = float(nuevo_precio)
        except ValueError:
            return jsonify({"status": "error", "message": "El precio debe ser un número válido"}), 400

        import json
        pedido_activo = Pedido.query.filter_by(mesa_id=id, estado='pendiente').first()
        if not pedido_activo or not pedido_activo.articulos_json:
            return jsonify({"status": "error", "message": "No hay comanda activa"}), 404

        articulos = json.loads(pedido_activo.articulos_json)
        
        # Buscamos el producto en el JSON y le actualizamos el precio de venta real
        for art in articulos:
            if art['producto_id'] == producto_id:
                art['precio'] = nuevo_precio

        # Recalculamos el total de la cuenta con el nuevo precio rebajado o alterado
        nuevo_total = sum(item['cantidad'] * item['precio'] for item in articulos)

        pedido_activo.articulos_json = json.dumps(articulos)
        pedido_activo.total = nuevo_total
        db.session.commit()

        return jsonify({"status": "success", "pedido": pedido_activo.serialize()}), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error al modificar precio en mesa {id}: {e}")
        return jsonify({"status": "error", "message": "Error al alterar el precio"}), 500
# 🍹 NEW GET: Obtener la cuenta acumulada real de una mesa específica
@mesa_bp.route('/mesas/<int:id>/consumo', methods=['GET'])
def obtener_consumo_mesa(id):
    try:
        mesa = Mesa.query.get(id)
        if not mesa:
            return jsonify({"status": "error", "message": "Mesa no encontrada"}), 404
            
        # Buscamos la comanda pendiente enlazada a esta mesa
        pedido_activo = Pedido.query.filter_by(mesa_id=id, estado='pendiente').first()
        
        if pedido_activo:
            # Si hay consumo, retornamos el ticket real mapeado por el método serialize()
            return jsonify({
                "mesa_id": id,
                "tiene_consumo": True,
                "pedido": pedido_activo.serialize()
            }), 200
        else:
            # Si está libre o no tiene tragos cargados aún
            return jsonify({
                "mesa_id": id,
                "tiene_consumo": False,
                "pedido": { "total": 0.00, "articulos": [] }
            }), 200
            
    except Exception as e:
        print(f"❌ Error al consultar consumo de la mesa {id}: {e}")
        return jsonify({"status": "error", "message": "No se pudo recuperar el consumo de la barra"}), 500
# 🍹 NUEVO GET: Obtener la lista de licores/productos disponibles en la barra
@mesa_bp.route('/productos-barra', methods=['GET'])
def obtener_productos_barra():
    try:
        from models.producto import Producto
        # Traemos todos los productos de la base de datos
        lista_productos = Producto.query.all()
        
        # Los serializamos de forma rápida para el menú de Seasons Club
        resultado = []
        for p in lista_productos:
            resultado.append({
                "id": p.id,
                "nombre": p.nombre,
                "categoria": p.categoria or "Barra",
                "precio": float(p.precio_base) # Usamos el precio base para los licores
            })
        return jsonify(resultado), 200
    except Exception as e:
        print(f"❌ Error al traer productos de barra: {e}")
        return jsonify({"status": "error", "message": "No se pudo cargar el menú de la barra"}), 500


# ⚡ NUEVO POST: Inyectar un trago o producto a la comanda activa de la mesa
@mesa_bp.route('/mesas/<int:id>/añadir', methods=['POST'])
def añadir_producto_a_mesa(id):
    datos = request.get_json() or {}
    producto_id = datos.get('producto_id')
    nombre_prod = datos.get('nombre')
    precio_prod = datos.get('precio')
    cantidad_a_sumar = int(datos.get('cantidad', 1))

    if not producto_id or not nombre_prod or not precio_prod:
        return jsonify({"status": "error", "message": "Datos de producto incompletos"}), 400

    try:
        import json
        # 1. Buscamos la comanda abierta (pendiente) de esa mesa
        pedido_activo = Pedido.query.filter_by(mesa_id=id, estado='pendiente').first()
        
        if not pedido_activo:
            return jsonify({"status": "error", "message": "No hay una comanda activa para esta mesa"}), 404

        # 2. Deserializamos los artículos que ya se ha tomado la mesa
        articulos = []
        if pedido_activo.articulos_json:
            try:
                articulos = json.loads(pedido_activo.articulos_json)
            except Exception:
                articulos = []

        # 3. Buscamos si el trago ya estaba en la cuenta para solo sumarle la cantidad
        encontrado = False
        for art in articulos:
            if art['producto_id'] == producto_id:
                art['cantidad'] += cantidad_a_sumar
                encontrado = True
                break

        # 4. Si es el primer trago de ese tipo, lo agregamos al arreglo
        if not encontrado:
            articulos.append({
                "producto_id": producto_id,
                "nombre": nombre_prod,
                "precio": float(precio_prod),
                "cantidad": cantidad_a_sumar
            })

        # 5. Recalculamos el total acumulado de la comanda en tiempo real
        nuevo_total = sum(item['cantidad'] * item['precio'] for item in articulos)

        # 6. Guardamos los cambios de vuelta en PostgreSQL
        pedido_activo.articulos_json = json.dumps(articulos)
        pedido_activo.total = nuevo_total
        
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"💥 ¡{nombre_prod} agregado con éxito!",
            "pedido": pedido_activo.serialize()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error al añadir producto a la mesa {id}: {e}")
        return jsonify({"status": "error", "message": "Error interno al cargar el consumo"}), 500