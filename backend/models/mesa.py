"""
-------------------------------------------------------------
🌌 SEASONS CLUB APP - BACKEND MODELS
-------------------------------------------------------------
@file        mesa.py
@description Modelo de datos para las mesas de la discoteca.
@author      Camilo Martinez Galarza <Developer>
@created     2026-05-19
@version     1.0.2
-------------------------------------------------------------
"""

from database import db

class Mesa(db.Model):
    __tablename__ = 'mesas'

    id = db.Column(db.Integer, primary_key=True)
    numero_mesa = db.Column(db.Integer, unique=True, nullable=False)
    estado = db.Column(db.String(20), default='LIBRE', nullable=False) # LIBRE u OCUPADA

    # 🍹 Relación directa: Una mesa puede tener un histórico de pedidos, 
    # pero usaremos la propiedad para buscar la comanda que esté en estado 'pendiente'
    pedidos = db.relationship('Pedido', backref='mesa', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "numero_mesa": self.numero_mesa,
            "estado": self.estado
        }