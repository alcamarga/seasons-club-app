// Interfaces para la gestión de pedidos.
// Autor: Camilo Martinez | Fecha: 23/03/2026 | Versión: 4.2

export interface ArticuloPedido {
  nombre: string;
  tamano: string;
  cantidad: number;
  precio: number;
}

export interface Pedido {
  id: number;
  usuario_id?: number;
  cliente?: string;
  fecha_hora?: string;
  fecha?: string;
  articulos?: ArticuloPedido[];
  pizzas?: string;
  subtotal?: number;
  iva?: number;
  total: number;
  estado?: string;
  direccion?: string;
}

export interface CargaPedido {
  items: ArticuloPedido[];
  total: number;
}
