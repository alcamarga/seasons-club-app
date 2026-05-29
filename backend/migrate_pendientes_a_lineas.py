#!/usr/bin/env python3
"""
Migración Fase A: articulos_json → pedido_linea (solo pedidos vivos).

- Procesa únicamente pedido.estado = 'pendiente'.
- Idempotente: si el pedido ya tiene filas en pedido_linea, se omite.
- No toca pedidos cerrados (pagado, facturado, etc.).

Uso:
  cd backend
  python3 migrate_pendientes_a_lineas.py
  python3 migrate_pendientes_a_lineas.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from decimal import Decimal

from sqlalchemy import text

from app import app
from database import db

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

ESTADO_PENDIENTE = 'pendiente'


def _pedido_tiene_lineas(pedido_id: int) -> bool:
    filas = db.session.execute(
        text('SELECT 1 FROM pedido_linea WHERE pedido_id = :pid LIMIT 1'),
        {'pid': pedido_id},
    ).first()
    return filas is not None


def _obtener_numero_mesa(mesa_id: int) -> int | None:
    fila = db.session.execute(
        text('SELECT numero_mesa FROM mesas WHERE id = :mid'),
        {'mid': mesa_id},
    ).first()
    return int(fila[0]) if fila else None


def _producto_existe(producto_id: int) -> bool:
    fila = db.session.execute(
        text('SELECT 1 FROM producto WHERE id = :pid'),
        {'pid': producto_id},
    ).first()
    return fila is not None


def _parsear_articulos(articulos_json: str | None) -> list[dict]:
    if not articulos_json or not str(articulos_json).strip():
        return []
    try:
        data = json.loads(articulos_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f'JSON inválido: {exc}') from exc
    if not isinstance(data, list):
        raise ValueError('articulos_json debe ser un arreglo JSON')
    return data


def _insertar_linea(
    *,
    pedido_id: int,
    producto_id: int,
    nombre: str,
    precio: float,
    cantidad: int,
    mesa_origen_id: int,
    mesa_origen_numero: int,
    dry_run: bool,
) -> None:
    if dry_run:
        return
    db.session.execute(
        text(
            """
            INSERT INTO pedido_linea (
                pedido_id,
                producto_id,
                nombre,
                precio,
                cantidad,
                mesa_origen_id,
                mesa_origen_numero,
                estado_linea
            ) VALUES (
                :pedido_id,
                :producto_id,
                :nombre,
                :precio,
                :cantidad,
                :mesa_origen_id,
                :mesa_origen_numero,
                'activa'
            )
            """
        ),
        {
            'pedido_id': pedido_id,
            'producto_id': producto_id,
            'nombre': nombre[:200],
            'precio': Decimal(str(precio)),
            'cantidad': cantidad,
            'mesa_origen_id': mesa_origen_id,
            'mesa_origen_numero': mesa_origen_numero,
        },
    )


def migrar_pendientes(dry_run: bool = False) -> dict:
    """
    Migra pedidos pendientes a pedido_linea.
    Retorna estadísticas del proceso.
    """
    stats = {
        'pendientes_encontrados': 0,
        'omitidos_ya_migrados': 0,
        'migrados_ok': 0,
        'sin_articulos': 0,
        'lineas_insertadas': 0,
        'errores': 0,
        'detalle_errores': [],
    }

    pedidos = db.session.execute(
        text(
            """
            SELECT id, mesa_id, articulos_json, estado
            FROM pedido
            WHERE LOWER(TRIM(estado)) = :estado
            ORDER BY id
            """
        ),
        {'estado': ESTADO_PENDIENTE},
    ).fetchall()

    stats['pendientes_encontrados'] = len(pedidos)
    logger.info('Pedidos pendientes encontrados: %s', len(pedidos))

    for row in pedidos:
        pedido_id = int(row[0])
        mesa_id = int(row[1])
        articulos_json = row[2]

        if _pedido_tiene_lineas(pedido_id):
            stats['omitidos_ya_migrados'] += 1
            logger.info('Pedido #%s: omitido (ya tiene líneas en pedido_linea)', pedido_id)
            continue

        numero_mesa = _obtener_numero_mesa(mesa_id)
        if numero_mesa is None:
            msg = f'Pedido #{pedido_id}: mesa_id={mesa_id} no existe en mesas'
            stats['errores'] += 1
            stats['detalle_errores'].append(msg)
            logger.error(msg)
            continue

        try:
            articulos = _parsear_articulos(articulos_json)
        except ValueError as exc:
            msg = f'Pedido #{pedido_id}: {exc}'
            stats['errores'] += 1
            stats['detalle_errores'].append(msg)
            logger.error(msg)
            continue

        if not articulos:
            stats['sin_articulos'] += 1
            stats['migrados_ok'] += 1
            logger.info('Pedido #%s: sin artículos (comanda vacía) — OK', pedido_id)
            continue

        lineas_pedido = 0
        pedido_ok = True

        for idx, art in enumerate(articulos):
            if not isinstance(art, dict):
                msg = f'Pedido #{pedido_id}, ítem #{idx}: no es un objeto JSON'
                stats['detalle_errores'].append(msg)
                logger.warning(msg)
                pedido_ok = False
                continue

            producto_id = art.get('producto_id')
            nombre = art.get('nombre')
            precio = art.get('precio')
            cantidad = art.get('cantidad', 1)

            if producto_id is None or nombre is None or precio is None:
                msg = f'Pedido #{pedido_id}, ítem #{idx}: faltan producto_id, nombre o precio'
                stats['detalle_errores'].append(msg)
                logger.warning(msg)
                pedido_ok = False
                continue

            try:
                producto_id = int(producto_id)
                cantidad = int(cantidad)
                precio = float(precio)
            except (TypeError, ValueError):
                msg = f'Pedido #{pedido_id}, ítem #{idx}: tipos numéricos inválidos'
                stats['detalle_errores'].append(msg)
                logger.warning(msg)
                pedido_ok = False
                continue

            if cantidad <= 0:
                msg = f'Pedido #{pedido_id}, ítem #{idx}: cantidad <= 0'
                stats['detalle_errores'].append(msg)
                logger.warning(msg)
                pedido_ok = False
                continue

            if not _producto_existe(producto_id):
                msg = (
                    f'Pedido #{pedido_id}, ítem #{idx}: producto_id={producto_id} '
                    'no existe en producto (corrija JSON o catálogo antes de migrar)'
                )
                stats['detalle_errores'].append(msg)
                logger.warning(msg)
                pedido_ok = False
                continue

            _insertar_linea(
                pedido_id=pedido_id,
                producto_id=producto_id,
                nombre=str(nombre),
                precio=precio,
                cantidad=cantidad,
                mesa_origen_id=mesa_id,
                mesa_origen_numero=numero_mesa,
                dry_run=dry_run,
            )
            lineas_pedido += 1

        if not pedido_ok:
            if not dry_run:
                db.session.rollback()
            stats['errores'] += 1
            logger.error(
                'Pedido #%s: rollback — uno o más ítems inválidos (%s líneas válidas descartadas)',
                pedido_id,
                lineas_pedido,
            )
            continue

        if not dry_run:
            db.session.commit()

        stats['migrados_ok'] += 1
        stats['lineas_insertadas'] += lineas_pedido
        logger.info(
            'Pedido #%s (mesa #%s): %s línea(s) %s',
            pedido_id,
            numero_mesa,
            lineas_pedido,
            'simuladas' if dry_run else 'insertadas',
        )

    return stats


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Migra articulos_json → pedido_linea solo para pedidos pendientes.',
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simula la migración sin escribir en pedido_linea',
    )
    args = parser.parse_args()

    if args.dry_run:
        logger.info('Modo dry-run: no se persistirán cambios')

    with app.app_context():
        try:
            stats = migrar_pendientes(dry_run=args.dry_run)
        except Exception as exc:
            db.session.rollback()
            logger.exception('Error fatal durante la migración: %s', exc)
            return 1

    logger.info('--- Resumen ---')
    logger.info('Pendientes encontrados:  %s', stats['pendientes_encontrados'])
    logger.info('Omitidos (ya migrados):  %s', stats['omitidos_ya_migrados'])
    logger.info('Migrados OK:             %s', stats['migrados_ok'])
    logger.info('Comandas vacías:         %s', stats['sin_articulos'])
    logger.info('Líneas insertadas:       %s', stats['lineas_insertadas'])
    logger.info('Errores:                 %s', stats['errores'])

    if stats['detalle_errores']:
        logger.info('Detalle:')
        for det in stats['detalle_errores']:
            logger.info('  - %s', det)

    return 1 if stats['errores'] > 0 else 0


if __name__ == '__main__':
    sys.exit(main())
