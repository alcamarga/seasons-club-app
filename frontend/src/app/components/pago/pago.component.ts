import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlassPanelComponent } from '../glass-panel/glass-panel.component';

export interface ConfirmacionPagoEfectivo {
  entregado: number;
  cambio: number;
  total: number;
}

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CommonModule, GlassPanelComponent],
  templateUrl: './pago.component.html',
  styleUrls: ['./pago.component.scss'],
})
export class PagoComponent {
  @Input({ required: true }) total = 0;
  @Output() confirmar = new EventEmitter<ConfirmacionPagoEfectivo>();
  @Output() cancelar = new EventEmitter<void>();

  readonly denominaciones: number[] = [
    50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000,
  ];

  readonly teclas: string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];

  entregado = 0;
  bufferTeclado = '';

  get cambio(): number {
    return this.entregadoVisual - this.total;
  }

  get entregadoVisual(): number {
    const extra = this.bufferTeclado ? Number(this.bufferTeclado) : 0;
    return this.entregado + (Number.isNaN(extra) ? 0 : extra);
  }

  get cambioNegativo(): boolean {
    return this.cambio < 0;
  }

  get cambioPositivo(): boolean {
    return this.cambio > 0;
  }

  get puedeConfirmar(): boolean {
    return this.entregadoVisual >= this.total && this.total > 0;
  }

  formatearDenominacion(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor);
  }

  sumarDenominacion(valor: number): void {
    this.aplicarBufferTeclado();
    this.entregado += valor;
  }

  pulsarTecla(tecla: string): void {
    if (tecla === '⌫') {
      this.bufferTeclado = this.bufferTeclado.slice(0, -1);
      return;
    }
    if (this.bufferTeclado.length >= 9) {
      return;
    }
    this.bufferTeclado += tecla;
  }

  limpiarEntregado(): void {
    this.entregado = 0;
    this.bufferTeclado = '';
  }

  aplicarBufferTeclado(): void {
    if (!this.bufferTeclado) {
      return;
    }
    const extra = Number(this.bufferTeclado);
    if (!Number.isNaN(extra) && extra > 0) {
      this.entregado += extra;
    }
    this.bufferTeclado = '';
  }

  onConfirmar(): void {
    this.aplicarBufferTeclado();
    this.confirmar.emit({
      entregado: this.entregado,
      cambio: this.entregado - this.total,
      total: this.total,
    });
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}
