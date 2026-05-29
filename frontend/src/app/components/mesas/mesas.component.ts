/**
 * -------------------------------------------------------------
 * 🌌 SEASONS CLUB APP - FRONTEND SERVICES
 * -------------------------------------------------------------
 * @file        mesa.component.ts
 * @description Gestión lógica de mesas, consumo y rentabilidad.
 * @author      Camilo Martinez Galarza <Developer>
 * @version     1.2.0 — Fase B.2: modo unir mesas + barra flotante
 * -------------------------------------------------------------
 */

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { InventarioService } from '../../services/inventario.service';
import { MesaService } from '../../services/mesa.service';
import {
  ArticuloLineaMesa,
  ConsumoGrupoMeta,
  CONSUMO_GRUPO_VACIO,
  Mesa,
  RespuestaConsumoMesa,
} from '../../models/mesa.model';
import { FacturaPrintComponent } from '../factura-print/factura-print.component';
import { PagoComponent, ConfirmacionPagoEfectivo } from '../pago/pago.component';
import { Producto } from '../../models/producto.model';

type ModoMapa = 'normal' | 'unir';

@Component({
  selector: 'app-mesas',
  standalone: true,
  imports: [CommonModule, FacturaPrintComponent, PagoComponent],
  templateUrl: './mesas.component.html',
  styleUrls: ['./mesas.component.scss']
})
export class MesasComponent implements OnInit, OnDestroy {
  mostrarModal = false;
  mostrarModalPago = false;
  mesaSeleccionada: Mesa | null = null;
  cargandoAccionMesa = false;
  cargando = false;
  mesas: Mesa[] = [];

  /** Modo mapa: comanda normal vs selección para unir mesas. */
  modoMapa: ModoMapa = 'normal';
  mesasSeleccionadasUnion = new Set<number>();
  mesaAnfitrionaId: number | null = null;
  cargandoUnion = false;
  errorUnion: string | null = null;
  private ordenSeleccionUnion: number[] = [];

  productosReales: ArticuloLineaMesa[] = [];
  totalCuentaReal = 0;
  grupoActivo: ConsumoGrupoMeta = { ...CONSUMO_GRUPO_VACIO };
  menuBarra: Producto[] = [];

  facturaParaImprimir: unknown = null;
  private subCatalogo?: Subscription;
  private subCuentaMesa?: Subscription;
  private intervaloCuentaMesa: ReturnType<typeof setInterval> | null = null;
  /** Evita que el polling pise una mutación POST en curso. */
  private mutacionCuentaEnCurso = false;

  constructor(private mesaSrv: MesaService, public inventarioService: InventarioService) { }

  get enModoUnir(): boolean {
    return this.modoMapa === 'unir';
  }

  get cantidadSeleccionadas(): number {
    return this.mesasSeleccionadasUnion.size;
  }

  get puedeUnir(): boolean {
    return this.cantidadSeleccionadas >= 2 && this.mesaAnfitrionaId != null;
  }

  get mesasSeleccionadasLista(): Mesa[] {
    return this.mesas.filter((m) => this.mesasSeleccionadasUnion.has(m.id));
  }

  get mostrarBarraUnion(): boolean {
    return this.enModoUnir && this.cantidadSeleccionadas >= 1;
  }

  ngOnInit(): void {
    this.cargarMesas();
    this.cargarMenuBarra();
    this.subCatalogo = this.inventarioService.productosChanged$.subscribe(() => this.sincronizarMenuBarra());
  }

  ngOnDestroy(): void {
    this.subCatalogo?.unsubscribe();
    this.subCuentaMesa?.unsubscribe();
    this.detenerPollingCuentaMesa();
  }

  private aplicarConsumoEnVista(res: RespuestaConsumoMesa): void {
    this.productosReales = res.pedido?.articulos ?? [];
    this.totalCuentaReal = res.pedido?.total ?? 0;
    this.grupoActivo = {
      grupo_mesa_id: res.grupo_mesa_id ?? null,
      mesa_anfitriona_id: res.mesa_anfitriona_id ?? null,
      mesas_del_grupo: res.mesas_del_grupo ?? [],
      numeros_mesas_grupo: res.numeros_mesas_grupo ?? [],
      es_grupo_activo: res.es_grupo_activo ?? false,
    };
  }

