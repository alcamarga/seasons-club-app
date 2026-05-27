"""Ajustes idempotentes de esquema al arrancar la app (sin Alembic)."""
from sqlalchemy import inspect, text

from database import db


def ensure_producto_costo_unitario() -> None:
    """Añade costo_unitario y lo rellena desde precio_compra si falta."""
    inspector = inspect(db.engine)
    if 'producto' not in inspector.get_table_names():
        return

    columnas = {col['name'] for col in inspector.get_columns('producto')}
    if 'costo_unitario' in columnas:
        return

    db.session.execute(text(
        'ALTER TABLE producto ADD COLUMN costo_unitario DOUBLE PRECISION DEFAULT 0'
    ))
    db.session.execute(text(
        'UPDATE producto SET costo_unitario = COALESCE(precio_compra, 0) '
        'WHERE costo_unitario IS NULL'
    ))
    db.session.execute(text(
        'ALTER TABLE producto ALTER COLUMN costo_unitario SET NOT NULL'
    ))
    db.session.commit()
