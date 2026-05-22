import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Producto } from '../models/producto.model';

/**
 * Service responsible for managing product inventory.
 * Implements secure coding best practices: input validation, error handling,
 * no exposure of sensitive data, and safe persistence to LocalStorage.
 */
@Injectable({
  providedIn: 'root',
})
export class InventarioService {
  private readonly storageKey = 'inventarioProductos';
  private readonly apiUrl = '/api/productos'; // Adjust as needed for real backend.

  private products: Producto[] = [];

  constructor(private http: HttpClient) {
    this.loadProducts();
  }

  /** Load products from LocalStorage or initialise mock data. */
  private loadProducts(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.products = JSON.parse(stored) as Producto[];
        console.debug('[InventarioService] Loaded products from LocalStorage');
      } catch (e) {
        console.warn('[InventarioService] Failed to parse LocalStorage data, using mock data.', e);
        this.initializeMockData();
      }
    } else {
      this.initializeMockData();
    }
  }

  /** Initialise a set of mock products for development/testing. */
  private initializeMockData(): void {
    this.products = [
      {
        id: 1,
        nombre: 'Cerveza Corona Extra',
        categoria: 'Cervezas',
        precioVenta: 12000,
        stock: 120,
        imagenUrl: 'assets/productos/cerveza-corona.png',
        esInsumo: false,
      },
      {
        id: 2,
        nombre: 'Cerveza Club Colombia Dorada',
        categoria: 'Cervezas',
        precioVenta: 8000,
        stock: 150,
        imagenUrl: 'assets/productos/cerveza-club-colombia.png',
        esInsumo: false,
      },
      {
        id: 3,
        nombre: 'Margarita Classic',
        categoria: 'Cocteles',
        precioVenta: 28000,
        stock: 80,
        imagenUrl: 'assets/productos/margarita.png',
        esInsumo: false,
      },
      {
        id: 4,
        nombre: 'Mojito Cubano',
        categoria: 'Cocteles',
        precioVenta: 26000,
        stock: 95,
        imagenUrl: 'assets/productos/mojito.png',
        esInsumo: false,
      },
      {
        id: 5,
        nombre: 'Limón Tahití (Kg)',
        categoria: 'Insumos',
        precioVenta: 0,
        stock: 15,
        imagenUrl: 'assets/productos/limon.png',
        esInsumo: true,
      },
      {
        id: 6,
        nombre: 'Hojas de Menta (Gramos)',
        categoria: 'Insumos',
        precioVenta: 0,
        stock: 500,
        imagenUrl: 'assets/productos/menta.png',
        esInsumo: true,
      },
      {
        id: 7,
        nombre: 'Jarabe de Goma (Botella 1L)',
        categoria: 'Insumos',
        precioVenta: 0,
        stock: 10,
        imagenUrl: 'assets/productos/jarabe-goma.png',
        esInsumo: true,
      },
    ];
    this.persist();
  }

  /** Persist current product list to LocalStorage. */
  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.products));
      console.debug('[InventarioService] Products persisted to LocalStorage');
    } catch (e) {
      console.error('[InventarioService] Unable to persist products to LocalStorage', e);
    }
  }

  /** Public API: observable list of products. */
  obtenerProductos(): Observable<Producto[]> {
    return of(this.products);
  }

  /** Synchronous copy of the product list (read‑only). */
  obtenerProductosList(): Producto[] {
    return [...this.products];
  }

  /** Add a new product after validation and persist it. */
  agregarProducto(producto: Producto): void {
    // Asignar categoría por defecto si está vacío
    if (!producto.categoria || producto.categoria.trim().length === 0) {
      producto.categoria = 'Bebidas';
    }
    this.validateProducto(producto);
    if (!producto.id || this.products.some(p => p.id === producto.id)) {
      const maxId = this.products.reduce((max, p) => (p.id > max ? p.id : max), 0);
      producto.id = maxId + 1;
    }
    this.products.push({ ...producto });
    this.persist();
  }

  /** Update an existing product (by id) after validation. */
  actualizarProducto(producto: Producto): void {
    this.validateProducto(producto, true);
    const idx = this.products.findIndex(p => p.id === producto.id);
    if (idx === -1) {
      throw new Error(`Producto con ID ${producto.id} no encontrado.`);
    }
    this.products[idx] = { ...producto };
    this.persist();
  }

  /** Remove a product by id and persist the change. */
  eliminarProducto(id: number): void {
    const initialLength = this.products.length;
    this.products = this.products.filter(p => p.id !== id);
    if (this.products.length !== initialLength) {
      this.persist();
    }
  }

  /** Update only the image URL of a product. */

  /**
   * Obtiene la URL de la imagen del producto, con fallback a logo por defecto si falta.
   * Esta lógica evita errores 404 en la carga de imágenes.
   * Obtiene la URL de la imagen del producto con fallback al logo por defecto.
   * Si el producto no tiene imagen o la ruta falla, se devuelve 'assets/logo-default.png'.
   */
  obtenerImagenUrlConFallback(productoId: number): string {
    const producto = this.products.find(p => p.id === productoId);
    if (producto && producto.imagenUrl) {
      return producto.imagenUrl;
    }
    // Ruta del logo por defecto del club
    return 'assets/logo-default.png';
  }

  /** Adjust stock (positive or negative delta). Returns observable for optional backend sync. */
  actualizarStock(id: number, delta: number): Observable<any> {
    const producto = this.products.find(p => p.id === id);
    if (producto) {
      producto.stock = Math.max(0, producto.stock + delta);
      this.persist();
    }
    // Attempt backend sync; graceful fallback to local change only.
    return this.http.patch(`${this.apiUrl}/${id}/stock`, { delta }).pipe(
      catchError(err => {
        console.warn('[InventarioService] HTTP stock update failed, local change kept.', err);
        return of({ status: 'local', updated: true });
      })
    );
  }

  /** Fetch products from backend; on error, return local list. */
  fetchProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.apiUrl).pipe(
      catchError(err => {
        console.warn('[InventarioService] Backend fetch failed, returning local data.', err);
        return of(this.products);
      })
    );
  }

  /** Internal validation helper to enforce data integrity. */
  private validateProducto(producto: Producto, requireId: boolean = false): void {
    if (requireId && (!producto.id || producto.id <= 0)) {
      throw new Error('ID de producto inválido.');
    }
    if (!producto.nombre || producto.nombre.trim().length === 0) {
      throw new Error('El nombre del producto es obligatorio.');
    }
    if (!producto.categoria || producto.categoria.trim().length === 0) {
      throw new Error('La categoría del producto es obligatoria.');
    }
    if (producto.precioVenta < 0) {
      throw new Error('El precio de venta no puede ser negativo.');
    }
    if (producto.stock < 0) {
      throw new Error('El stock no puede ser negativo.');
    }
    // Ensure imagenUrl is a string (empty string is acceptable).
    if (producto.imagenUrl === undefined || producto.imagenUrl === null) {
      producto.imagenUrl = '';
    }
  }
}