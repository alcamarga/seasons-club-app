export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock_actual: number; // <--- ¡Este es el nuevo campo!
}