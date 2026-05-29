"""
Servicio de unión de mesas — Fase B.1.

Orquesta GrupoMesa + fusión de PedidoLinea hacia un pedido maestro.
Reutiliza persistir_cambios_comanda() como guardián de integridad.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from database import db
from models.grupo_mesa import GrupoMesa, MesaGrupoMiembro, hora_bogota
from models.mesa import Mesa
from models.pedido import Pedido
from services.comanda_service import ComandaError, persistir_cambios_comanda

logger = logging.getLogger(__name__)

ESTADO_FUSIONADO = 'fusionado'
ESTADO_PENDIENTE = 'pendiente'


@dataclass
class UnionMesasContext:
    """Resultado de validación lista para ejecutar unir_mesas()."""

    mesa_ids: list[int]
    mesa_anfitriona_id: int
    mesas: list[Mesa]
    pedidos: dict[int, Pedido]


def _mesa_en_grupo_activo(mesa: Mesa) -> bool:
    if mesa.grupo_mesa_id:
        grupo = GrupoMesa.query.get(mesa.grupo_mesa_id)
        if grupo and grupo.estado == GrupoMesa.ESTADO_ACTIVO:
            return True
    membresia = (
        MesaGrupoMiembro.query.filter_by(mesa_id=mesa.id, activo=True)
        .join(GrupoMesa)
        .filter(GrupoMesa.estado == GrupoMesa.ESTADO_ACTIVO)
        .first()
    )
    return membresia is not None


def validar_mesas_para_union(
    mesa_ids: list[int],
    mesa_anfitriona_id: int,
) -> UnionMesasContext:
    """
    Valida reglas de negocio antes de unir mesas.
    Lanza ComandaError (400/404/409) si alguna regla falla.
    """
    if not mesa_ids or len(mesa_ids) < 2:
        raise ComandaError('Se requieren al menos 2 mesas para unir', 400)

    try:
        ids_normalizados = [int(m) for m in mesa_ids]
    except (TypeError, ValueError):
        raise ComandaError('mesa_ids debe ser una lista de enteros', 400)

    if len(set(ids_normalizados)) != len(ids_normalizados):
        raise ComandaError('mesa_ids no puede contener duplicados', 400)

    try:
        anfitriona_id = int(mesa_anfitriona_id)
    except (TypeError, ValueError):
        raise ComandaError('mesa_anfitriona_id debe ser un entero válido', 400)

    if anfitriona_id not in ids_normalizados:
        raise ComandaError('mesa_anfitriona_id debe estar incluida en mesa_ids', 400)

    mesas: list[Mesa] = []
    pedidos: dict[int, Pedido] = {}

    for mesa_id in ids_normalizados:
        mesa = Mesa.query.get(mesa_id)
        if not mesa:
            raise ComandaError(f'Mesa {mesa_id} no encontrada', 404)

        if mesa.estado != 'OCUPADA':
            raise ComandaError(
                f'La mesa #{mesa.numero_mesa} debe estar OCUPADA para unirse',
                400,
            )

        if _mesa_en_grupo_activo(mesa):
            raise ComandaError(
                f'La mesa #{mesa.numero_mesa} ya pertenece a un grupo activo',
                409,
            )

        pedido = (
            Pedido.query.filter_by(mesa_id=mesa_id, estado=ESTADO_PENDIENTE)
            .order_by(Pedido.id.desc())
            .first()
        )
        if not pedido:
            raise ComandaError(
                f'La mesa #{mesa.numero_mesa} no tiene comanda pendiente',
                400,
            )

        mesas.append(mesa)
        pedidos[mesa_id] = pedido

    return UnionMesasContext(
        mesa_ids=ids_normalizados,
        mesa_anfitriona_id=anfitriona_id,
        mesas=mesas,
        pedidos=pedidos,
    )


def _mover_lineas_al_pedido_maestro(pedido_origen: Pedido, pedido_maestro: Pedido) -> int:
    """Reasigna líneas activas al pedido maestro conservando mesa_origen_*."""
    if pedido_origen.id == pedido_maestro.id:
        return 0

    lineas = pedido_origen.lineas_activas().all()
    for linea in lineas:
        linea.pedido_id = pedido_maestro.id
    return len(lineas)


def unir_mesas(mesa_ids: list[int], mesa_anfitriona_id: int, *, commit: bool = True) -> dict:
    """
    Fusiona comandas en un pedido maestro y crea GrupoMesa.

    Retorna resumen para la API (grupo, pedido maestro serializado, mesas).
    """
    ctx = validar_mesas_para_union(mesa_ids, mesa_anfitriona_id)

    grupo = GrupoMesa(
        mesa_anfitriona_id=ctx.mesa_anfitriona_id,
        estado=GrupoMesa.ESTADO_ACTIVO,
    )
    db.session.add(grupo)
    db.session.flush()

    pedido_maestro = ctx.pedidos[ctx.mesa_anfitriona_id]
    pedido_maestro.tipo = Pedido.TIPO_MAESTRA
    pedido_maestro.grupo_mesa_id = grupo.id

    lineas_movidas = 0
    pedidos_fusionados: list[int] = []

    for mesa in ctx.mesas:
        pedido_secundario = ctx.pedidos[mesa.id]

        if mesa.id != ctx.mesa_anfitriona_id:
            movidas = _mover_lineas_al_pedido_maestro(pedido_secundario, pedido_maestro)
            lineas_movidas += movidas
            pedido_secundario.estado = ESTADO_FUSIONADO
            pedido_secundario.grupo_mesa_id = grupo.id
            pedidos_fusionados.append(pedido_secundario.id)

        mesa.grupo_mesa_id = grupo.id
        db.session.add(
            MesaGrupoMiembro(
                grupo_mesa_id=grupo.id,
                mesa_id=mesa.id,
                activo=True,
            )
        )

    persistir_cambios_comanda(pedido_maestro, commit=commit)

    numeros = [m.numero_mesa for m in ctx.mesas]
    logger.info(
        'Grupo #%s creado: mesas %s, pedido maestro #%s, líneas movidas=%s',
        grupo.id,
        numeros,
        pedido_maestro.id,
        lineas_movidas,
    )

    return {
        'grupo_mesa': grupo.to_dict(),
        'mesa_anfitriona_id': ctx.mesa_anfitriona_id,
        'mesa_ids': ctx.mesa_ids,
        'numeros_mesas': numeros,
        'pedido_maestro_id': pedido_maestro.id,
        'pedidos_fusionados': pedidos_fusionados,
        'lineas_movidas': lineas_movidas,
        'pedido': pedido_maestro.serialize(),
    }


def metadatos_grupo_para_mesa(mesa: Mesa) -> dict:
    """Metadatos de grupo para GET /consumo y respuestas de mesas unidas."""
    if not mesa.grupo_mesa_id:
        return {
            'grupo_mesa_id': None,
            'mesa_anfitriona_id': None,
            'mesas_del_grupo': [],
            'numeros_mesas_grupo': [],
            'es_grupo_activo': False,
        }

    grupo = GrupoMesa.query.get(mesa.grupo_mesa_id)
    if not grupo or grupo.estado != GrupoMesa.ESTADO_ACTIVO:
        return {
            'grupo_mesa_id': mesa.grupo_mesa_id,
            'mesa_anfitriona_id': None,
            'mesas_del_grupo': [],
            'numeros_mesas_grupo': [],
            'es_grupo_activo': False,
        }

    miembros = (
        MesaGrupoMiembro.query.filter_by(grupo_mesa_id=grupo.id, activo=True)
        .order_by(MesaGrupoMiembro.mesa_id.asc())
        .all()
    )
    mesa_ids = [m.mesa_id for m in miembros]
    numeros: list[int] = []
    for mid in mesa_ids:
        m = Mesa.query.get(mid)
        if m:
            numeros.append(m.numero_mesa)

    return {
        'grupo_mesa_id': grupo.id,
        'mesa_anfitriona_id': grupo.mesa_anfitriona_id,
        'mesas_del_grupo': mesa_ids,
        'numeros_mesas_grupo': numeros,
        'es_grupo_activo': True,
    }


def cerrar_grupo_activo(grupo_mesa_id: int, *, commit: bool = False) -> None:
    """Cierra grupo y libera mesas (p. ej. tras facturar cuenta consolidada)."""
    grupo = GrupoMesa.query.get(grupo_mesa_id)
    if not grupo:
        return

    grupo.estado = GrupoMesa.ESTADO_CERRADO
    grupo.closed_at = hora_bogota()

    miembros = MesaGrupoMiembro.query.filter_by(grupo_mesa_id=grupo.id, activo=True).all()
    for membresia in miembros:
        membresia.activo = False
        membresia.left_at = hora_bogota()
        mesa = Mesa.query.get(membresia.mesa_id)
        if mesa:
            mesa.grupo_mesa_id = None
            mesa.estado = 'LIBRE'

    if commit:
        db.session.commit()
    else:
        db.session.flush()
