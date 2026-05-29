import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  crearConsumoVacio,
  Mesa,
  PayloadProductoMesa,
  PayloadUnirMesas,
  RespuestaConsumoMesa,
  RespuestaUnirMesas,
} from '../models/mesa.model';

/** Re-export para compatibilidad con imports existentes desde el servicio. */
export type {
  ArticuloLineaMesa,
  ConsumoGrupoMeta,
  GrupoMesaDto,
  Mesa,
  PayloadProductoMesa,
  PayloadUnirMesas,
  PedidoConsumoMesa,
  RespuestaConsumoMesa,
  RespuestaUnirMesas,
} from '../models/mesa.model';

@Injectable({ providedIn: 'root' })
export class MesaService {
  private readonly apiUrl = `${environment.apiUrl}/mesas`;

  constructor(private http: HttpClient) { }

  private claveConsumo(mesaId: number): string {
    return `mesa_consumo_${mesaId}`;
  }

  private guardarConsumoLocal(mesaId: number, datos: RespuestaConsumoMesa): void {
    localStorage.setItem(this.claveConsumo(mesaId), JSON.stringify(datos));
  }

  obtenerMesas(): Observable<Mesa[]> {
    return this.http.get<Mesa[]>(this.apiUrl);
  }

  actualizarEstado(id: number, estado: string): Observable<unknown> {
    return this.http.patch<unknown>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  obtenerConsumoLocal(mesaId: number): Observable<RespuestaConsumoMesa> {
    const data = localStorage.getItem(this.claveConsumo(mesaId));
    if (!data) {
      return of(crearConsumoVacio(mesaId));
    }
    try {
      const parsed = JSON.parse(data) as Partial<RespuestaConsumoMesa>;
      return of({
        ...crearConsumoVacio(mesaId),
        ...parsed,
        pedido: {
          ...parsed.pedido,
          total: parsed.pedido?.total ?? 0,
          articulos: parsed.pedido?.articulos ?? [],
        },
        grupo_mesa_id: parsed.grupo_mesa_id ?? null,
        mesa_anfitriona_id: parsed.mesa_anfitriona_id ?? null,
        mesas_del_grupo: parsed.mesas_del_grupo ?? [],
        numeros_mesas_grupo: parsed.numeros_mesas_grupo ?? [],
        es_grupo_activo: parsed.es_grupo_activo ?? false,
      });
    } catch {
      return of(crearConsumoVacio(mesaId));
    }
  }

  obtenerConsumoMesa(mesaId: number): Observable<RespuestaConsumoMesa> {
    const id = Number(mesaId);
    if (!Number.isFinite(id) || id <= 0) {
      return of(crearConsumoVacio(id));
    }
    return this.http.get<RespuestaConsumoMesa>(`${this.apiUrl}/${id}/consumo`);
  }

  /** Une mesas ocupadas en un pedido maestro (Fase B.1). */
  unirMesasApi(mesaIds: number[], mesaAnfitrionaId: number): Observable<RespuestaUnirMesas> {
    const body: PayloadUnirMesas = {
      mesa_ids: mesaIds,
      mesa_anfitriona_id: mesaAnfitrionaId,
    };
    return this.http.post<RespuestaUnirMesas>(`${this.apiUrl}/unir`, body);
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
    const consumo: RespuestaConsumoMesa = raw
      ? (JSON.parse(raw) as RespuestaConsumoMesa)
      : crearConsumoVacio(mesaId);

    const index = consumo.pedido.articulos.findIndex((p) => p.producto_id === producto.producto_id);
    if (index > -1) {
      consumo.pedido.articulos[index].cantidad += 1;
    } else {
      consumo.pedido.articulos.push({ ...producto, cantidad: producto.cantidad ?? 1 });
    }
    consumo.pedido.total = consumo.pedido.articulos.reduce(
      (sum, p) => sum + p.precio * p.cantidad,
      0,
    );
    consumo.tiene_consumo = true;
    this.guardarConsumoLocal(mesaId, consumo);
  }

  sincronizarPedidoDesdeRespuesta(mesaId: number, res: RespuestaConsumoMesa | unknown): void {
    const data = res as RespuestaConsumoMesa;
    if (!data?.pedido) {
      return;
    }

    const consumo: RespuestaConsumoMesa = {
      mesa_id: data.mesa_id ?? mesaId,
      tiene_consumo: data.tiene_consumo ?? true,
      pedido: {
        ...data.pedido,
        articulos: data.pedido.articulos ?? [],
        total: data.pedido.total ?? 0,
      },
      grupo_mesa_id: data.grupo_mesa_id ?? null,
      mesa_anfitriona_id: data.mesa_anfitriona_id ?? null,
      mesas_del_grupo: data.mesas_del_grupo ?? [],
      numeros_mesas_grupo: data.numeros_mesas_grupo ?? [],
      es_grupo_activo: data.es_grupo_activo ?? false,
    };
    this.guardarConsumoLocal(mesaId, consumo);
  }

  /** Sincroniza caché local tras unir mesas (pedido maestro + metadatos de grupo). */
  sincronizarUnionEnCache(respuesta: RespuestaUnirMesas): void {
    const consumoBase: RespuestaConsumoMesa = {
      mesa_id: respuesta.mesa_anfitriona_id,
      tiene_consumo: (respuesta.pedido.articulos?.length ?? 0) > 0,
      pedido: respuesta.pedido,
      grupo_mesa_id: respuesta.grupo_mesa.id,
      mesa_anfitriona_id: respuesta.mesa_anfitriona_id,
      mesas_del_grupo: respuesta.mesa_ids,
      numeros_mesas_grupo: respuesta.numeros_mesas,
      es_grupo_activo: true,
    };

    for (const mesaId of respuesta.mesa_ids) {
      this.guardarConsumoLocal(mesaId, { ...consumoBase, mesa_id: mesaId });
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
