import { Producto } from '../models/producto.model';

/** Prioridad de categorías: mismo orden en inventario y catálogo de mesas. */
export const ORDEN_CATEGORIAS_PRODUCTO: Record<string, number> = {
  Licores: 1,
  Cerveza: 2,
  Cervezas: 2,
  Coctel: 3,
  Cocteles: 3,
};

export function ordenarProductosPorCategoria(productos: Producto[]): Producto[] {
  const orden = ORDEN_CATEGORIAS_PRODUCTO;
  return [...productos].sort(
    (a, b) => (orden[a.categoria] ?? 99) - (orden[b.categoria] ?? 99)
  );
}
