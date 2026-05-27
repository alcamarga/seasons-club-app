/**
 * Modelo que representa un artículo dentro del inventario de Seasons Club.
 * Define la estructura de productos comerciales e insumos (materias primas).
 */
export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precioCompra: number;
  precioVenta?: number;
  /** Alias snake_case del API (solo en respuestas crudas; no usar en plantillas). */
  precio_venta?: number;
  costoUnitario?: number;
  margenDinero?: number;
  margenPorcentaje?: number;
  stock: number;
  imagenUrl: string;
  esInsumo: boolean;
}

/**
 * Payload JSON del backend: acepta camelCase y snake_case en la misma respuesta.
 */
export interface ProductoDesdeApi {
  id?: number;
  nombre?: string;
  categoria?: string;
  precioCompra?: number;
  precio_compra?: number;
  precioVenta?: number;
  precio_venta?: number;
  precio?: number;
  costoUnitario?: number;
  costo_unitario?: number;
  margenDinero?: number;
  margen_dinero?: number;
  margenPorcentaje?: number;
  margen_porcentaje?: number;
  stock?: number;
  imagenUrl?: string;
  esInsumo?: boolean;
}
