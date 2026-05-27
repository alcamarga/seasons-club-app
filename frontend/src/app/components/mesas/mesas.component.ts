/**
 * -------------------------------------------------------------
 * 🌌 SEASONS CLUB APP - FRONTEND SERVICES
 * -------------------------------------------------------------
 * @file        mesa.component.ts
 * @description Gestión lógica de mesas, consumo y rentabilidad.
 * @author      Camilo Martinez Galarza <Developer>
 * @version     1.1.1
 * -------------------------------------------------------------
 */

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { InventarioService } from '../../services/inventario.service';
import { MesaService, Mesa } from '../../services/mesa.service';
import { FacturaPrintComponent } from '../factura-print/factura-print.component';
import { PagoComponent, ConfirmacionPagoEfectivo } from '../pago/pago.component';
import { Producto } from '../../models/producto.model';

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

  productosReales: any[] = [];
  totalCuentaReal = 0;
  mostrandoMenuBebidas = false;
  menuBarra: any[] = [];

  facturaParaImprimir: any = null;
  private subCatalogo?: Subscription;
  private subCuentaMesa?: Subscription;
  private intervaloCuentaMesa: ReturnType<typeof setInterval> | null = null;
  /** Evita que el polling pise una mutación POST en curso. */
  private mutacionCuentaEnCurso = false;

  constructor(private mesaSrv: MesaService, public inventarioService: InventarioService) { }

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

  private aplicarPedidoEnVista(res: unknown): void {
    const data = res as { pedido?: { articulos?: unknown[]; total?: number } };
    const pedido = data?.pedido ?? { articulos: [], total: 0 };
    this.productosReales = (pedido.articulos ?? []) as any[];
    this.totalCuentaReal = pedido.total ?? 0;
  }

  urlFondoCatalogo(prod: Producto): string {
    const url = this.inventarioService.resolverUrlImagen(prod.imagenUrl);
    if (!url || url.includes('seasons-logo2.png')) {
      return 'none';
    }
    const segura = url.replace(/"/g, '%22');
    return `url("${segura}")`;
  }

  calcularMargen(p: Producto): number {
    if (!p.precioVenta || p.precioVenta === 0) return 0;
    const ganancia = p.precioVenta - p.precioCompra;
    return (ganancia / p.precioVenta) * 100;
  }

  cargarMesas(): void {
    this.cargando = true;
    this.mesaSrv.obtenerMesas().subscribe({
      next: (data: any) => { this.mesas = data; this.cargando = false; },
      error: (err: any) => { console.error('Error mesas:', err); this.cargando = false; }
    });
  }

  /** Actualiza el catálogo desde caché (sin HTTP). */
  sincronizarMenuBarra(): void {
    const productos = this.inventarioService.obtenerCatalogoBarraDesdeCache();
    this.menuBarra = productos.map((p) => ({
      ...p,
      precio: p.precioVenta || 0,
    }));
  }

  /** Primera carga HTTP del catálogo (solo si el inventario aún no está en memoria). */
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

  onMesaClick(m: Mesa): void {
    this.mesaSeleccionada = m;
    this.mostrarModal = true;
    this.cargarCuentaDeMesa(m.id);
    this.iniciarPollingCuentaMesa();
  }

  /** Refresco de cuenta desde servidor; no compite con POST en curso salvo forzar=true. */
  cargarCuentaDeMesa(id: number, forzar = false): void {
    if (this.mutacionCuentaEnCurso && !forzar) {
      return;
    }

    this.subCuentaMesa?.unsubscribe();
    this.subCuentaMesa = this.mesaSrv.obtenerConsumoMesa(id).subscribe({
      next: (res) => {
        this.mesaSrv.sincronizarPedidoDesdeRespuesta(id, res);
        this.aplicarPedidoEnVista(res);
      },
      error: () => {
        this.mesaSrv.obtenerConsumoLocal(id).subscribe({
          next: (resLocal) => this.aplicarPedidoEnVista(resLocal),
          error: () => {
            this.productosReales = [];
            this.totalCuentaReal = 0;
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

  inyectarTrago(prod: any): void {
    if (!this.mesaSeleccionada || this.mutacionCuentaEnCurso) return;

    const mesaId = this.mesaSeleccionada.id;
    const precioExtraido = parseFloat(prod.precio) || parseFloat(prod.precio_base) || parseFloat(prod.precioVenta) || 0;
    const payload = {
      producto_id: prod.id,
      nombre: prod.nombre,
      precio: precioExtraido,
      cantidad: 1,
    };

    this.mutacionCuentaEnCurso = true;
    this.mesaSrv.agregarProductoAMesa(mesaId, payload).subscribe({
      next: (res) => {
        const resp = res as { pedido?: { articulos?: unknown[]; total?: number }; status?: string; message?: string };
        if (resp?.pedido) {
          this.mesaSrv.sincronizarPedidoDesdeRespuesta(mesaId, resp);
          this.aplicarPedidoEnVista(resp);
        } else {
          this.cargarCuentaDeMesa(mesaId, true);
        }
        this.mutacionCuentaEnCurso = false;
      },
      error: (err) => {
        console.error('Error al agregar producto a la mesa:', err);
        if (err?.status === 404) {
          alert('Abre la comanda de la mesa antes de agregar productos.');
        }
        this.mesaSrv.agregarProductoLocal(mesaId, payload);
        this.mesaSrv.obtenerConsumoLocal(mesaId).subscribe((local) => this.aplicarPedidoEnVista(local));
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
        this.aplicarPedidoEnVista(res);
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
    const consumo = JSON.parse(raw);
    const prod = consumo.pedido.articulos.find((p: any) => p.producto_id === productoId);
    if (!prod) return;
    if (operacion === 'sumar') prod.cantidad++;
    else prod.cantidad = Math.max(0, prod.cantidad - 1);
    consumo.pedido.articulos = consumo.pedido.articulos.filter((p: any) => p.cantidad > 0);
    consumo.pedido.total = consumo.pedido.articulos.reduce((sum: number, p: any) => sum + p.precio * p.cantidad, 0);
    localStorage.setItem(key, JSON.stringify(consumo));
    this.aplicarPedidoEnVista(consumo);
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
        this.aplicarPedidoEnVista(res);
        this.mutacionCuentaEnCurso = false;
      },
      error: () => {
        const key = `mesa_consumo_${mesaId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const consumo = JSON.parse(raw);
          const prod = consumo.pedido.articulos.find((p: any) => p.producto_id === productoId);
          if (prod) {
            prod.precio = nuevoPrecio;
            consumo.pedido.total = consumo.pedido.articulos.reduce((sum: number, p: any) => sum + p.precio * p.cantidad, 0);
            localStorage.setItem(key, JSON.stringify(consumo));
            this.aplicarPedidoEnVista(consumo);
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

  liberarMesa(): void {
    if (!this.mesaSeleccionada) return;
    if (confirm(`¿Cerrar cuenta Mesa #${this.mesaSeleccionada.numero_mesa}?`)) {
      localStorage.removeItem(`mesa_consumo_${this.mesaSeleccionada.id}`);
      this.mesaSrv.actualizarEstado(this.mesaSeleccionada.id, 'LIBRE').subscribe({
        next: () => {
          this.detenerPollingCuentaMesa();
          this.mostrarModal = false;
          this.cargarMesas();
        }
      });
    }
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

  cobrarYFacturarMesa(metodoPago: string): void {
    if (!this.mesaSeleccionada) return;
    this.cargandoAccionMesa = true;
    this.mesaSrv.facturarMesa(this.mesaSeleccionada.id, metodoPago).subscribe({
      next: (res) => {
        const datosParaImprimir = {
          pedido: { articulos: this.productosReales, total: this.totalCuentaReal }
        };
        this.imprimirFactura(datosParaImprimir);
        localStorage.removeItem(`mesa_consumo_${this.mesaSeleccionada!.id}`);
        this.mesaSrv.actualizarEstado(this.mesaSeleccionada!.id, 'LIBRE').subscribe({
          next: () => {
            this.detenerPollingCuentaMesa();
            this.cargandoAccionMesa = false;
            this.mostrarModal = false;
            this.cargarMesas();
          },
          error: (err) => {
            console.error("Error al liberar:", err);
            this.detenerPollingCuentaMesa();
            this.cargandoAccionMesa = false;
            this.mostrarModal = false;
          }
        });
      },
      error: (err) => {
        console.error("Error crítico en facturación:", err);
        this.cargandoAccionMesa = false;
        alert("No se pudo completar el pago. Verifique conexión.");
      }
    });
  }

  imprimirFactura(datosFactura: any): void {
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
            ${articulos.map((p: any) => `
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

  cerrarModal(): void {
    this.detenerPollingCuentaMesa();
    this.subCuentaMesa?.unsubscribe();
    this.mutacionCuentaEnCurso = false;
    this.mostrarModal = false;
    this.mesaSeleccionada = null;
  }
}