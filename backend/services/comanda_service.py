"""
Servicio de comanda — Fase A.

Fuente de verdad: pedido_linea.
Tras cada mutación se recalcula pedido.total y se regenera articulos_json
para mantener compatibilidad con el frontend Angular.
"""

from __future__ import annotations

import json
import logging
from decimal import Decimal

from database import db
from models.mesa import Mesa
from models.pedido import Pedido
from models.pedido_linea import PedidoLinea

logger = logging.getLogger(__name__)

ESTADO_PENDIENTE = 'pendiente'


class ComandaError(Exception):
    """Error de negocio en operaciones de comanda."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def persistir_cambios_comanda(pedido: Pedido, *, commit: bool = True) -> Pedido:
    """
    Sincroniza pedido_linea → total + articulos_json.

    Orden obligatorio tras mutar líneas:
      1. recalcular_total_desde_lineas()  (SUM cantidad * precio, solo activas)
      2. sincronizar_articulos_json()     (regenera JSON legacy para el frontend)
      3. commit opcional
    """
    pedido.recalcular_total_desde_lineas()
    pedido.sincronizar_articulos_json()
    db.session.add(pedido)

    if commit:
        db.session.commit()
    else:
        db.session.flush()

    logger.debug(
        'Comanda #%s persistida: total=%s, lineas_activas=%s',
        pedido.id,
        pedido.total,
        pedido.lineas_activas().count(),
    )
    return pedido


def obtener_mesa(mesa_id: int) -> Mesa:
    mesa = Mesa.query.get(mesa_id)
    if not mesa:
        raise ComandaError('Mesa no encontrada', 404)
    return mesa


def obtener_pedido_pendiente(mesa_id: int) -> Pedido | None:
    """Comanda abierta: individual o pedido maestro si la mesa está en un grupo."""
    mesa = Mesa.query.get(mesa_id)
    if not mesa:
        return None

    if mesa.grupo_mesa_id:
        return (
            Pedido.query.filter_by(
                grupo_mesa_id=mesa.grupo_mesa_id,
                estado=ESTADO_PENDIENTE,
                tipo=Pedido.TIPO_MAESTRA,
            )
            .order_by(Pedido.id.desc())
            .first()
        )

    return (
        Pedido.query.filter_by(mesa_id=mesa_id, estado=ESTADO_PENDIENTE)
        .order_by(Pedido.id.desc())
        .first()
    )


def obtener_pedido_pendiente_o_error(mesa_id: int) -> Pedido:
    pedido = obtener_pedido_pendiente(mesa_id)
    if not pedido:
        raise ComandaError('No hay comanda activa para esta mesa', 404)
    return pedido


def crear_pedido_pendiente(mesa_id: int, *, commit: bool = True) -> Pedido:
    existente = obtener_pedido_pendiente(mesa_id)
    if existente:
        return existente

    pedido = Pedido(
        mesa_id=mesa_id,
        estado=ESTADO_PENDIENTE,
        total=Decimal('0'),
        articulos_json='[]',
        tipo=Pedido.TIPO_INDIVIDUAL,
    )
    db.session.add(pedido)
    persistir_cambios_comanda(pedido, commit=commit)
    return pedido


def _buscar_linea_activa_por_producto(pedido: Pedido, producto_id: int) -> PedidoLinea | None:
    return (
        pedido.lineas_activas()
        .filter(PedidoLinea.producto_id == int(producto_id))
        .order_by(PedidoLinea.created_at.asc())
        .first()
    )


def agregar_producto(
    mesa_id: int,
    *,
    producto_id: int,
    nombre: str,
    precio: float,
    cantidad: int = 1,
) -> Pedido:
    if cantidad <= 0:
        raise ComandaError('La cantidad debe ser mayor a cero')

    mesa = obtener_mesa(mesa_id)
    pedido = obtener_pedido_pendiente_o_error(mesa_id)
    producto_id = int(producto_id)
    precio_decimal = Decimal(str(precio))

    linea = _buscar_linea_activa_por_producto(pedido, producto_id)
    if linea:
        linea.cantidad = int(linea.cantidad or 0) + cantidad
        if float(linea.precio) != float(precio_decimal):
            linea.precio = precio_decimal
    else:
        db.session.add(
            PedidoLinea(
                pedido_id=pedido.id,
                producto_id=producto_id,
                nombre=str(nombre)[:200],
                precio=precio_decimal,
                cantidad=cantidad,
                mesa_origen_id=mesa.id,
                mesa_origen_numero=mesa.numero_mesa,
                estado_linea=PedidoLinea.ESTADO_ACTIVA,
            )
        )

    return persistir_cambios_comanda(pedido)


def modificar_cantidad(mesa_id: int, *, producto_id: int, operacion: str) -> Pedido:
    if operacion not in ('sumar', 'restar'):
        raise ComandaError("operacion debe ser 'sumar' o 'restar'")

    pedido = obtener_pedido_pendiente_o_error(mesa_id)
    linea = _buscar_linea_activa_por_producto(pedido, producto_id)

    if not linea:
        raise ComandaError('Producto no encontrado en la comanda activa', 404)

    if operacion == 'sumar':
        linea.cantidad = int(linea.cantidad or 0) + 1
    else:
        nueva_cantidad = int(linea.cantidad or 0) - 1
        if nueva_cantidad <= 0:
            db.session.delete(linea)
        else:
            linea.cantidad = nueva_cantidad

    return persistir_cambios_comanda(pedido)


def modificar_precio(mesa_id: int, *, producto_id: int, nuevo_precio: float) -> Pedido:
    try:
        precio_decimal = Decimal(str(nuevo_precio))
    except (TypeError, ValueError):
        raise ComandaError('El precio debe ser un número válido')

    if precio_decimal < 0:
        raise ComandaError('El precio no puede ser negativo')

    pedido = obtener_pedido_pendiente_o_error(mesa_id)
    lineas = (
        pedido.lineas_activas()
        .filter(PedidoLinea.producto_id == int(producto_id))
        .all()
    )
    if not lineas:
        raise ComandaError('Producto no encontrado en la comanda activa', 404)

    for linea in lineas:
        linea.precio = precio_decimal

    return persistir_cambios_comanda(pedido)


def obtener_consumo_mesa(mesa_id: int) -> dict:
    from services.grupo_mesa_service import metadatos_grupo_para_mesa
    from services.subcuenta_service import metadatos_subcuentas_para_consumo

    mesa = obtener_mesa(mesa_id)
    pedido = obtener_pedido_pendiente(mesa_id)
    meta_grupo = metadatos_grupo_para_mesa(mesa)
    meta_subcuentas = metadatos_subcuentas_para_consumo(pedido)

    if not pedido:
        return {
            'mesa_id': mesa_id,
            'tiene_consumo': False,
            'pedido': {'total': 0.0, 'articulos': []},
            **meta_grupo,
            **meta_subcuentas,
        }

    return {
        'mesa_id': mesa_id,
        'tiene_consumo': pedido.lineas_activas().count() > 0 or bool(pedido.articulos_json),
        'pedido': pedido.serialize(),
        **meta_grupo,
        **meta_subcuentas,
    }


def articulos_para_factura(pedido: Pedido | None, fallback: list | None = None) -> list[dict]:
    """Artículos enriquecidos para historial (prioriza líneas activas)."""
    if pedido:
        lineas = pedido.lineas_activas().all()
        if lineas:
            return [linea.to_articulo_legacy() for linea in lineas]
    if fallback:
        return fallback
    return []


def marcar_comanda_facturada(pedido: Pedido, *, commit: bool = True) -> Pedido:
    """Cierra comanda: líneas activas → facturada, pedido → facturado."""
    for linea in pedido.lineas_activas().all():
        linea.estado_linea = PedidoLinea.ESTADO_FACTURADA
    pedido.estado = 'facturado'
    return persistir_cambios_comanda(pedido, commit=commit)
