"""
-------------------------------------------------------------
🌌 SEASONS CLUB APP - BACKEND ROUTES
-------------------------------------------------------------
  @file        mesa_routes.py
  @description Endpoints del ORM para controlar el estado y consumos de mesas.
  @author      Camilo Martinez Galarza <Developer>
  @created     2026-05-19
  @version     1.4.0 — Fase C.1: subcuenta_service + separar cuenta
-------------------------------------------------------------
"""

import json
import logging

from flask import Blueprint, jsonify, request

from database import db
from models.mesa import Mesa
from models.venta import Venta
from models.corte_caja import CorteCaja
from models.historial_ventas import HistorialVentas
from services.comanda_service import (
    ComandaError,
    agregar_producto,
    articulos_para_factura,
    crear_pedido_pendiente,
    marcar_comanda_facturada,
    modificar_cantidad,
    modificar_precio,
    obtener_consumo_mesa,
    obtener_mesa,
    obtener_pedido_pendiente,
)
from services.grupo_mesa_service import cerrar_grupo_activo, unir_mesas
from services.subcuenta_service import crear_subcuenta
from services.reporte_service import (
    calcular_reporte_jornada,
    calcular_desglose_iva,
    normalizar_metodo_pago,
)

mesa_bp = Blueprint('mesa_bp', __name__)
logger = logging.getLogger(__name__)


@mesa_bp.route('/mesas', methods=['GET'])
def obtener_mesas():
    try:
        mesas = Mesa.query.order_by(Mesa.numero_mesa.asc()).all()
        return jsonify([m.to_dict() for m in mesas]), 200
    except Exception as e:
        logger.exception('Error al consultar mesas: %s', e)
        return jsonify({"status": "error", "message": "No se pudieron cargar las mesas"}), 500


@mesa_bp.route('/mesas/unir', methods=['POST'])
def unir_mesas_route():
    datos = request.get_json() or {}
    mesa_ids = datos.get('mesa_ids')
    mesa_anfitriona_id = datos.get('mesa_anfitriona_id')

    if not mesa_ids or mesa_anfitriona_id is None:
        return jsonify({
            "status": "error",
            "message": "mesa_ids y mesa_anfitriona_id son requeridos",
        }), 400

    try:
        resultado = unir_mesas(mesa_ids, mesa_anfitriona_id)
        return jsonify({
            "status": "success",
            "message": "Mesas unidas correctamente",
            **resultado,
        }), 201
    except ComandaError as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": e.message}), e.status
    except Exception as e:
        db.session.rollback()
        logger.exception('Error al unir mesas: %s', e)
        return jsonify({"status": "error", "message": "No se pudieron unir las mesas"}), 500


@mesa_bp.route('/mesas/<int:id>/separar', methods=['POST'])
def separar_cuenta_mesa_route(id):
    datos = request.get_json() or {}
    etiqueta = datos.get('etiqueta')
    lineas = datos.get('lineas')

    if not etiqueta or not lineas:
        return jsonify({
            "status": "error",
            "message": "etiqueta y lineas son requeridos",
        }), 400

    try:
        resultado = crear_subcuenta(id, etiqueta, lineas)
        return jsonify({
            "status": "success",
            "message": "Subcuenta creada correctamente",
            **resultado,
        }), 201
    except ComandaError as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": e.message}), e.status
    except Exception as e:
        db.session.rollback()
        logger.exception('Error al separar cuenta mesa %s: %s', id, e)
        return jsonify({"status": "error", "message": "No se pudo separar la cuenta"}), 500


@mesa_bp.route('/mesas/<int:id>/estado', methods=['PATCH'])
def cambiar_estado_mesa(id):
    datos = request.get_json() or {}
    nuevo_estado = datos.get('estado')

    if not nuevo_estado or nuevo_estado not in ['LIBRE', 'OCUPADA']:
        return jsonify({"status": "error", "message": "Estado inválido"}), 400

    try:
        mesa = obtener_mesa(id)

        if nuevo_estado == 'OCUPADA':
            crear_pedido_pendiente(id, commit=False)
            mesa.estado = 'OCUPADA'

        elif nuevo_estado == 'LIBRE':
            pedido_activo = obtener_pedido_pendiente(id)
            if pedido_activo:
                pedido_activo.estado = 'pagado'
            mesa.estado = 'LIBRE'

        db.session.commit()
        return jsonify({
            "status": "success",
            "message": f"Mesa #{mesa.numero_mesa} ahora está {mesa.estado}",
        }), 200

    except ComandaError as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": e.message}), e.status
    except Exception as e:
        db.session.rollback()
        logger.exception('Error al cambiar estado de mesa %s: %s', id, e)
        return jsonify({"status": "error", "message": "Error interno del servidor"}), 500


