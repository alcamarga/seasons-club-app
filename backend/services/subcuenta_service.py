"""
Servicio de subcuentas — Fase C.1.

Separa líneas del pedido padre (individual | maestra) hacia pedidos tipo subcuenta.
Reutiliza persistir_cambios_comanda() como guardián de integridad.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from decimal import Decimal

from database import db
from models.mesa import Mesa
from models.pedido import Pedido
from models.pedido_linea import PedidoLinea
from services.comanda_service import (
    ComandaError,
    ESTADO_PENDIENTE,
    obtener_mesa,
    obtener_pedido_pendiente,
    persistir_cambios_comanda,
)

logger = logging.getLogger(__name__)

ETIQUETA_MAX_LEN = 100
TIPOS_PADRE_PERMITIDOS = (Pedido.TIPO_INDIVIDUAL, Pedido.TIPO_MAESTRA)


@dataclass
class LineaSeparacionSolicitud:
    linea_id: uuid.UUID
    cantidad: int | None = None


@dataclass
class SeparacionContext:
    mesa: Mesa
    pedido_padre: Pedido
    etiqueta: str
    movimientos: list[tuple[PedidoLinea, int]]


def _parse_uuid(linea_id_raw) -> uuid.UUID:
    try:
        return uuid.UUID(str(linea_id_raw))
    except (TypeError, ValueError, AttributeError):
        raise ComandaError('linea_id debe ser un UUID válido', 400)


def _normalizar_lineas_payload(lineas_raw: list) -> list[LineaSeparacionSolicitud]:
    if not lineas_raw or not isinstance(lineas_raw, list):
        raise ComandaError('lineas debe ser una lista con al menos un ítem', 400)

    resultado: list[LineaSeparacionSolicitud] = []
    vistos: set[uuid.UUID] = set()

    for item in lineas_raw:
        if not isinstance(item, dict):
            raise ComandaError('Cada ítem de lineas debe ser un objeto', 400)

        linea_uuid = _parse_uuid(item.get('linea_id'))
        if linea_uuid in vistos:
            raise ComandaError('lineas no puede repetir el mismo linea_id', 400)
        vistos.add(linea_uuid)

        cantidad_raw = item.get('cantidad')
        cantidad: int | None = None
        if cantidad_raw is not None:
            try:
                cantidad = int(cantidad_raw)
            except (TypeError, ValueError):
                raise ComandaError('cantidad debe ser un entero válido', 400)
            if cantidad <= 0:
                raise ComandaError('cantidad debe ser mayor a cero', 400)

        resultado.append(LineaSeparacionSolicitud(linea_id=linea_uuid, cantidad=cantidad))

    return resultado


def validar_separacion(
    mesa_id: int,
    etiqueta: str,
    lineas_raw: list,
) -> SeparacionContext:
    """
    Valida reglas de negocio antes de crear una subcuenta.
    Lanza ComandaError (400/404/409) si alguna regla falla.
    """
    mesa = obtener_mesa(mesa_id)

    if mesa.estado != 'OCUPADA':
        raise ComandaError(
            f'La mesa #{mesa.numero_mesa} debe estar OCUPADA para separar cuenta',
            400,
        )

    etiqueta_limpia = (etiqueta or '').strip()
    if not etiqueta_limpia:
        raise ComandaError('etiqueta es requerida', 400)
    if len(etiqueta_limpia) > ETIQUETA_MAX_LEN:
        raise ComandaError(f'etiqueta no puede superar {ETIQUETA_MAX_LEN} caracteres', 400)

    pedido_padre = obtener_pedido_pendiente(mesa_id)
    if not pedido_padre:
        raise ComandaError('No hay comanda activa para separar en esta mesa', 404)

    if pedido_padre.estado != ESTADO_PENDIENTE:
        raise ComandaError('Solo se pueden separar líneas de comandas pendientes', 400)

    if pedido_padre.tipo not in TIPOS_PADRE_PERMITIDOS:
        raise ComandaError(
            'Solo el pedido principal (individual o maestra) admite separación',
            400,
        )

    solicitudes = _normalizar_lineas_payload(lineas_raw)
    movimientos: list[tuple[PedidoLinea, int]] = []

    for solicitud in solicitudes:
        linea = PedidoLinea.query.get(solicitud.linea_id)
        if not linea:
            raise ComandaError(f'Línea {solicitud.linea_id} no encontrada', 404)

        if linea.pedido_id != pedido_padre.id:
            raise ComandaError(
                'La línea no pertenece a la comanda principal de esta mesa',
                409,
            )

        if linea.estado_linea != PedidoLinea.ESTADO_ACTIVA:
            raise ComandaError(
                f'La línea {solicitud.linea_id} no está activa',
                409,
            )

        cantidad_linea = int(linea.cantidad or 0)
        cantidad_mover = solicitud.cantidad if solicitud.cantidad is not None else cantidad_linea

        if cantidad_mover > cantidad_linea:
            raise ComandaError(
                f'cantidad a mover ({cantidad_mover}) supera la disponible ({cantidad_linea}) '
                f'para la línea {solicitud.linea_id}',
                400,
            )

        movimientos.append((linea, cantidad_mover))

    return SeparacionContext(
        mesa=mesa,
        pedido_padre=pedido_padre,
        etiqueta=etiqueta_limpia,
        movimientos=movimientos,
    )


def _mover_cantidad_linea(
    linea: PedidoLinea,
    cantidad_mover: int,
    pedido_destino: Pedido,
) -> None:
    """Mueve cantidad completa o parcial hacia el pedido destino."""
    cantidad_linea = int(linea.cantidad or 0)

    if cantidad_mover >= cantidad_linea:
        linea.pedido_id = pedido_destino.id
        return

    db.session.add(
        PedidoLinea(
            pedido_id=pedido_destino.id,
            producto_id=linea.producto_id,
            nombre=linea.nombre,
            precio=linea.precio,
            cantidad=cantidad_mover,
            mesa_origen_id=linea.mesa_origen_id,
            mesa_origen_numero=linea.mesa_origen_numero,
            estado_linea=PedidoLinea.ESTADO_ACTIVA,
        )
    )
    linea.cantidad = cantidad_linea - cantidad_mover


def listar_subcuentas_pendientes(pedido_padre_id: int) -> list[Pedido]:
    return (
        Pedido.query.filter_by(
            pedido_padre_id=pedido_padre_id,
            estado=ESTADO_PENDIENTE,
            tipo=Pedido.TIPO_SUBCUENTA,
        )
        .order_by(Pedido.id.asc())
        .all()
    )


def metadatos_subcuentas_para_consumo(pedido_padre: Pedido | None) -> dict:
    """Bloque subcuentas + total_pendiente_mesa para GET /consumo."""
    if not pedido_padre:
        return {
            'subcuentas': [],
            'tiene_subcuentas': False,
            'total_pendiente_mesa': 0.0,
        }

    subcuentas = listar_subcuentas_pendientes(pedido_padre.id)
    total_padre = float(pedido_padre.total or 0)
    total_subcuentas = sum(float(s.total or 0) for s in subcuentas)

    return {
        'subcuentas': [s.serialize() for s in subcuentas],
        'tiene_subcuentas': len(subcuentas) > 0,
        'total_pendiente_mesa': round(total_padre + total_subcuentas, 2),
    }


def crear_subcuenta(
    mesa_id: int,
    etiqueta: str,
    lineas_raw: list,
    *,
    commit: bool = True,
) -> dict:
    """
    Crea pedido subcuenta y mueve líneas desde el pedido padre.

    Retorna resumen para la API (subcuenta, padre actualizado, contadores).
    """
    ctx = validar_separacion(mesa_id, etiqueta, lineas_raw)

    subcuenta = Pedido(
        mesa_id=ctx.mesa.id,
        estado=ESTADO_PENDIENTE,
        total=Decimal('0'),
        articulos_json='[]',
        tipo=Pedido.TIPO_SUBCUENTA,
        pedido_padre_id=ctx.pedido_padre.id,
        grupo_mesa_id=ctx.pedido_padre.grupo_mesa_id,
        etiqueta=ctx.etiqueta,
    )
    db.session.add(subcuenta)
    db.session.flush()

    lineas_movidas = 0
    for linea, cantidad_mover in ctx.movimientos:
        _mover_cantidad_linea(linea, cantidad_mover, subcuenta)
        lineas_movidas += 1

    persistir_cambios_comanda(subcuenta, commit=False)
    persistir_cambios_comanda(ctx.pedido_padre, commit=commit)

    meta = metadatos_subcuentas_para_consumo(ctx.pedido_padre)

    logger.info(
        'Subcuenta #%s creada desde pedido #%s (mesa #%s): %s líneas, etiqueta=%s',
        subcuenta.id,
        ctx.pedido_padre.id,
        ctx.mesa.numero_mesa,
        lineas_movidas,
        ctx.etiqueta,
    )

    return {
        'subcuenta': subcuenta.serialize(),
        'pedido_padre': ctx.pedido_padre.serialize(),
        'lineas_movidas': lineas_movidas,
        **meta,
    }
