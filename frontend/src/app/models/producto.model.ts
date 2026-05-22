/**
 * Modelo que representa un artículo dentro del inventario de Seasons Club.
 * Define la estructura de productos comerciales e insumos (materias primas).
 */
export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precioVenta: number;
  stock: number;
  imagenUrl: string; // Ruta para la imagen del producto (ej: assets/productos/aguardiente.png)
  esInsumo: boolean;  // true si es materia prima (limón, menta, etc.), false si es producto final listo para la venta
}