  urlFondoCatalogo(prod: Producto): string {
    const url = this.inventarioService.resolverUrlImagen(prod.imagenUrl);
    if (!url || url.includes('seasons-logo2.png')) {
      return 'none';
    }
    const segura = url.replace(/"/g, '%22');
    return `url("${segura}")`;
  }

  cargarMesas(): void {
    this.cargando = true;
    this.mesaSrv.obtenerMesas().subscribe({
      next: (data) => {
        this.mesas = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error mesas:', err);
        this.cargando = false;
      },
    });
  }

  sincronizarMenuBarra(): void {
    const productos = this.inventarioService.obtenerCatalogoBarraDesdeCache();
    this.menuBarra = productos.map((p) => ({
      ...p,
      precio: p.precioVenta || 0,
    })) as Producto[];
  }

  cargarMenuBarra(): void {
    if (this.inventarioService.tieneProductosEnCache()) {
      this.sincronizarMenuBarra();
      return;
    }
    this.inventarioService.obtenerProductosParaBarra().subscribe({
      next: () => this.sincronizarMenuBarra(),
      error: () => {
        this.menuBarra = [];
      },
    });
  }

  activarModoUnir(): void {
    this.cerrarModal();
    this.modoMapa = 'unir';
    this.limpiarSeleccionUnion();
    this.errorUnion = null;
  }

  cancelarModoUnir(): void {
    this.modoMapa = 'normal';
    this.limpiarSeleccionUnion();
    this.errorUnion = null;
  }

  private limpiarSeleccionUnion(): void {
    this.mesasSeleccionadasUnion.clear();
    this.ordenSeleccionUnion = [];
    this.mesaAnfitrionaId = null;
  }

  mesaEsSeleccionableUnion(m: Mesa): boolean {
    return m.estado === 'OCUPADA' && !m.grupo_mesa_id;
  }

  clasesMesaGrid(m: Mesa): Record<string, boolean> {
    return {
      libre: m.estado === 'LIBRE',
      ocupada: m.estado === 'OCUPADA',
      'grupo-activo': !!m.grupo_mesa_id,
      'seleccionada-union': this.enModoUnir && this.mesasSeleccionadasUnion.has(m.id),
      'anfitriona-union': this.enModoUnir && this.mesaAnfitrionaId === m.id,
      'no-seleccionable-union':
        this.enModoUnir && !this.mesaEsSeleccionableUnion(m) && !this.mesasSeleccionadasUnion.has(m.id),
    };
  }

  toggleSeleccionUnion(m: Mesa): void {
    if (!this.mesaEsSeleccionableUnion(m) && !this.mesasSeleccionadasUnion.has(m.id)) {
      return;
    }

    if (this.mesasSeleccionadasUnion.has(m.id)) {
      this.mesasSeleccionadasUnion.delete(m.id);
      this.ordenSeleccionUnion = this.ordenSeleccionUnion.filter((id) => id !== m.id);
      if (this.mesaAnfitrionaId === m.id) {
        this.mesaAnfitrionaId = this.ordenSeleccionUnion[0] ?? null;
      }
    } else {
      this.mesasSeleccionadasUnion.add(m.id);
      this.ordenSeleccionUnion.push(m.id);
      if (this.mesaAnfitrionaId == null) {
        this.mesaAnfitrionaId = m.id;
      }
    }
    this.errorUnion = null;
  }

  seleccionarAnfitriona(mesaId: number): void {
    if (this.mesasSeleccionadasUnion.has(mesaId)) {
      this.mesaAnfitrionaId = mesaId;
    }
  }

  numeroMesaPorId(mesaId: number): number {
    return this.mesas.find((m) => m.id === mesaId)?.numero_mesa ?? mesaId;
  }

  ejecutarUnionMesas(): void {
    if (!this.puedeUnir || this.cargandoUnion || this.mesaAnfitrionaId == null) {
      return;
    }

    const mesaIds = [...this.ordenSeleccionUnion];
    this.cargandoUnion = true;
    this.errorUnion = null;

    this.mesaSrv.unirMesasApi(mesaIds, this.mesaAnfitrionaId).subscribe({
      next: (res) => {
        this.mesaSrv.sincronizarUnionEnCache(res);
        this.cargandoUnion = false;
        this.cancelarModoUnir();
        this.cargarMesas();
      },
      error: (err) => {
        this.cargandoUnion = false;
        this.errorUnion = err?.error?.message ?? 'No se pudieron unir las mesas';
      },
    });
  }

  onMesaClick(m: Mesa): void {
    if (this.enModoUnir) {
      this.toggleSeleccionUnion(m);
      return;
    }

    this.mesaSeleccionada = m;
    this.mostrarModal = true;
    this.cargarCuentaDeMesa(m.id);
    this.iniciarPollingCuentaMesa();
  }

  cargarCuentaDeMesa(id: number, forzar = false): void {
    if (this.mutacionCuentaEnCurso && !forzar) {
      return;
    }

    this.subCuentaMesa?.unsubscribe();
    this.subCuentaMesa = this.mesaSrv.obtenerConsumoMesa(id).subscribe({
      next: (res) => {
        this.mesaSrv.sincronizarPedidoDesdeRespuesta(id, res);
        this.aplicarConsumoEnVista(res);
      },
      error: () => {
        this.mesaSrv.obtenerConsumoLocal(id).subscribe({
          next: (resLocal) => this.aplicarConsumoEnVista(resLocal),
          error: () => {
            this.productosReales = [];
            this.totalCuentaReal = 0;
            this.grupoActivo = { ...CONSUMO_GRUPO_VACIO };
          },
        });
      },
    });
  }

  private iniciarPollingCuentaMesa(): void {
    this.detenerPollingCuentaMesa();
    this.intervaloCuentaMesa = setInterval(() => {
      if (this.mostrarModal && this.mesaSeleccionada && !this.mutacionCuentaEnCurso) {
        this.cargarCuentaDeMesa(this.mesaSeleccionada.id);
      }
    }, 3000);
  }

  private detenerPollingCuentaMesa(): void {
    if (this.intervaloCuentaMesa !== null) {
      clearInterval(this.intervaloCuentaMesa);
      this.intervaloCuentaMesa = null;
    }
  }

  inyectarTrago(prod: Producto & { precio?: number; precio_base?: number }): void {
    if (!this.mesaSeleccionada || this.mutacionCuentaEnCurso) return;

    const mesaId = this.mesaSeleccionada.id;
    const precioExtraido =
      parseFloat(String(prod.precio)) ||
      parseFloat(String(prod.precio_base)) ||
      prod.precioVenta ||
      0;
    const payload = {
      producto_id: prod.id,
      nombre: prod.nombre,
      precio: precioExtraido,
      cantidad: 1,
    };

    this.mutacionCuentaEnCurso = true;
    this.mesaSrv.agregarProductoAMesa(mesaId, payload).subscribe({
      next: (res) => {
        const resp = res as { pedido?: RespuestaConsumoMesa['pedido'] };
        if (resp?.pedido) {
          this.mesaSrv.sincronizarPedidoDesdeRespuesta(mesaId, {
            mesa_id: mesaId,
            tiene_consumo: true,
            pedido: resp.pedido,
            ...this.grupoActivo,
          });
        }
        this.cargarCuentaDeMesa(mesaId, true);
        this.mutacionCuentaEnCurso = false;
      },
      error: (err) => {
        console.error('Error al agregar producto a la mesa:', err);
        if (err?.status === 404) {
          alert('Abre la comanda de la mesa antes de agregar productos.');
        }
        this.mesaSrv.agregarProductoLocal(mesaId, payload);
        this.mesaSrv.obtenerConsumoLocal(mesaId).subscribe((local) => this.aplicarConsumoEnVista(local));
        this.mutacionCuentaEnCurso = false;
      },
    });
  }

  cambiarCantidadTrago(productoId: number, operacion: 'sumar' | 'restar'): void {
    if (!this.mesaSeleccionada || this.mutacionCuentaEnCurso) return;
    const mesaId = this.mesaSeleccionada.id;

    this.mutacionCuentaEnCurso = true;
    this.mesaSrv.modificarCantidadMesa(mesaId, productoId, operacion).subscribe({
      next: (res) => {
        this.mesaSrv.sincronizarPedidoDesdeRespuesta(mesaId, res);
        this.cargarCuentaDeMesa(mesaId, true);
        this.mutacionCuentaEnCurso = false;
      },
      error: () => {
        this.aplicarCantidadLocal(mesaId, productoId, operacion);
        this.mutacionCuentaEnCurso = false;
      },
    });
  }

  private aplicarCantidadLocal(mesaId: number, productoId: number, operacion: 'sumar' | 'restar'): void {
    const key = `mesa_consumo_${mesaId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const consumo = JSON.parse(raw) as RespuestaConsumoMesa;
    const prod = consumo.pedido.articulos.find((p) => p.producto_id === productoId);
    if (!prod) return;
    if (operacion === 'sumar') prod.cantidad++;
    else prod.cantidad = Math.max(0, prod.cantidad - 1);
    consumo.pedido.articulos = consumo.pedido.articulos.filter((p) => p.cantidad > 0);
    consumo.pedido.total = consumo.pedido.articulos.reduce(
      (sum, p) => sum + p.precio * p.cantidad,
      0,
    );
    localStorage.setItem(key, JSON.stringify(consumo));
    this.aplicarConsumoEnVista(consumo);
  }

  cambiarPrecioTrago(productoId: number, precioActual: number): void {
    if (!this.mesaSeleccionada || this.mutacionCuentaEnCurso) return;
    const nuevoPrecioStr = prompt(`Digite el nuevo precio:`, precioActual.toString());
    if (nuevoPrecioStr === null || isNaN(parseFloat(nuevoPrecioStr))) return;
    const nuevoPrecio = parseFloat(nuevoPrecioStr);
    const mesaId = this.mesaSeleccionada.id;

    this.mutacionCuentaEnCurso = true;
    this.mesaSrv.modificarPrecioMesa(mesaId, productoId, nuevoPrecio).subscribe({
      next: (res) => {
        this.mesaSrv.sincronizarPedidoDesdeRespuesta(mesaId, res);
        this.cargarCuentaDeMesa(mesaId, true);
        this.mutacionCuentaEnCurso = false;
      },
      error: () => {
        const key = `mesa_consumo_${mesaId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const consumo = JSON.parse(raw) as RespuestaConsumoMesa;
          const prod = consumo.pedido.articulos.find((p) => p.producto_id === productoId);
          if (prod) {
            prod.precio = nuevoPrecio;
            consumo.pedido.total = consumo.pedido.articulos.reduce(
              (sum, p) => sum + p.precio * p.cantidad,
              0,
            );
            localStorage.setItem(key, JSON.stringify(consumo));
            this.aplicarConsumoEnVista(consumo);
          }
        }
        this.mutacionCuentaEnCurso = false;
      },
    });
  }

  abrirComandaMesa(): void {
    if (!this.mesaSeleccionada) return;
    this.cargandoAccionMesa = true;
    this.mesaSrv.actualizarEstado(this.mesaSeleccionada.id, 'OCUPADA').subscribe({
      next: () => {
        if (this.mesaSeleccionada) {
          this.mesaSeleccionada.estado = 'OCUPADA';
          this.cargarCuentaDeMesa(this.mesaSeleccionada.id, true);
        }
        this.cargandoAccionMesa = false;
      },
      error: () => {
        this.cargandoAccionMesa = false;
      },
    });
  }

  abrirPagoEfectivo(): void {
    if (!this.mesaSeleccionada || this.totalCuentaReal <= 0) {
      alert('No hay consumo para cobrar en esta mesa.');
      return;
    }
    this.mostrarModalPago = true;
  }

  cerrarModalPago(): void {
    this.mostrarModalPago = false;
  }

  confirmarPagoEfectivo(_detalle: ConfirmacionPagoEfectivo): void {
    this.mostrarModalPago = false;
    this.cobrarYFacturarMesa('Efectivo');
  }

  private limpiarCacheConsumoActual(): void {
    if (this.grupoActivo.es_grupo_activo && this.grupoActivo.mesas_del_grupo.length > 0) {
      for (const mesaId of this.grupoActivo.mesas_del_grupo) {
        localStorage.removeItem(`mesa_consumo_${mesaId}`);
      }
      return;
    }
    if (this.mesaSeleccionada) {
      localStorage.removeItem(`mesa_consumo_${this.mesaSeleccionada.id}`);
    }
  }

  private finalizarFacturacionExitosa(): void {
    this.limpiarCacheConsumoActual();
    this.detenerPollingCuentaMesa();
    this.cargandoAccionMesa = false;
    this.mostrarModal = false;
    this.mesaSeleccionada = null;
    this.grupoActivo = { ...CONSUMO_GRUPO_VACIO };
    this.cargarMesas();
  }

  cobrarYFacturarMesa(metodoPago: string): void {
    if (!this.mesaSeleccionada) return;
    this.cargandoAccionMesa = true;
    this.mesaSrv.facturarMesa(this.mesaSeleccionada.id, metodoPago).subscribe({
      next: () => {
        this.imprimirFactura({
          pedido: { articulos: this.productosReales, total: this.totalCuentaReal },
        });
        // El backend libera mesa(s) del grupo al facturar; no PATCH LIBRE extra.
        this.finalizarFacturacionExitosa();
      },
      error: (err) => {
        console.error('Error crítico en facturación:', err);
        this.cargandoAccionMesa = false;
        alert('No se pudo completar el pago. Verifique conexión.');
      },
    });
  }

  imprimirFactura(datosFactura: { pedido: { articulos: ArticuloLineaMesa[]; total: number } }): void {
    try {
      if (!datosFactura?.pedido) {
        console.error('Datos de factura inválidos:', datosFactura);
        alert('No hay datos suficientes para imprimir la factura.');
        return;
      }

      const total = Number(datosFactura.pedido.total) || 0;
      const subtotal = total / 1.19;
      const iva = total - subtotal;
      const fmt = (n: number) => Math.round(n).toLocaleString('es-CO');
      const articulos = datosFactura.pedido.articulos ?? [];
      const ventanaImpresion = window.open('', '_blank', 'width=300,height=500');
      if (!ventanaImpresion) {
        alert('Por favor, permite las ventanas emergentes.');
        return;
      }
      ventanaImpresion.document.write(`
      <html>
        <head><title>Ticket Seasons Club</title></head>
        <style>
          body { font-family: 'Courier New', monospace; width: 280px; padding: 10px; font-size: 13px; }
          .header { text-align: center; }
          table { width: 100%; border-collapse: collapse; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .right { text-align: right; }
          .total-section { border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 5px 0; margin-top: 8px; }
          .total-final { font-weight: bold; margin-top: 4px; }
        </style>
        <body>
          <div class="header"><h2>SEASONS CLUB</h2><p>Factura de venta</p></div>
          <table>
            ${articulos.map((p) => `
              <tr>
                <td>${p.cantidad} x ${p.nombre}</td>
                <td class="right">$${fmt(p.precio * p.cantidad)}</td>
              </tr>
            `).join('')}
          </table>
          <div class="total-section">
            <div class="row"><span>Subtotal:</span><span>$${fmt(subtotal)}</span></div>
            <div class="row"><span>IVA (19%):</span><span>$${fmt(iva)}</span></div>
            <div class="row total-final"><span>TOTAL:</span><span>$${fmt(total)}</span></div>
          </div>
          <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
        </body>
      </html>
    `);
      ventanaImpresion.document.close();
    } catch (err) {
      console.error('Error al imprimir factura:', err);
      alert('Ocurrió un error al generar el ticket de impresión.');
    }
  }

  mostrarOrigenLinea(p: ArticuloLineaMesa): boolean {
    return (
      this.grupoActivo.es_grupo_activo &&
      p.mesa_origen_numero != null &&
      p.mesa_origen_numero !== this.mesaSeleccionada?.numero_mesa
    );
  }

  cerrarModal(): void {
    this.detenerPollingCuentaMesa();
    this.subCuentaMesa?.unsubscribe();
    this.mutacionCuentaEnCurso = false;
    this.mostrarModal = false;
    this.mesaSeleccionada = null;
    this.grupoActivo = { ...CONSUMO_GRUPO_VACIO };
  }
}