@mesa_bp.route('/mesas/<int:id>/cantidad', methods=['POST'])
def modificar_cantidad_articulo(id):
    datos = request.get_json() or {}
    producto_id = datos.get('producto_id')
    operacion = datos.get('operacion')

    if not producto_id or operacion not in ['sumar', 'restar']:
        return jsonify({"status": "error", "message": "Parámetros insuficientes"}), 400

    try:
        pedido = modificar_cantidad(id, producto_id=int(producto_id), operacion=operacion)
        return jsonify({"status": "success", "pedido": pedido.serialize()}), 200
    except ComandaError as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": e.message}), e.status
    except Exception as e:
        db.session.rollback()
        logger.exception('Error al modificar cantidad en mesa %s: %s', id, e)
        return jsonify({"status": "error", "message": "Error al alterar cantidades"}), 500


@mesa_bp.route('/mesas/<int:id>/precio', methods=['POST'])
def modificar_precio_articulo(id):
    datos = request.get_json() or {}
    producto_id = datos.get('producto_id')
    nuevo_precio = datos.get('nuevo_precio')

    if not producto_id or nuevo_precio is None:
        return jsonify({"status": "error", "message": "Parámetros insuficientes"}), 400

    try:
        pedido = modificar_precio(id, producto_id=int(producto_id), nuevo_precio=nuevo_precio)
        return jsonify({"status": "success", "pedido": pedido.serialize()}), 200
    except ComandaError as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": e.message}), e.status
    except Exception as e:
        db.session.rollback()
        logger.exception('Error al modificar precio en mesa %s: %s', id, e)
        return jsonify({"status": "error", "message": "Error al alterar el precio"}), 500


@mesa_bp.route('/mesas/<int:id>/consumo', methods=['GET'])
def obtener_consumo_mesa_route(id):
    try:
        return jsonify(obtener_consumo_mesa(id)), 200
    except ComandaError as e:
        return jsonify({"status": "error", "message": e.message}), e.status
    except Exception as e:
        logger.exception('Error al consultar consumo de la mesa %s: %s', id, e)
        return jsonify({"status": "error", "message": "No se pudo recuperar el consumo de la barra"}), 500


@mesa_bp.route('/productos-barra', methods=['GET'])
def obtener_productos_barra():
    try:
        from models.producto import Producto
        lista_productos = Producto.query.all()
        resultado = []
        for p in lista_productos:
            resultado.append({
                "id": p.id,
                "nombre": p.nombre,
                "categoria": p.categoria or "Barra",
                "precio": float(p.precio_base),
            })
        return jsonify(resultado), 200
    except Exception as e:
        logger.exception('Error al traer productos de barra: %s', e)
        return jsonify({"status": "error", "message": "No se pudo cargar el menú de la barra"}), 500


@mesa_bp.route('/mesas/<int:id>/añadir', methods=['POST'])
@mesa_bp.route('/mesas/<int:id>/agregar', methods=['POST'])
def añadir_producto_a_mesa(id):
    datos = request.get_json() or {}
    producto_id = datos.get('producto_id')
    nombre_prod = datos.get('nombre')
    precio_prod = datos.get('precio')
    cantidad_a_sumar = int(datos.get('cantidad', 1))

    if not producto_id or not nombre_prod or precio_prod is None:
        return jsonify({"status": "error", "message": "Datos de producto incompletos"}), 400

    try:
        pedido = agregar_producto(
            id,
            producto_id=int(producto_id),
            nombre=str(nombre_prod),
            precio=float(precio_prod),
            cantidad=cantidad_a_sumar,
        )
        return jsonify({
            "status": "success",
            "message": f"💥 ¡{nombre_prod} agregado con éxito!",
            "pedido": pedido.serialize(),
        }), 200
    except ComandaError as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": e.message}), e.status
    except Exception as e:
        db.session.rollback()
        logger.exception('Error al añadir producto a la mesa %s: %s', id, e)
        return jsonify({"status": "error", "message": "Error interno al cargar el consumo"}), 500


