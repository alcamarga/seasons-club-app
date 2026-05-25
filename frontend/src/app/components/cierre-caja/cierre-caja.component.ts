import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MesaService } from '../../services/mesa.service';
import { ImpresionReporteUtil } from '../../utils/impresion-reporte.util';

export interface CierreHistorial {
  id: number;
  fecha_corte: string;
  total: number;
  subtotal: number;
  iva: number;
  efectivo: number;
  transferencia: number;
  cantidad_ventas: number;
}

@Component({
  selector: 'app-cierre-caja',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'cierre-caja.component.html',
  styleUrls: ['./cierre-caja.component.scss']
})
export class CierreCajaComponent implements OnInit {
  reporte: any = null;
  historialCierres: CierreHistorial[] = [];
  cargando = false;
  cargandoHistorial = false;
  cerrando = false;
  error: string | null = null;

  constructor(private mesaService: MesaService) { }

  ngOnInit(): void {
    this.cargarReporte();
    this.cargarHistorialCierres();
  }

  cargarReporte(): void {
    this.cargando = true;
    this.error = null;
    this.mesaService.obtenerReporteDiario().subscribe({
      next: (data) => {
        this.reporte = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar reporte', err);
        this.error = 'No se pudo cargar el reporte diario. Verifique la conexión con el servidor.';
        this.cargando = false;
      }
    });
  }

  cargarHistorialCierres(): void {
    this.cargandoHistorial = true;
    this.mesaService.obtenerHistorialCierres().subscribe({
      next: (data) => {
        this.historialCierres = (data as CierreHistorial[]) ?? [];
        this.cargandoHistorial = false;
      },
      error: (err) => {
        console.error('Error al cargar historial de cierres', err);
        this.historialCierres = [];
        this.cargandoHistorial = false;
      }
    });
  }

  realizarCierre(): void {
    if (!this.reporte || this.reporte.cantidad_ventas === 0) {
      alert('No hay ventas en la jornada actual para cerrar.');
      return;
    }

    if (!confirm('¿Confirmar cierre de caja? Las ventas posteriores contarán para la siguiente jornada.')) {
      return;
    }

    this.cerrando = true;
    this.error = null;
    this.mesaService.realizarCierreCaja().subscribe({
      next: (res) => {
        const resp = res as { reporte_cerrado?: unknown };
        this.cerrando = false;
        this.imprimirCierre(resp.reporte_cerrado ?? this.reporte);
        this.cargarReporte();
        this.cargarHistorialCierres();
        alert('Cierre de caja registrado correctamente.');
      },
      error: (err) => {
        console.error('Error al cerrar caja', err);
        this.cerrando = false;
        this.error = err?.error?.message || 'No se pudo registrar el cierre de caja.';
      }
    });
  }

  imprimirReporteActual(): void {
    if (!this.reporte?.cantidad_ventas) {
      alert('No hay datos de la jornada actual para imprimir.');
      return;
    }
    ImpresionReporteUtil.imprimir('jornada');
  }

  imprimirHistorialCierres(): void {
    if (!this.historialCierres.length) {
      alert('No hay cierres históricos para imprimir.');
      return;
    }
    ImpresionReporteUtil.imprimir('historial-cierres');
  }

  formatearFecha(fechaIso: string): string {
    if (!fechaIso) return '—';
    try {
      return new Date(fechaIso).toLocaleString('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return fechaIso;
    }
  }

  totalHistorial(): number {
    return this.historialCierres.reduce((sum, c) => sum + (c.total || 0), 0);
  }

  imprimirCierre(reporteImpresion?: any): void {
    const reporte = reporteImpresion ?? this.reporte;
    if (!reporte) return;

    const fmt = (n: number) => Math.round(n || 0).toLocaleString('es-CO');
    const ventana = window.open('', '_blank', 'width=320,height=600');
    if (!ventana) {
      alert('Por favor, permite las ventanas emergentes para imprimir.');
      return;
    }

    try {
      ventana.document.write(`
        <html>
          <head><title>Cierre Seasons Club</title></head>
          <style>
            body { font-family: 'Courier New', monospace; padding: 12px; font-size: 13px; }
            h2 { text-align: center; margin-bottom: 4px; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; }
            .section { border-top: 1px dashed #000; margin-top: 10px; padding-top: 8px; }
          </style>
          <body>
            <h2>CIERRE DE CAJA</h2>
            <p style="text-align:center;">Seasons Club</p>
            <div class="section">
              <div class="row"><span>Ventas:</span><span>${reporte.cantidad_ventas ?? 0}</span></div>
              <div class="row"><span>Subtotal:</span><span>$${fmt(reporte.subtotal)}</span></div>
              <div class="row"><span>IVA (19%):</span><span>$${fmt(reporte.iva)}</span></div>
              <div class="row"><strong>Total:</strong><strong>$${fmt(reporte.total)}</strong></div>
              <div class="row"><span>Efectivo:</span><span>$${fmt(reporte.efectivo)}</span></div>
              <div class="row"><span>Transferencia:</span><span>$${fmt(reporte.transferencia)}</span></div>
            </div>
            <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
          </body>
        </html>
      `);
      ventana.document.close();
    } catch (err) {
      console.error('Error al imprimir cierre:', err);
      alert('Ocurrió un error al generar la impresión del cierre.');
    }
  }
}
