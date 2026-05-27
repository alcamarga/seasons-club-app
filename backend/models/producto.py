from database import db
import enum


class SizeEnum(enum.Enum):
    PEQUENA = "Pequeña"
    MEDIANA = "Mediana"
    GRANDE = "Grande"


class Producto(db.Model):
    __tablename__ = 'producto'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    precio_base = db.Column('precio', db.Numeric(10, 2), nullable=False, default=0)

    descripcion = db.Column(db.Text)
    categoria = db.Column(db.String(50))
    precio_pequena = db.Column(db.Float, default=0.0)
    precio_mediana = db.Column(db.Float, default=0.0)
    precio_grande = db.Column(db.Float, default=0.0)

    # Inventario y rentabilidad
    costo_unitario = db.Column(db.Float, nullable=False, default=0.0)
    precio_compra = db.Column(db.Float, nullable=False, default=0.0)
    precio_venta = db.Column(db.Float, nullable=False, default=0.0)
    stock = db.Column(db.Integer, nullable=False, default=0)
    imagen_url = db.Column(db.Text, default='')
    es_insumo = db.Column(db.Boolean, nullable=False, default=False)

    @staticmethod
    def _extraer_numero(data: dict, claves: tuple[str, ...]) -> object | None:
        for clave in claves:
            if clave in data and data[clave] is not None and str(data[clave]).strip() != '':
                return data[clave]
        return None

    @classmethod
    def parse_costo_unitario(cls, data: dict) -> float:
        """Valida costo_unitario (prioriza snake_case y precioCompra del formulario)."""
        raw = cls._extraer_numero(
            data,
            ('costo_unitario', 'precioCompra', 'precio_compra', 'costoUnitario'),
        )
        if raw is None:
            raise ValueError('costo_unitario es obligatorio y debe ser un número válido')
        try:
            valor = float(raw)
        except (TypeError, ValueError):
            raise ValueError('costo_unitario debe ser un número válido')
        if valor < 0:
            raise ValueError('costo_unitario no puede ser negativo')
        return valor

    @classmethod
    def parse_precio_venta(cls, data: dict) -> float:
        """Valida precio_venta (prioriza snake_case y precioVenta del formulario)."""
        raw = cls._extraer_numero(data, ('precio_venta', 'precioVenta', 'precio'))
        if raw is None:
            raise ValueError('precio_venta es obligatorio y debe ser un número válido')
        try:
            valor = float(raw)
        except (TypeError, ValueError):
            raise ValueError('precio_venta debe ser un número válido')
        if valor < 0:
            raise ValueError('precio_venta no puede ser negativo')
        return valor

    def obtener_costo_unitario(self) -> float:
        if self.costo_unitario is not None:
            return float(self.costo_unitario)
        return float(self.precio_compra or 0)

    def obtener_precio_venta(self) -> float:
        return float(self.precio_venta or self.precio_pequena or self.precio_base or 0)

    def calcular_margenes(self) -> tuple[float, float]:
        """Retorna (margen_dinero, margen_porcentaje)."""
        costo = self.obtener_costo_unitario()
        precio = self.obtener_precio_venta()
        margen_dinero = round(precio - costo, 2)
        if precio > 0:
            margen_porcentaje = round(((precio - costo) / precio) * 100, 2)
        else:
            margen_porcentaje = 0.0
        return margen_dinero, margen_porcentaje

    def rentabilidad(self, size_enum):
        margen_dinero, margen_porcentaje = self.calcular_margenes()
        return {
            "nombre": self.nombre,
            "costo_produccion": self.obtener_costo_unitario(),
            "ganancia": margen_dinero,
            "margen_porcentaje": margen_porcentaje,
        }

    def aplicar_payload_inventario(self, data: dict) -> None:
        """Mapea el JSON camelCase del InventarioService al modelo ORM."""
        self.nombre = data['nombre']
        self.categoria = data.get('categoria') or 'General'

        costo = self.parse_costo_unitario(data)
        precio = self.parse_precio_venta(data)

        self.costo_unitario = costo
        self.precio_compra = costo
        self.precio_venta = precio
        self.stock = int(data.get('stock', 0) or 0)

        imagen = data.get('imagenUrl') or ''
        if imagen and not str(imagen).startswith('data:'):
            self.imagen_url = imagen

        self.es_insumo = bool(data.get('esInsumo', False))
        self.precio_base = precio
        self.precio_pequena = precio

    def serializar(self) -> dict:
        precio_venta = self.obtener_precio_venta()
        costo_unitario = self.obtener_costo_unitario()
        margen_dinero, margen_porcentaje = self.calcular_margenes()
        precio_pequena = float(self.precio_pequena or precio_venta)

        return {
            'id': self.id,
            'nombre': self.nombre,
            'descripcion': self.descripcion or "",
            'categoria': self.categoria or "General",
            'costo_unitario': costo_unitario,
            'costoUnitario': costo_unitario,
            'precioCompra': costo_unitario,
            'precio_venta': precio_venta,
            'precioVenta': precio_venta,
            'margen_dinero': margen_dinero,
            'margen_porcentaje': margen_porcentaje,
            'stock': int(self.stock or 0),
            'imagenUrl': self.imagen_url or '',
            'esInsumo': bool(self.es_insumo),
            'precio': precio_pequena if precio_pequena > 0 else precio_venta,
            'precio_1': float(self.precio_pequena or 0),
            'precio_2': float(self.precio_mediana or 0),
            'precio_3': float(self.precio_grande or 0),
            'precio_personal': float(self.precio_pequena or 0),
            'precio_mediano': float(self.precio_mediana or 0),
            'precio_familiar': float(self.precio_grande or 0),
        }
