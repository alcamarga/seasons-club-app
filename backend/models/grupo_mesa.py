"""
Modelos ORM: unión de mesas (cuenta consolidada).
Tablas: grupo_mesa, mesa_grupo_miembro
"""

from datetime import datetime

import pytz
from database import db


def hora_bogota():
    return datetime.now(pytz.timezone('America/Bogota'))


class GrupoMesa(db.Model):
    __tablename__ = 'grupo_mesa'

    ESTADO_ACTIVO = 'activo'
    ESTADO_CERRADO = 'cerrado'

    id = db.Column(db.Integer, primary_key=True)
    mesa_anfitriona_id = db.Column(
        db.Integer,
        db.ForeignKey('mesas.id'),
        nullable=False,
    )
    estado = db.Column(db.String(20), nullable=False, default=ESTADO_ACTIVO)
    created_at = db.Column(db.DateTime, nullable=False, default=hora_bogota)
    closed_at = db.Column(db.DateTime, nullable=True)

    mesa_anfitriona = db.relationship(
        'Mesa',
        foreign_keys=[mesa_anfitriona_id],
        back_populates='grupos_como_anfitriona',
    )
    miembros = db.relationship(
        'MesaGrupoMiembro',
        back_populates='grupo',
        cascade='all, delete-orphan',
        lazy='dynamic',
    )
    pedidos = db.relationship(
        'Pedido',
        back_populates='grupo_mesa',
        lazy='dynamic',
    )
    mesas_vinculadas = db.relationship(
        'Mesa',
        foreign_keys='Mesa.grupo_mesa_id',
        back_populates='grupo_mesa',
        lazy='dynamic',
    )

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'mesa_anfitriona_id': self.mesa_anfitriona_id,
            'estado': self.estado,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'closed_at': self.closed_at.isoformat() if self.closed_at else None,
        }


class MesaGrupoMiembro(db.Model):
    __tablename__ = 'mesa_grupo_miembro'

    id = db.Column(db.Integer, primary_key=True)
    grupo_mesa_id = db.Column(
        db.Integer,
        db.ForeignKey('grupo_mesa.id', ondelete='CASCADE'),
        nullable=False,
    )
    mesa_id = db.Column(db.Integer, db.ForeignKey('mesas.id'), nullable=False)
    activo = db.Column(db.Boolean, nullable=False, default=True)
    joined_at = db.Column(db.DateTime, nullable=False, default=hora_bogota)
    left_at = db.Column(db.DateTime, nullable=True)

    grupo = db.relationship('GrupoMesa', back_populates='miembros')
    mesa = db.relationship('Mesa', back_populates='membresias_grupo')

    __table_args__ = (
        db.UniqueConstraint('grupo_mesa_id', 'mesa_id', name='mesa_grupo_miembro_grupo_mesa_uq'),
    )

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'grupo_mesa_id': self.grupo_mesa_id,
            'mesa_id': self.mesa_id,
            'activo': self.activo,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'left_at': self.left_at.isoformat() if self.left_at else None,
        }
