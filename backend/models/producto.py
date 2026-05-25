from database import db
import enum

# Esto es lo que faltaba y por eso daba el ImportError
class SizeEnum(enum.Enum):
    PEQUENA = "Pequeña"
    MEDIANA = "Mediana"
    GRANDE = "Grande"

class Producto(db.Model):
    __tablename__ = 'producto'
    
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    # Mapeamos 'precio' de la DB a precio_base en Python
    precio_base = db.Column('precio', db.Numeric(10, 2), nullable=False, default=0)
    
    descripcion = db.Column(db.Text)
    categoria = db.Column(db.String(50))
    precio_pequena = db.Column(db.Float, default=0.0)
    precio_mediana = db.Column(db.Float, default=0.0)
    precio_grande = db.Column(db.Float, default=0.0)

    # Campos de inventario (alineados con producto.model.ts de Angular)
    precio_compra = db.Column(db.Float, nullable=False, default=0.0)
    precio_venta = db.Column(db.Float, nullable=False, default=0.0)
    stock = db.Column(db.Integer, nullable=False, default=0)
    imagen_url = db.Column(db.Text, default='')
    es_insumo = db.Column(db.Boolean, nullable=False, default=False)

    def rentabilidad(self, size_enum):
        return {
            "nombre": self.nombre,
            "costo_produccion": 10.0, 
            "ganancia": 5.0,
            "margen_porcentaje": 50.0
        }

    def aplicar_payload_inventario(self, data: dict) -> None:
        """Mapea el JSON camelCase del InventarioService al modelo ORM."""
        self.nombre = data['nombre']
        self.categoria = data.get('categoria') or 'General'
        self.precio_compra = float(data.get('precioCompra', 0) or 0)
        self.precio_venta = float(data.get('precioVenta', 0) or 0)
        self.stock = int(data.get('stock', 0) or 0)
        imagen = data.get('imagenUrl') or ''
        # No guardar base64 en BD (excede tamaño y rompe la carga de imágenes)
        if imagen and not str(imagen).startswith('data:'):
            self.imagen_url = imagen
        self.es_insumo = bool(data.get('esInsumo', False))
        # Mantener precios de menú sincronizados con el precio de venta principal
        self.precio_base = self.precio_venta
        self.precio_pequena = self.precio_venta

    def serializar(self):
        precio_venta = float(self.precio_venta or self.precio_pequena or self.precio_base or 0)
        precio_pequena = float(self.precio_pequena or precio_venta)
        return {
            'id': self.id,
            'nombre': self.nombre,
            'descripcion': self.descripcion or "",
            'categoria': self.categoria or "General",
            # Inventario (InventarioComponent / producto.model.ts)
            'precioCompra': float(self.precio_compra or 0),
            'precioVenta': precio_venta,
            'stock': int(self.stock or 0),
            'imagenUrl': self.imagen_url or '',
            'esInsumo': bool(self.es_insumo),
            # Menú / admin (compatibilidad)
            'precio': precio_pequena if precio_pequena > 0 else precio_venta,
            'precio_1': float(self.precio_pequena or 0),
            'precio_2': float(self.precio_mediana or 0),
            'precio_3': float(self.precio_grande or 0),
            'precio_personal': float(self.precio_pequena or 0),
            'precio_mediano': float(self.precio_mediana or 0),
            'precio_familiar': float(self.precio_grande or 0),
        }