@mesa_bp.route('/facturas', methods=['POST'])
def crear_factura():
    datos = request.get_json() or {}
    mesa_id = datos.get('mesa_id')
    metodo_pago = normalizar_metodo_pago(datos.get('metodo_pago', 'Efectivo'))
    pedido_data = datos.get('pedido', {})

    if not mesa_id:
        return jsonify({"status": "error", "message": "mesa_id es requerido"}), 400

    try:
        mesa = obtener_mesa(int(mesa_id))
        pedido = obtener_pedido_pendiente(int(mesa_id))

        articulos = articulos_para_factura(pedido, pedido_data.get('articulos', []))
        total = float(pedido.total if pedido else pedido_data.get('total', 0) or 0)

        if total <= 0:
            return jsonify({"status": "error", "message": "El total de la factura debe ser mayor a cero"}), 400

        subtotal, iva = calcular_desglose_iva(total)

        nueva_venta = Venta(
            mesa_id=mesa_id,
            total_venta=total,
            metodo_pago=metodo_pago,
        )
        db.session.add(nueva_venta)
        db.session.flush()

        historial = HistorialVentas(
            mesa_id=mesa_id,
            numero_mesa=mesa.numero_mesa,
            venta_id=nueva_venta.id,
            total=total,
            subtotal=subtotal,
            iva=iva,
            metodo_pago=metodo_pago,
            articulos_json=json.dumps(articulos, ensure_ascii=False),
        )
        db.session.add(historial)

        if pedido:
            marcar_comanda_facturada(pedido, commit=False)

        grupo_id = mesa.grupo_mesa_id
        if grupo_id:
            cerrar_grupo_activo(grupo_id, commit=False)
        else:
            mesa.estado = 'LIBRE'

        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Factura guardada y venta registrada",
            "venta_id": nueva_venta.id,
            "historial_id": historial.id,
        }), 201

    except ComandaError as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": e.message}), e.status
    except Exception as e:
        db.session.rollback()
        logger.exception('Error al facturar: %s', e)
        return jsonify({"status": "error", "message": "Error al procesar factura"}), 500


@mesa_bp.route('/reporte/diario', methods=['GET'])
def obtener_reporte_diario():
    try:
        reporte = calcular_reporte_jornada()
        return jsonify(reporte), 200
    except Exception as e:
        logger.exception('Error al generar reporte diario: %s', e)
        return jsonify({"status": "error", "message": "No se pudo generar el reporte diario"}), 500


@mesa_bp.route('/reporte/cierre', methods=['POST'])
def realizar_cierre_caja():
    try:
        reporte = calcular_reporte_jornada()

        if reporte['cantidad_ventas'] == 0:
            return jsonify({
                "status": "error",
                "message": "No hay ventas en la jornada actual para cerrar",
            }), 400

        nuevo_corte = CorteCaja(
            total_ventas=reporte['total'],
            efectivo=reporte['efectivo'],
            transferencia=reporte['transferencia'],
            cantidad_ventas=reporte['cantidad_ventas'],
        )
        db.session.add(nuevo_corte)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Cierre de caja registrado correctamente",
            "corte": nuevo_corte.to_dict(),
            "reporte_cerrado": reporte,
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.exception('Error al realizar cierre de caja: %s', e)
        return jsonify({"status": "error", "message": "Error al registrar el cierre de caja"}), 500


@mesa_bp.route('/reporte/cierres', methods=['GET'])
def obtener_historial_cierres():
    try:
        cortes = CorteCaja.query.order_by(CorteCaja.fecha_corte.desc()).limit(100).all()
        resultado = []
        for corte in cortes:
            data = corte.to_dict()
            subtotal, iva = calcular_desglose_iva(corte.total_ventas)
            data['total'] = round(float(corte.total_ventas), 2)
            data['subtotal'] = subtotal
            data['iva'] = iva
            resultado.append(data)
        return jsonify(resultado), 200
    except Exception as e:
        logger.exception('Error al consultar historial de cierres: %s', e)
        return jsonify({"status": "error", "message": "No se pudo cargar el historial de cierres"}), 500


@mesa_bp.route('/historial-ventas', methods=['GET'])
def obtener_historial_ventas():
    mesa_id = request.args.get('mesa_id', type=int)
    try:
        query = HistorialVentas.query.order_by(HistorialVentas.fecha.desc())
        if mesa_id:
            query = query.filter_by(mesa_id=mesa_id)
        historial = query.limit(100).all()
        return jsonify([h.to_dict() for h in historial]), 200
    except Exception as e:
        logger.exception('Error al consultar historial de ventas: %s', e)
        return jsonify({"status": "error", "message": "No se pudo cargar el historial de ventas"}), 500
