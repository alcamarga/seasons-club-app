import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { InventarioService } from '../../services/inventario.service';
import { Producto } from '../../models/producto.model';
import { GlassPanelComponent } from '../glass-panel/glass-panel.component';
import { InventarioEditModalComponent, GuardarProductoEvento } from './inventario-edit-modal.component';
import { ordenarProductosPorCategoria } from '../../utils/orden-productos.util';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GlassPanelComponent, InventarioEditModalComponent],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css']
})
export class InventarioComponent implements OnInit {
  totalInversion: number = 0;
  totalRentabilidad: number = 0;
  productos: Producto[] = [];
  productoSeleccionado: Producto | null = null;

  constructor(public inventarioService: InventarioService) { }

  ngOnInit(): void { this.cargarProductos(); }

  /** Inversión por fila: costo unitario × stock (columna Inversión). */
  inversionProducto(p: Producto): number {
    return (p.precioCompra ?? p.costoUnitario ?? 0) * (p.stock ?? 0);
  }

  /** Rentabilidad por fila: margen unitario × stock (columna Rentabilidad). */
  rentabilidadProducto(p: Producto): number {
    if (p.esInsumo) {
      return 0;
    }
    return (p.margenDinero ?? 0) * (p.stock ?? 0);
  }

  calcularTotales(): void {
    this.totalInversion = this.productos.reduce((sum, p) => sum + this.inversionProducto(p), 0);
    this.totalRentabilidad = this.productos.reduce((sum, p) => sum + this.rentabilidadProducto(p), 0);
  }

  cargarProductos(): void {
    this.inventarioService.obtenerProductos().subscribe({
      next: (data) => {
        this.productos = ordenarProductosPorCategoria(data);
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
    this.guardarProducto(evento);
  }

  /** Persiste producto nuevo o existente con costo_unitario y precio_venta explícitos. */
  guardarProducto(evento: GuardarProductoEvento): void {
    const base = evento.producto;
    const costo = Number(base.precioCompra ?? base.costoUnitario ?? 0);
    const venta = Number(base.precioVenta ?? 0);

    const productoParaApi: Producto = {
      ...base,
      precioCompra: costo,
      precioVenta: venta,
      costoUnitario: costo,
    };

    const obs = productoParaApi.id === 0
      ? this.inventarioService.agregarProducto(productoParaApi)
      : this.inventarioService.actualizarProducto(productoParaApi);

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

  /** Margen % bajo umbral de rentabilidad (30 %). */
  margenBajo(producto: Producto): boolean {
    if (producto.esInsumo) {
      return false;
    }
    return (producto.margenPorcentaje ?? 0) < 30;
  }

  /** Clase CSS de color según categoría (siempre devuelve una clase con color asignado). */
  obtenerClaseCategoria(categoria: string): string {
    const slug = (categoria || 'general')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const mapa: Record<string, string> = {
      licor: 'cat-licores',
      licores: 'cat-licores',
      cerveza: 'cat-cerveza',
      cervezas: 'cat-cerveza',
      coctel: 'cat-coctel',
      cocteles: 'cat-coctel',
      cocktail: 'cat-coctel',
      cocktails: 'cat-coctel',
      insumo: 'cat-insumo',
      insumos: 'cat-insumo',
      bebida: 'cat-bebidas',
      bebidas: 'cat-bebidas',
      snack: 'cat-snacks',
      snacks: 'cat-snacks',
      botella: 'cat-botellas',
      botellas: 'cat-botellas',
      general: 'cat-general',
    };

    if (mapa[slug]) {
      return mapa[slug];
    }

    const paletaAlterna = [
      'cat-alt-cyan',
      'cat-alt-rosa',
      'cat-alt-indigo',
      'cat-alt-lima',
      'cat-alt-teal',
      'cat-alt-gris',
    ];
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
      hash = (hash + slug.charCodeAt(i)) % paletaAlterna.length;
    }
    return paletaAlterna[hash];
  }
}