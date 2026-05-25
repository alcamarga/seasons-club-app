from datetime import datetime
from database import db # Asegúrate de importar tu instancia de db
from datetime import datetime
import pytz

def hora_bogota():
    return datetime.now(pytz.timezone('America/Bogota'))

class Venta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    mesa_id = db.Column(db.Integer, nullable=False)
    total_venta = db.Column(db.Float, nullable=False)
    metodo_pago = db.Column(db.String(50), nullable=False)
    fecha = db.Column(db.DateTime, default= hora_bogota())