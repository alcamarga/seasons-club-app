/**
 * -------------------------------------------------------------
 * 🌌 SEASONS CLUB APP - FRONTEND SERVICES
 * -------------------------------------------------------------
 * @file        mesa.service.ts
 * @description Proveedor de servicios HTTP para conectar las mesas con el backend.
 * @author      Camilo Martinez Galarza <Developer>
 * @created     2026-05-19
 * @version     1.1.0
 * -------------------------------------------------------------
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Mapeo de la estructura de datos para TypeScript
export interface Mesa {
  id: number;
  numero_mesa: number;
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class MesaService {
  // URL base apuntando al backend de Flask local
  private apiUrl = 'http://127.0.0.1:5000/api/mesas';

  constructor(private http: HttpClient) {}

  // 🟢 Consultar la lista completa de mesas (GET /api/mesas)
  obtenerMesas(): Observable<Mesa[]> {
    return this.http.get<Mesa[]>(this.apiUrl);
  }

 // 🔴 Cambiar estado entre LIBRE y OCUPADA enviando un PATCH real con los datos
 actualizarEstado(id: number, estado: string): Observable<any> {
  return this.http.patch<any>(`http://127.0.0.1:5000/api/mesas/${id}/estado`, { estado });
}

  // 🍹 NUEVO: Consultar el ticket de consumo real de una mesa (GET /api/mesas/:id/consumo)
  obtenerConsumo(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/consumo`);
  }

// 🍹 NUEVO: Traer todos los licores y cocteles disponibles en la barra (GET)
obtenerProductosBarra(): Observable<any[]> {
  return this.http.get<any[]>('http://127.0.0.1:5000/api/productos-barra');
}

// ⚡ NUEVO: Inyectar un producto al JSON de la comanda de una mesa (POST)
añadirProductoAMesa(mesaId: number, producto: { producto_id: number, nombre: string, precio: number }): Observable<any> {
  return this.http.post<any>(`http://127.0.0.1:5000/api/mesas/${mesaId}/añadir`, producto);
}

// 📊 NUEVO: Enviar la operación de sumar o restar una unidad a un trago del ticket
alterarCantidadProducto(mesaId: number, productoId: number, operacion: 'sumar' | 'restar'): Observable<any> {
  return this.http.post<any>(`http://127.0.0.1:5000/api/mesas/${mesaId}/cantidad`, {
    producto_id: productoId,
    operacion: operacion
  });
}
// 💰 NUEVO: Modificar el precio de venta real de un artículo en el ticket
alterarPrecioProducto(mesaId: number, productoId: number, nuevoPrecio: number): Observable<any> {
  return this.http.post<any>(`http://127.0.0.1:5000/api/mesas/${mesaId}/precio`, {
    producto_id: productoId,
    nuevo_precio: nuevoPrecio
  });
}

}