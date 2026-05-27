import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Producto, ProductoDesdeApi } from '../models/producto.model';
import { ordenarProductosPorCategoria } from '../utils/orden-productos.util';
import { environment } from '../../environments/environment';

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
  private readonly apiUrl = `${environment.apiUrl}/productos`;
  private readonly jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  private products: Producto[] = [];
  /** Emite cuando el catálogo cambia (crear/editar/borrar/imagen) para refrescar mesas. */
  private readonly productosChanged = new Subject<void>();
  readonly productosChanged$ = this.productosChanged.asObservable();

  constructor(private http: HttpClient) {
    // No cargar mocks al inicio: la fuente de verdad es GET /api/productos
    this.products = [];
  }

  /** Load products from LocalStorage or initialise mock data. */
  private loadProducts(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.products = JSON.parse(stored) as Producto[];
      } catch (e) {
        this.initializeMockData();
      }
    } else {
      this.initializeMockData();
    }
  }

  private notificarCambioCatalogo(): void {
    this.productosChanged.next();
  }

  /** Avisa a mesas que el caché ya tiene datos (sin disparar nuevo GET). */
  avisarCatalogoActualizado(): void {
    this.productosChanged.next();
  }

  /** Indica si ya hay productos en memoria (evita GET duplicados). */
  tieneProductosEnCache(): boolean {
    return this.products.length > 0;
  }

  private filtrarParaBarra(lista: Producto[]): Producto[] {
    return lista.filter((p) => !p.esInsumo && (p.precioVenta ?? 0) > 0);
  }

  /** Lista sincrónica para el catálogo de mesas (sin HTTP), ordenada por categoría. */
  obtenerCatalogoBarraDesdeCache(): Producto[] {
    return ordenarProductosPorCategoria(this.filtrarParaBarra(this.products));
  }

  /** Convierte rutas /static/uploads a URL servible por el navegador. */
  resolverUrlImagen(url: string | undefined | null): string {
    const limpia = (url ?? '').trim();
    if (!limpia || limpia === 'undefined' || limpia === 'null') {
      return 'assets/seasons-logo2.png';
    }
    if (limpia.startsWith('assets/') || limpia.startsWith('http://') || limpia.startsWith('https://') || limpia.startsWith('data:')) {
      return limpia;
    }
    if (limpia.startsWith('/static/')) {
      const base = (environment.serverUrl || '').replace(/\/$/, '');
      if (!base) {
        return limpia;
      }
      return `${base}${limpia}`;
    }
    return limpia;
  }

  /** Payload explícito para POST/PUT: evita enviar campos calculados obsoletos (margen, costoUnitario viejo). */
  private prepararPayloadApi(producto: Producto): Record<string, unknown> {
    const costo = Number(producto.precioCompra ?? producto.costoUnitario ?? 0);
    const venta = Number(producto.precioVenta ?? producto.precio_venta ?? 0);
    let imagenUrl = producto.imagenUrl ?? '';
    if (typeof imagenUrl === 'string' && imagenUrl.startsWith('data:')) {
      imagenUrl = '';
    }

    return {
      nombre: producto.nombre,
      categoria: producto.categoria,
      stock: Number(producto.stock ?? 0),
      esInsumo: Boolean(producto.esInsumo ?? false),
      imagenUrl,
      costo_unitario: costo,
      precio_venta: venta,
      precioCompra: costo,
      precioVenta: venta,
      costoUnitario: costo,
    };
  }

  /** Initialise a set of mock products for development/testing. */
  private initializeMockData(): void {
    this.products = [
      { id: 1, nombre: 'Cerveza Corona Extra', categoria: 'Cervezas', precioCompra: 5000, precioVenta: 12000, stock: 120, imagenUrl: 'assets/productos/cerveza-corona.png', esInsumo: false },
      { id: 2, nombre: 'Cerveza Club Colombia Dorada', categoria: 'Cervezas', precioCompra: 5000, precioVenta: 8000, stock: 150, imagenUrl: 'assets/productos/cerveza-club-colombia.png', esInsumo: false },
      { id: 3, nombre: 'Margarita Classic', categoria: 'Cocteles', precioCompra: 15000, precioVenta: 28000, stock: 80, imagenUrl: 'assets/productos/margarita.png', esInsumo: false },
      { id: 4, nombre: 'Mojito Cubano', categoria: 'Cocteles', precioCompra: 15000, precioVenta: 26000, stock: 95, imagenUrl: 'assets/productos/mojito.png', esInsumo: false },
      { id: 5, nombre: 'Limón Tahití (Kg)', categoria: 'Insumos', precioCompra: 2000, precioVenta: 0, stock: 15, imagenUrl: 'assets/productos/limon.png', esInsumo: true },
      { id: 6, nombre: 'Hojas de Menta (Gramos)', categoria: 'Insumos', precioCompra: 2000, precioVenta: 0, stock: 500, imagenUrl: 'assets/productos/menta.png', esInsumo: true },
      { id: 7, nombre: 'Jarabe de Goma (Botella 1L)', categoria: 'Insumos', precioCompra: 2000, precioVenta: 0, stock: 10, imagenUrl: 'assets/productos/jarabe-goma.png', esInsumo: true },
    ];
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.products));
  }

  /** Normaliza la respuesta del backend al contrato Producto de Angular. */
  private normalizarProducto(raw: ProductoDesdeApi): Producto {
    const costo = Number(
      raw.costoUnitario ?? raw.costo_unitario ?? raw.precioCompra ?? raw.precio_compra ?? 0
    );
    const venta = Number(raw.precioVenta ?? raw.precio_venta ?? raw.precio ?? 0);

    const margenDineroBackend = raw.margen_dinero;
    const margenDineroFrontend = raw.margenDinero;
    const margenRaw =
      margenDineroBackend != null ? margenDineroBackend : margenDineroFrontend;
    let margenDinero = margenRaw != null ? Number(margenRaw) : venta - costo;

    const margenPorcentajeBackend = raw.margen_porcentaje;
    const margenPorcentajeFrontend = raw.margenPorcentaje;
    const porcentajeRaw =
      margenPorcentajeBackend != null ? margenPorcentajeBackend : margenPorcentajeFrontend;
    let margenPorcentaje =
      porcentajeRaw != null
        ? Number(porcentajeRaw)
        : venta > 0
          ? ((venta - costo) / venta) * 100
          : 0;

    if (Number.isNaN(margenDinero)) {
      margenDinero = venta - costo;
    }
    if (Number.isNaN(margenPorcentaje)) {
      margenPorcentaje = venta > 0 ? ((venta - costo) / venta) * 100 : 0;
    }
    margenDinero = Math.round(margenDinero * 100) / 100;
    margenPorcentaje = Math.round(margenPorcentaje * 100) / 100;

    return {
      id: Number(raw.id ?? 0),
      nombre: String(raw.nombre ?? ''),
      categoria: String(raw.categoria ?? 'General'),
      precioCompra: costo,
      precioVenta: venta,
      costoUnitario: costo,
      margenDinero,
      margenPorcentaje,
      stock: Number(raw.stock ?? 0),
      imagenUrl: this.resolverUrlImagen(String(raw.imagenUrl ?? '')),
      esInsumo: Boolean(raw.esInsumo ?? false),
    };
  }

  /** Productos vendibles en barra. Usa caché si ya se cargó el inventario. */
  obtenerProductosParaBarra(): Observable<Producto[]> {
    if (this.products.length > 0) {
      return of(this.obtenerCatalogoBarraDesdeCache());
    }
    return this.obtenerProductos().pipe(map(() => this.obtenerCatalogoBarraDesdeCache()));
  }

  subirImagenProducto(productoId: number, archivo: File): Observable<Producto> {
    const formData = new FormData();
    formData.append('imagen', archivo);
    return this.http
      .post<{ imagenUrl: string; producto?: ProductoDesdeApi }>(`${this.apiUrl}/${productoId}/imagen`, formData)
      .pipe(
        map((resp) =>
          this.normalizarProducto(
            resp.producto ?? { id: productoId, imagenUrl: resp.imagenUrl }
          )
        ),
        tap((actualizado) => {
          const idx = this.products.findIndex((p) => p.id === productoId);
          if (idx !== -1) {
            this.products[idx] = actualizado;
          }
          this.persist();
          this.notificarCambioCatalogo();
        })
      );
  }

  /** Public API: observable list of products from backend. */
  obtenerProductos(): Observable<Producto[]> {
    return this.http.get<ProductoDesdeApi[]>(this.apiUrl, { headers: this.jsonHeaders }).pipe(
      map((data) => (Array.isArray(data) ? data : []).map((p) => this.normalizarProducto(p))),
      tap((data) => {
        this.products = ordenarProductosPorCategoria(data);
        this.persist();
      }),
      catchError(() => of([]))
    );
  }

  obtenerProductosList(): Producto[] {
    return [...this.products];
  }

  /** Add a new product after validation and persist it. */
  agregarProducto(producto: Producto): Observable<Producto> {
    this.validateProducto(producto);
    const payload = this.prepararPayloadApi(producto);
    delete payload['id'];

    return this.http.post<ProductoDesdeApi>(this.apiUrl, payload, { headers: this.jsonHeaders }).pipe(
      map((resp) => this.normalizarProducto(resp)),
      tap((creado) => {
        this.products.push(creado);
        this.products = ordenarProductosPorCategoria(this.products);
        this.persist();
        this.notificarCambioCatalogo();
      })
    );
  }

  /** Update an existing product (by id) after validation. */
  actualizarProducto(producto: Producto): Observable<Producto> {
    this.validateProducto(producto, true);
    const payload = this.prepararPayloadApi(producto);
    return this.http.put<ProductoDesdeApi>(`${this.apiUrl}/${producto.id}`, payload, { headers: this.jsonHeaders }).pipe(
      map((resp) => this.normalizarProducto(resp)),
      tap((actualizado) => {
        const idx = this.products.findIndex((p) => p.id === producto.id);
        if (idx !== -1) {
          this.products[idx] = { ...actualizado };
        }
        this.products = ordenarProductosPorCategoria(this.products);
        this.persist();
        this.notificarCambioCatalogo();
      })
    );
  }

  /** Remove a product by id and persist the change. */
  eliminarProducto(id: number): Observable<{ mensaje?: string }> {
    return this.http.delete<{ mensaje?: string }>(`${this.apiUrl}/${id}`, { headers: this.jsonHeaders }).pipe(
      tap(() => {
        this.products = this.products.filter((p) => p.id !== id);
        this.persist();
        this.notificarCambioCatalogo();
      })
    );
  }

  obtenerImagenUrlConFallback(productoId: number): string {
    const producto = this.products.find((p) => p.id === productoId);
    return producto ? this.resolverUrlImagen(producto.imagenUrl) : 'assets/seasons-logo2.png';
  }

  actualizarStock(
    id: number,
    delta: number
  ): Observable<{ nuevo_stock?: number; producto?: ProductoDesdeApi }> {
    return this.http
      .patch<{ nuevo_stock?: number; producto?: ProductoDesdeApi }>(
        `${this.apiUrl}/${id}/stock`,
        { delta },
        { headers: this.jsonHeaders }
      )
      .pipe(
        tap((resp) => {
          const p = this.products.find((x) => x.id === id);
          if (p) {
            p.stock = resp.producto?.stock ?? Math.max(0, p.stock + delta);
            this.persist();
          }
        })
      );
  }

  fetchProductos(): Observable<Producto[]> {
    return this.http.get<ProductoDesdeApi[]>(this.apiUrl, { headers: this.jsonHeaders }).pipe(
      map((data) => (Array.isArray(data) ? data : []).map((p) => this.normalizarProducto(p))),
      catchError(() => of(this.products))
    );
  }

  private validateProducto(producto: Producto, requireId: boolean = false): void {
    if (requireId && (!producto.id || producto.id <= 0)) throw new Error('ID inválido.');
    if (!producto.nombre || producto.nombre.trim().length === 0) throw new Error('Nombre obligatorio.');
    if (!producto.categoria || producto.categoria.trim().length === 0) throw new Error('Categoría obligatoria.');
    if ((producto.precioVenta ?? 0) < 0) throw new Error('Precio no puede ser negativo.');
    if (producto.stock < 0) throw new Error('Stock no puede ser negativo.');
    if (!producto.imagenUrl) producto.imagenUrl = '';
  }
}
