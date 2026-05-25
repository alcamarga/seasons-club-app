import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { InventarioService } from '../../services/inventario.service';
import { Producto } from '../../models/producto.model';
import { GlassPanelComponent } from '../glass-panel/glass-panel.component';
import { InventarioEditModalComponent, GuardarProductoEvento } from './inventario-edit-modal.component';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GlassPanelComponent, InventarioEditModalComponent],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css']
})
export class InventarioComponent implements OnInit {
  totalInversion: number = 0;
  totalUtilidad: number = 0;
  productos: Producto[] = [];
  productoSeleccionado: Producto | null = null;

  constructor(public inventarioService: InventarioService) { }

  ngOnInit(): void { this.cargarProductos(); }

  calcularTotales(): void {
    this.totalInversion = this.productos.reduce((sum, p) => sum + (p.precioCompra * p.stock), 0);
    const totalVenta = this.productos.reduce((sum, p) => sum + (p.precioVenta * p.stock), 0);
    this.totalUtilidad = totalVenta - this.totalInversion;
  }

  cargarProductos(): void {
    this.inventarioService.obtenerProductos().subscribe({
      next: (data) => {
        this.productos = data;
        this.calcularTotales();
        this.inventarioService.avisarCatalogoActualizado();
      },
      error: () => {
        alert('No se pudo cargar el inventario desde el servidor.');
      },
    });
  }

  agregarProducto(): void {
    this.productoSeleccionado = { id: 0, nombre: '', categoria: '', precioCompra: 0, precioVenta: 0, stock: 0, imagenUrl: '', esInsumo: false };
  }

  editarProducto(producto: Producto): void { this.productoSeleccionado = { ...producto }; }

  // Función necesaria para que el HTML deje de dar error
  cerrarModal(): void {
    this.productoSeleccionado = null;
  }

  onModalSave(evento: GuardarProductoEvento): void {
    const updated = evento.producto;
    const obs = updated.id === 0
      ? this.inventarioService.agregarProducto(updated)
      : this.inventarioService.actualizarProducto(updated);

    obs.subscribe({
      next: (guardado) => {
        const finalizar = () => {
          this.cargarProductos();
          this.productoSeleccionado = null;
        };
        if (evento.archivo) {
          this.inventarioService.subirImagenProducto(guardado.id, evento.archivo).subscribe({
            next: () => finalizar(),
            error: () => {
              alert('Producto guardado, pero falló la subida de la imagen.');
              finalizar();
            },
          });
        } else {
          finalizar();
        }
      },
      error: () => {
        alert('No se pudo guardar el producto. Revisa la consola y el backend.');
      },
    });
  }

  onFileSelected(event: any, productoId: number): void {
    const file = event?.target?.files?.[0];
    if (!file || productoId <= 0) {
      return;
    }
    this.inventarioService.subirImagenProducto(productoId, file).subscribe({
      next: () => this.cargarProductos(),
      error: () => alert('No se pudo subir la imagen del producto.'),
    });
  }

  eliminarProducto(producto: Producto): void {
    if (confirm('¿Eliminar?')) {
      this.inventarioService.eliminarProducto(producto.id).subscribe(() => this.cargarProductos());
    }
  }
}