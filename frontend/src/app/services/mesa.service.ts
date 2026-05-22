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
import { Observable, of } from 'rxjs';

export interface Mesa {
  id: number;
  numero_mesa: number;
  estado: string;
}

@Injectable({ providedIn: 'root' })
export class MesaService {
  private apiUrl = 'http://127.0.0.1:5000/api/mesas';

  constructor(private http: HttpClient) { }

  // Métodos de comunicación con Backend
  obtenerMesas(): Observable<Mesa[]> { return this.http.get<Mesa[]>(this.apiUrl); }
  actualizarEstado(id: number, estado: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  // --- LÓGICA LOCAL OPTIMIZADA ---

  obtenerConsumoLocal(mesaId: number): Observable<any> {
    const data = localStorage.getItem(`mesa_consumo_${mesaId}`);
    return of(data ? JSON.parse(data) : { tiene_consumo: false, pedido: { articulos: [], total: 0 } });
  }

  agregarProductoLocal(mesaId: number, producto: any): void {
    const key = `mesa_consumo_${mesaId}`;
    const raw = localStorage.getItem(key);
    let consumo = raw ? JSON.parse(raw) : { tiene_consumo: true, pedido: { articulos: [], total: 0 } };

    // Buscar si ya existe el producto para sumar cantidad
    const index = consumo.pedido.articulos.findIndex((p: any) => p.producto_id === producto.producto_id);

    if (index > -1) {
      consumo.pedido.articulos[index].cantidad += 1;
    } else {
      consumo.pedido.articulos.push({ ...producto, cantidad: 1 });
    }

    // Recalcular total
    consumo.pedido.total = consumo.pedido.articulos.reduce((sum: number, p: any) => sum + (p.precio * p.cantidad), 0);
    consumo.tiene_consumo = true;

    localStorage.setItem(key, JSON.stringify(consumo));
  }
}