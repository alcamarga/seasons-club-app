import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { InventarioService } from '../../services/inventario.service';
import { Producto } from '../../models/producto.model';
import { GlassPanelComponent } from '../glass-panel/glass-panel.component';
import { InventarioEditModalComponent } from './inventario-edit-modal.component';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GlassPanelComponent, InventarioEditModalComponent],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css']
})
export class InventarioComponent implements OnInit {
  /** Lista de productos mostrada en la cuadrícula */
  productos: Producto[] = [];

  /** Producto que se está editando; null cuando el modal está cerrado */
  productoSeleccionado: Producto | null = null;

  constructor(private inventarioService: InventarioService) {}

  ngOnInit(): void {
    this.cargarProductos();
  }


  /** Abre el modal para crear un nuevo producto */
  agregarProducto(): void {
    this.productoSeleccionado = {
      id: 0,
      nombre: '',
      categoria: '',
      precioVenta: 0,
      stock: 0,
      imagenUrl: '',
      esInsumo: false
    };
  }

  cargarProductos(): void {
    this.inventarioService.obtenerProductos().subscribe({
      next: (data) => (this.productos = data),
      error: (err) => console.error('Error al cargar los productos:', err)
    });
  }

  /** Abre el modal de edición para el producto indicado */
  editarProducto(producto: Producto): void {
    // Clonar para evitar mutaciones prematuras en la lista
    this.productoSeleccionado = { ...producto };
  }

  /** Cierra el modal sin guardar cambios */
  cerrarModal(): void {
    this.productoSeleccionado = null;
  }

  /** Maneja el evento de guardado del modal */
  onModalSave(updated: Producto): void {
    if (!updated) return;
    if (!updated.id || updated.id === 0) {
      // Nuevo producto
      this.inventarioService.agregarProducto(updated);
    } else {
      this.inventarioService.actualizarProducto(updated);
    }
    this.cargarProductos();
    this.productoSeleccionado = null;
  }


  /** Elimina un producto (implementación de demostración) */
  eliminarProducto(producto: Producto): void {
    if (confirm(`¿Eliminar "${producto.nombre}"?`)) {
      // Demo: eliminar localmente; el servicio podría manejar persistencia
      this.productos = this.productos.filter(p => p.id !== producto.id);
    }
  }

  /** Captura una imagen y la asigna temporalmente al producto */
  onFileSelected(event: any, productoId: number): void {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      // Actualizar en el arreglo local
      const prod = this.productos.find(p => p.id === productoId);
      if (prod) {
        prod.imagenUrl = url;
        // Persistir cambio en el servicio
        this.inventarioService.actualizarProducto({
          ...prod,
          // manteniendo otros campos
        });
      }
    };
    reader.readAsDataURL(file);
  }

  /** Ajusta el stock de un producto (utilidad auxiliar) */
  ajustarStock(producto: Producto, cantidad: number): void {
    this.inventarioService.actualizarStock(producto.id, cantidad).subscribe({
      next: () => this.cargarProductos(),
      error: (err) => console.error('Error al ajustar el stock:', err)
    });
  }
}