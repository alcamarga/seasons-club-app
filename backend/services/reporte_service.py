from database import db
from models.venta import Venta
from models.corte_caja import CorteCaja


METODOS_PAGO = {
    'efectivo': 'Efectivo',
    'transferencia': 'Transferencia',
}


def normalizar_metodo_pago(metodo: str) -> str:
    if not metodo:
        return 'Efectivo'
    clave = metodo.strip().lower()
    return METODOS_PAGO.get(clave, metodo.strip().capitalize())


def obtener_inicio_jornada():
    ultimo_corte = CorteCaja.query.order_by(CorteCaja.fecha_corte.desc()).first()
    return ultimo_corte.fecha_corte if ultimo_corte else None


def calcular_desglose_iva(total: float) -> tuple[float, float]:
    total = float(total or 0)
    subtotal = total / 1.19
    iva = total - subtotal
    return round(subtotal, 2), round(iva, 2)


def calcular_reporte_jornada():
    inicio = obtener_inicio_jornada()
    query = Venta.query
    if inicio:
        query = query.filter(Venta.fecha > inicio)

    total = db.session.query(db.func.coalesce(db.func.sum(Venta.total_venta), 0.0)).filter(
        *([Venta.fecha > inicio] if inicio else [])
    ).scalar() or 0.0

    efectivo = db.session.query(db.func.coalesce(db.func.sum(Venta.total_venta), 0.0)).filter(
        db.func.lower(Venta.metodo_pago) == 'efectivo',
        *([Venta.fecha > inicio] if inicio else [])
    ).scalar() or 0.0

    transferencia = db.session.query(db.func.coalesce(db.func.sum(Venta.total_venta), 0.0)).filter(
        db.func.lower(Venta.metodo_pago) == 'transferencia',
        *([Venta.fecha > inicio] if inicio else [])
    ).scalar() or 0.0

    cantidad_ventas = query.count()
    subtotal, iva = calcular_desglose_iva(total)

    return {
        'total': round(float(total), 2),
        'efectivo': round(float(efectivo), 2),
        'transferencia': round(float(transferencia), 2),
        'subtotal': subtotal,
        'iva': iva,
        'cantidad_ventas': cantidad_ventas,
        'inicio_jornada': inicio.isoformat() if inicio else None,
    }
