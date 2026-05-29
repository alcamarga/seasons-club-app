"""
Modelo ORM: mesas físicas del club.
"""

from database import db


class Mesa(db.Model):
    __tablename__ = 'mesas'

    id = db.Column(db.Integer, primary_key=True)
    numero_mesa = db.Column(db.Integer, unique=True, nullable=False)
    estado = db.Column(db.String(20), default='LIBRE', nullable=False)

    # Fase A — pertenencia a grupo activo (NULL = mesa individual)
    grupo_mesa_id = db.Column(db.Integer, db.ForeignKey('grupo_mesa.id'), nullable=True)

    pedidos = db.relationship('Pedido', backref='mesa', lazy=True)
    grupo_mesa = db.relationship(
        'GrupoMesa',
        foreign_keys=[grupo_mesa_id],
        back_populates='mesas_vinculadas',
    )
    grupos_como_anfitriona = db.relationship(
        'GrupoMesa',
        foreign_keys='GrupoMesa.mesa_anfitriona_id',
        back_populates='mesa_anfitriona',
        lazy='dynamic',
    )
    membresias_grupo = db.relationship(
        'MesaGrupoMiembro',
        back_populates='mesa',
        lazy='dynamic',
    )
    lineas_consumo_origen = db.relationship(
        'PedidoLinea',
        foreign_keys='PedidoLinea.mesa_origen_id',
        back_populates='mesa_origen',
        lazy='dynamic',
    )

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'numero_mesa': self.numero_mesa,
            'estado': self.estado,
            'grupo_mesa_id': self.grupo_mesa_id,
        }
