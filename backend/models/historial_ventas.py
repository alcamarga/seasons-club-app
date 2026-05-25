from datetime import datetime
from database import db
from datetime import datetime
import pytz

def hora_bogota():
    return datetime.now(pytz.timezone('America/Bogota'))

class HistorialVentas(db.Model):
    __tablename__ = 'historial_ventas'

    id = db.Column(db.Integer, primary_key=True)
    mesa_id = db.Column(db.Integer, db.ForeignKey('mesas.id'), nullable=False)
    numero_mesa = db.Column(db.Integer, nullable=False)
    venta_id = db.Column(db.Integer, nullable=True)
    total = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    iva = db.Column(db.Float, nullable=False)
    metodo_pago = db.Column(db.String(50), nullable=False)
    articulos_json = db.Column(db.Text, nullable=True)
    fecha = db.Column(db.DateTime, default=hora_bogota())

    def to_dict(self):
        import json
        articulos = []
        if self.articulos_json:
            try:
                articulos = json.loads(self.articulos_json)
            except Exception:
                pass

        return {
            'id': self.id,
            'mesa_id': self.mesa_id,
            'numero_mesa': self.numero_mesa,
            'venta_id': self.venta_id,
            'total': self.total,
            'subtotal': self.subtotal,
            'iva': self.iva,
            'metodo_pago': self.metodo_pago,
            'articulos': articulos,
            'fecha': self.fecha.isoformat() if self.fecha else None,
        }
