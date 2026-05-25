import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Mesa { id: number; numero_mesa: number; estado: string; }

export interface PayloadProductoMesa {
  producto_id: number;
  nombre: string;
  precio: number;
  cantidad?: number;
}

@Injectable({ providedIn: 'root' })
export class MesaService {
  private readonly apiUrl = `${environment.apiUrl}/mesas`;

  constructor(private http: HttpClient) { }

  private claveConsumo(mesaId: number): string {
    return `mesa_consumo_${mesaId}`;
  }

  private guardarConsumoLocal(mesaId: number, datos: { pedido: { articulos: unknown[]; total: number }; tiene_consumo?: boolean }): void {
    localStorage.setItem(this.claveConsumo(mesaId), JSON.stringify({
      tiene_consumo: datos.tiene_consumo ?? true,
      pedido: datos.pedido,
    }));
  }

  obtenerMesas(): Observable<Mesa[]> {
    return this.http.get<Mesa[]>(this.apiUrl);
  }

  actualizarEstado(id: number, estado: string): Observable<unknown> {
    return this.http.patch<unknown>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  obtenerConsumoLocal(mesaId: number): Observable<unknown> {
    const data = localStorage.getItem(this.claveConsumo(mesaId));
    return of(data ? JSON.parse(data) : { tiene_consumo: false, pedido: { articulos: [], total: 0 } });
  }

  obtenerConsumoMesa(mesaId: number): Observable<unknown> {
    const id = Number(mesaId);
    if (!Number.isFinite(id) || id <= 0) {
      return of({ tiene_consumo: false, pedido: { articulos: [], total: 0 } });
    }
    return this.http.get<unknown>(`${this.apiUrl}/${id}/consumo`);
  }

  agregarProductoAMesa(mesaId: number, producto: PayloadProductoMesa): Observable<unknown> {
    const id = Number(mesaId);
    const body = {
      producto_id: producto.producto_id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: producto.cantidad ?? 1,
    };
    return this.http.post<unknown>(`${this.apiUrl}/${id}/agregar`, body);
  }

  modificarCantidadMesa(mesaId: number, productoId: number, operacion: 'sumar' | 'restar'): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/${mesaId}/cantidad`, { producto_id: productoId, operacion });
  }

  modificarPrecioMesa(mesaId: number, productoId: number, nuevoPrecio: number): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/${mesaId}/precio`, { producto_id: productoId, nuevo_precio: nuevoPrecio });
  }

  agregarProductoLocal(mesaId: number, producto: PayloadProductoMesa): void {
    const key = this.claveConsumo(mesaId);
    const raw = localStorage.getItem(key);
    const consumo = raw ? JSON.parse(raw) : { tiene_consumo: true, pedido: { articulos: [], total: 0 } };
    const index = consumo.pedido.articulos.findIndex((p: { producto_id: number }) => p.producto_id === producto.producto_id);
    if (index > -1) {
      consumo.pedido.articulos[index].cantidad += 1;
    } else {
      consumo.pedido.articulos.push({ ...producto, cantidad: producto.cantidad ?? 1 });
    }
    consumo.pedido.total = consumo.pedido.articulos.reduce(
      (sum: number, p: { precio: number; cantidad: number }) => sum + p.precio * p.cantidad,
      0
    );
    consumo.tiene_consumo = true;
    this.guardarConsumoLocal(mesaId, consumo);
  }

  sincronizarPedidoDesdeRespuesta(mesaId: number, res: unknown): void {
    const data = res as { pedido?: { articulos?: unknown[]; total?: number }; tiene_consumo?: boolean };
    if (data?.pedido) {
      this.guardarConsumoLocal(mesaId, {
        tiene_consumo: data.tiene_consumo ?? true,
        pedido: {
          articulos: data.pedido.articulos ?? [],
          total: data.pedido.total ?? 0,
        },
      });
    }
  }

  unirMesas(origen: number, destino: number): void {
    const dataOrigen = JSON.parse(localStorage.getItem(this.claveConsumo(origen)) || 'null');
    const dataDestino = JSON.parse(localStorage.getItem(this.claveConsumo(destino)) || '{"pedido": {"articulos": []}}');
    if (dataOrigen?.pedido) {
      dataDestino.pedido.articulos = [...dataDestino.pedido.articulos, ...dataOrigen.pedido.articulos];
      localStorage.setItem(this.claveConsumo(destino), JSON.stringify(dataDestino));
      localStorage.removeItem(this.claveConsumo(origen));
    }
  }

  facturarMesa(mesaId: number, metodoPago: string): Observable<unknown> {
    const data = JSON.parse(localStorage.getItem(this.claveConsumo(mesaId)) || 'null');
    const payload = { ...data, mesa_id: mesaId, metodo_pago: metodoPago, fecha: new Date().toISOString() };
    return this.http.post(`${environment.apiUrl}/facturas`, payload);
  }

  obtenerReporteDiario(): Observable<unknown> {
    return this.http.get<unknown>(`${environment.apiUrl}/reporte/diario`);
  }

  realizarCierreCaja(): Observable<unknown> {
    return this.http.post<unknown>(`${environment.apiUrl}/reporte/cierre`, {});
  }

  obtenerHistorialVentas(mesaId?: number): Observable<unknown> {
    const url = mesaId
      ? `${environment.apiUrl}/historial-ventas?mesa_id=${mesaId}`
      : `${environment.apiUrl}/historial-ventas`;
    return this.http.get<unknown>(url);
  }

  obtenerHistorialCierres(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${environment.apiUrl}/reporte/cierres`);
  }
}
