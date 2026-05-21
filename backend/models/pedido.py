"""
-------------------------------------------------------------
🌌 SEASONS CLUB APP - BACKEND MODELS
-------------------------------------------------------------
@file        pedido.py
@description Modelo de persistencia para las comandas de licores de las mesas.
@author      Camilo Martinez Galarza <Developer>
@created     2026-05-19
@version     1.0.2
-------------------------------------------------------------
"""

from models.database import db
from datetime import datetime

class Pedido(db.Model):
    __tablename__ = 'pedido'

    id = db.Column(db.Integer, primary_key=True)
    
    # 📌 Llave foránea que conecta la comanda directamente con su mesa física
    mesa_id = db.Column(db.Integer, db.ForeignKey('mesas.id'), nullable=False)
    
    # 📌 Llave foránea para identificar qué mesero o administrador generó la orden
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=True)
    
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    total = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    estado = db.Column(db.String(50), default='pendiente') # pendiente, pagado, cancelado
    articulos_json = db.Column(db.Text, nullable=True) # Lista de licores consumidos en formato plano

    def serialize(self):
        import json
        articulos_lista = []
        if self.articulos_json:
            try:
                articulos_lista = json.loads(self.articulos_json)
            except Exception:
                pass

        return {
            "id": self.id,
            "mesa_id": self.mesa_id,
            "usuario_id": self.usuario_id,
            "fecha": self.fecha.isoformat() if self.fecha else None,
            "total": float(self.total),
            "estado": self.estado,
            "articulos": articulos_lista
        }