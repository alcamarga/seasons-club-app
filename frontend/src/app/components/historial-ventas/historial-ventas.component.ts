import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Mesa, MesaService } from '../../services/mesa.service';
import { ImpresionReporteUtil } from '../../utils/impresion-reporte.util';

export interface VentaHistorial {
  id: number;
  mesa_id: number;
  numero_mesa: number;
  venta_id: number | null;
  total: number;
  subtotal: number;
  iva: number;
  metodo_pago: string;
  articulos: { nombre: string; cantidad: number; precio: number }[];
  fecha: string;
}

@Component({
  selector: 'app-historial-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial-ventas.component.html',
  styleUrls: ['./historial-ventas.component.scss']
})
export class HistorialVentasComponent implements OnInit {
  ventas: VentaHistorial[] = [];
  mesas: Mesa[] = [];
  mesaFiltro: number | null = null;
  cargando = false;
  error: string | null = null;
  ventaExpandidaId: number | null = null;

  constructor(private mesaService: MesaService) {}

  ngOnInit(): void {
    this.cargarMesas();
    this.cargarHistorial();
  }

  cargarMesas(): void {
    this.mesaService.obtenerMesas().subscribe({
      next: (data) => { this.mesas = data; },
      error: (err) => console.error('Error al cargar mesas para filtro:', err)
    });
  }

  cargarHistorial(): void {
    this.cargando = true;
    this.error = null;
    this.mesaService.obtenerHistorialVentas(this.mesaFiltro ?? undefined).subscribe({
      next: (data) => {
        this.ventas = (data as VentaHistorial[]) ?? [];
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar historial:', err);
        this.error = 'No se pudo cargar el historial de ventas.';
        this.ventas = [];
        this.cargando = false;
      }
    });
  }

  onFiltroChange(): void {
    this.ventaExpandidaId = null;
    this.cargarHistorial();
  }

  limpiarFiltro(): void {
    this.mesaFiltro = null;
    this.onFiltroChange();
  }

  toggleDetalle(ventaId: number): void {
    this.ventaExpandidaId = this.ventaExpandidaId === ventaId ? null : ventaId;
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

  totalVentas(): number {
    return this.ventas.reduce((sum, v) => sum + (v.total || 0), 0);
  }

  imprimirHistorial(): void {
    if (!this.ventas.length) {
      alert('No hay ventas para imprimir.');
      return;
    }
    ImpresionReporteUtil.imprimir('historial-ventas');
  }
}
