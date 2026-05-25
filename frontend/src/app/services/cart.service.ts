// Servicio compartido para el estado del carrito usando Signals.
// Autor: Camilo Martínez | Fecha: 23/03/2026 | Versión: 1.7

import { Injectable, computed, effect, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto } from '../models/producto.model';
import { environment } from '../../environments/environment';

export interface ArticuloCarrito {
  mesaId: number;
  productoId: number;
  tamanoId: number;
  cantidad: number;
  precioUnitario: number;
  nombre: string;
  tamano: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private _items = signal<ArticuloCarrito[]>(this.cargarDesdeStorage());

  public readonly items = this._items.asReadonly();

  public readonly totalArticulos = computed(() => this._items().reduce((acc, a) => acc + a.cantidad, 0));
  public readonly totalCarrito = computed(() => this._items().reduce((acc, a) => acc + a.precioUnitario * a.cantidad, 0));
  public readonly ivaCarrito = computed(() => Math.round(this.totalCarrito() * 0.19));
  public readonly totalConIva = computed(() => this.totalCarrito() + this.ivaCarrito());

  constructor() {
    effect(() => {
      const datos = this._items();
      localStorage.setItem('carrito', JSON.stringify(datos));
    });
  }

  private cargarDesdeStorage(): ArticuloCarrito[] {
    const json = localStorage.getItem('carrito');
    return json ? JSON.parse(json) : [];
  }

  agregarAlCarrito(producto: Producto, tamanoLabel: string, precioExacto: number, mesaId: number): void {
    this._items.update(actual => {
      const indice = actual.findIndex(a => a.productoId === producto.id && a.tamano === tamanoLabel && a.mesaId === mesaId);
      if (indice !== -1) {
        const articulo = actual[indice];
        const actualizado = { ...articulo, cantidad: articulo.cantidad + 1 };
        return [...actual.slice(0, indice), actualizado, ...actual.slice(indice + 1)];
      }
      const nuevo: ArticuloCarrito = {
        mesaId: mesaId,
        productoId: producto.id,
        tamanoId: 0,
        cantidad: 1,
        precioUnitario: precioExacto,
        nombre: producto.nombre,
        tamano: tamanoLabel
      };
      return [...actual, nuevo];
    });
  }

  quitarArticulo(indice: number): void { this._items.update(actual => actual.filter((_, i) => i !== indice)); }
  aumentarCantidad(indice: number): void { this._items.update(actual => actual.map((item, i) => i === indice ? { ...item, cantidad: item.cantidad + 1 } : item)); }
  disminuirCantidad(indice: number): void { this._items.update(actual => actual.map((item, i) => i === indice ? { ...item, cantidad: item.cantidad - 1 } : item).filter(item => item.cantidad > 0)); }
  vaciarCarrito(): void { this._items.set([]); }

  confirmarPedido(usuarioId: number): Observable<any> {
    const payload = {
      usuario_id: usuarioId,
      subtotal: this.totalCarrito(),
      iva: this.ivaCarrito(),
      total: this.totalConIva(),
      fecha_hora: new Date().toISOString().slice(0, 19).replace('T', ' '),
      articulos: this._items().map(item => ({ producto_id: item.productoId, nombre: item.nombre, tamano: item.tamano, cantidad: item.cantidad, precio: item.precioUnitario }))
    };
    return this.http.post(`${this.apiUrl}/pedidos`, payload);
  }

  // NUEVAS FUNCIONES
  unirMesas(mesaOrigen: number, mesaDestino: number): void {
    this._items.update(actual => actual.map(item => item.mesaId === mesaOrigen ? { ...item, mesaId: mesaDestino } : item));
  }
  moverItemAMesa(indiceItem: number, nuevaMesaId: number): void {
    this._items.update(actual => actual.map((item, i) => i === indiceItem ? { ...item, mesaId: nuevaMesaId } : item));
  }
}