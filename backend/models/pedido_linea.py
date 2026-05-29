"""
Modelo ORM: líneas trazables de comanda (fuente de verdad Fase A).
Tabla: pedido_linea
"""

import uuid
from datetime import datetime

import pytz
from sqlalchemy.dialects.postgresql import UUID

from database import db


def hora_bogota():
    return datetime.now(pytz.timezone('America/Bogota'))


class PedidoLinea(db.Model):
    __tablename__ = 'pedido_linea'

    ESTADO_ACTIVA = 'activa'
    ESTADO_MOVIDA = 'movida'
    ESTADO_FACTURADA = 'facturada'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pedido_id = db.Column(
        db.Integer,
        db.ForeignKey('pedido.id', ondelete='CASCADE'),
        nullable=False,
    )
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'), nullable=False)
    nombre = db.Column(db.String(200), nullable=False)
    precio = db.Column(db.Numeric(10, 2), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False, default=1)
    mesa_origen_id = db.Column(db.Integer, db.ForeignKey('mesas.id'), nullable=False)
    mesa_origen_numero = db.Column(db.Integer, nullable=False)
    estado_linea = db.Column(db.String(20), nullable=False, default=ESTADO_ACTIVA)
    created_at = db.Column(db.DateTime, nullable=False, default=hora_bogota)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=hora_bogota,
        onupdate=hora_bogota,
    )

    pedido = db.relationship('Pedido', back_populates='lineas')
    producto = db.relationship('Producto', backref='lineas_pedido')
    mesa_origen = db.relationship(
        'Mesa',
        foreign_keys=[mesa_origen_id],
        back_populates='lineas_consumo_origen',
    )

    def subtotal(self) -> float:
        return float(self.precio or 0) * int(self.cantidad or 0)

    def to_dict(self) -> dict:
        """Formato API + compatibilidad con articulos_json del frontend."""
        return {
            'linea_id': str(self.id),
            'producto_id': self.producto_id,
            'nombre': self.nombre,
            'precio': float(self.precio),
            'cantidad': self.cantidad,
            'mesa_origen_id': self.mesa_origen_id,
            'mesa_origen_numero': self.mesa_origen_numero,
            'estado_linea': self.estado_linea,
            'subtotal': self.subtotal(),
        }

    def to_articulo_legacy(self) -> dict:
        """Vista reducida para regenerar articulos_json."""
        return {
            'linea_id': str(self.id),
            'producto_id': self.producto_id,
            'nombre': self.nombre,
            'precio': float(self.precio),
            'cantidad': self.cantidad,
            'mesa_origen_id': self.mesa_origen_id,
            'mesa_origen_numero': self.mesa_origen_numero,
        }
