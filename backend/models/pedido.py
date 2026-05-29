"""
Modelo ORM: comandas de mesas (pedido).
"""

import json
from datetime import datetime

import pytz
from database import db


def hora_bogota():
    return datetime.now(pytz.timezone('America/Bogota'))


class Pedido(db.Model):
    __tablename__ = 'pedido'

    TIPO_INDIVIDUAL = 'individual'
    TIPO_MAESTRA = 'maestra'
    TIPO_SUBCUENTA = 'subcuenta'

    id = db.Column(db.Integer, primary_key=True)
    mesa_id = db.Column(db.Integer, db.ForeignKey('mesas.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=True)
    fecha = db.Column(db.DateTime, default=hora_bogota)
    total = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    estado = db.Column(db.String(50), default='pendiente')
    articulos_json = db.Column(db.Text, nullable=True)

    # Fase A — grupos y subcuentas
    grupo_mesa_id = db.Column(db.Integer, db.ForeignKey('grupo_mesa.id'), nullable=True)
    tipo = db.Column(db.String(20), nullable=False, default=TIPO_INDIVIDUAL)
    pedido_padre_id = db.Column(db.Integer, db.ForeignKey('pedido.id'), nullable=True)
    etiqueta = db.Column(db.String(100), nullable=True)

    grupo_mesa = db.relationship('GrupoMesa', back_populates='pedidos')
    lineas = db.relationship(
        'PedidoLinea',
        back_populates='pedido',
        cascade='all, delete-orphan',
        lazy='dynamic',
    )
    subcuentas = db.relationship(
        'Pedido',
        backref=db.backref('pedido_padre', remote_side=[id]),
        foreign_keys=[pedido_padre_id],
        lazy='dynamic',
    )

    def lineas_activas(self):
        return self.lineas.filter_by(estado_linea='activa')

    def recalcular_total_desde_lineas(self) -> float:
        total = sum(linea.subtotal() for linea in self.lineas_activas().all())
        self.total = total
        return total

    def sincronizar_articulos_json(self) -> None:
        """Regenera articulos_json desde pedido_linea (compatibilidad frontend)."""
        articulos = [linea.to_articulo_legacy() for linea in self.lineas_activas().all()]
        self.articulos_json = json.dumps(articulos, ensure_ascii=False)

    def articulos_desde_lineas(self) -> list[dict]:
        return [linea.to_articulo_legacy() for linea in self.lineas_activas().all()]

    def articulos_para_respuesta(self) -> list[dict]:
        """Prioriza líneas ORM; fallback a articulos_json (histórico)."""
        lineas = self.lineas_activas().all()
        if lineas:
            return [linea.to_articulo_legacy() for linea in lineas]
        if self.articulos_json:
            try:
                data = json.loads(self.articulos_json)
                return data if isinstance(data, list) else []
            except Exception:
                pass
        return []

    def serialize(self) -> dict:
        return {
            'id': self.id,
            'mesa_id': self.mesa_id,
            'usuario_id': self.usuario_id,
            'fecha': self.fecha.isoformat() if self.fecha else None,
            'total': float(self.total or 0),
            'estado': self.estado,
            'tipo': self.tipo,
            'grupo_mesa_id': self.grupo_mesa_id,
            'pedido_padre_id': self.pedido_padre_id,
            'etiqueta': self.etiqueta,
            'articulos': self.articulos_para_respuesta(),
        }
