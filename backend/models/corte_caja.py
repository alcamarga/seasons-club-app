from datetime import datetime
from database import db


class CorteCaja(db.Model):
    __tablename__ = 'corte_caja'

    id = db.Column(db.Integer, primary_key=True)
    fecha_corte = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    total_ventas = db.Column(db.Float, nullable=False, default=0.0)
    efectivo = db.Column(db.Float, nullable=False, default=0.0)
    transferencia = db.Column(db.Float, nullable=False, default=0.0)
    cantidad_ventas = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'fecha_corte': self.fecha_corte.isoformat() if self.fecha_corte else None,
            'total_ventas': self.total_ventas,
            'efectivo': self.efectivo,
            'transferencia': self.transferencia,
            'cantidad_ventas': self.cantidad_ventas,
        }
