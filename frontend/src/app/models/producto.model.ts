/**
 * Modelo que representa un artículo dentro del inventario de Seasons Club.
 * Define la estructura de productos comerciales e insumos (materias primas).
 */
export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precioCompra: number;  // Nuevo: Costo para ti
  precioVenta: number;   // Precio al público
  stock: number;
  imagenUrl: string;
  esInsumo: boolean;
}