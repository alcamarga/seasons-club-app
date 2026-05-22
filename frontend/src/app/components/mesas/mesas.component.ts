/**
 * -------------------------------------------------------------
 * 🌌 SEASONS CLUB APP - FRONTEND SERVICES
 * -------------------------------------------------------------
 * @file        mesa.service.ts
 * @description Proveedor de servicios HTTP para conectar las mesas con el backend.
 * @author      Camilo Martinez Galarza <Developer>
 * @created     2026-05-19
 * @version     1.1.0
 * -------------------------------------------------------------
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventarioService } from '../../services/inventario.service';
import { MesaService, Mesa } from '../../services/mesa.service';
import { InventarioComponent } from '../inventario/inventario.component';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  imports: [CommonModule, InventarioComponent],
  templateUrl: './mesas.component.html',
  styleUrls: ['./mesas.component.scss']
})
export class MesasComponent implements OnInit {
  mostrarModal = false;
  mesaSeleccionada: Mesa | null = null;
  cargandoAccionMesa = false;
  cargando = false;
  mesas: Mesa[] = [];

  productosReales: any[] = [];
  totalCuentaReal = 0;
  mostrandoMenuBebidas = false;
  menuBarra: any[] = [];

  constructor(private mesaSrv: MesaService, private inventarioService: InventarioService) { }

  ngOnInit(): void {
    this.cargarMesas();
    this.cargarMenuBarra();
  }

  cargarMesas(): void {
    this.cargando = true;
    this.mesaSrv.obtenerMesas().subscribe({
      next: (data: any) => { this.mesas = data; this.cargando = false; },
      error: (err: any) => { console.error('Error mesas:', err); this.cargando = false; }
    });
  }

  // En mesas.component.ts
  cargarMenuBarra(): void {
    this.inventarioService.obtenerProductos().subscribe({
      next: (productos: Producto[]) => {
        this.menuBarra = productos.map(p => {
          // --- AQUÍ ESTÁ EL TRUCO ---
          console.log('Nombre del archivo en BD:', p.imagenUrl);
          return {
            ...p,
            precio: p.precioVenta || 0
          };
        });
      }
    });
  }
  onMesaClick(m: Mesa): void {
    this.mesaSeleccionada = m;
    this.mostrarModal = true;
    this.cargarConsumoReal(m.id);
  }

  // ✅ CORREGIDO: Ahora siempre actualiza, incluso si localStorage está vacío
  cargarConsumoReal(id: number): void {
    this.mesaSrv.obtenerConsumoLocal(id).subscribe({
      next: (res) => {
        // Si el objeto pedido existe, lo usamos, si no, inicializamos vacío
        const pedido = res?.pedido || { articulos: [], total: 0 };
        this.productosReales = pedido.articulos || [];
        this.totalCuentaReal = pedido.total || 0;
      },
      error: (err) => {
        console.error('Error consumo:', err);
        this.productosReales = [];
        this.totalCuentaReal = 0;
      }
    });
  }

  // En mesas.component.ts
  inyectarTrago(prod: any): void {
    if (!this.mesaSeleccionada) return;

    // Aquí forzamos la captura del precio. 
    // Si 'prod.precio' viene vacío, buscamos en 'prod.precio_base' o asignamos 0.
    const precioExtraido = parseFloat(prod.precio) || parseFloat(prod.precio_base) || 0;

    const payload = {
      producto_id: prod.id,
      nombre: prod.nombre,
      precio: precioExtraido, // <-- Aseguramos que siempre sea un número
      cantidad: 1
    };

    this.mesaSrv.agregarProductoLocal(this.mesaSeleccionada.id, payload);
    this.cargarConsumoReal(this.mesaSeleccionada.id);
  }

  cambiarCantidadTrago(productoId: number, operacion: 'sumar' | 'restar'): void {
    if (!this.mesaSeleccionada) return;
    const key = `mesa_consumo_${this.mesaSeleccionada.id}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      let consumo = JSON.parse(raw);
      const prod = consumo.pedido.articulos.find((p: any) => p.producto_id === productoId);
      if (prod) {
        if (operacion === 'sumar') prod.cantidad++;
        else prod.cantidad = Math.max(0, prod.cantidad - 1);

        consumo.pedido.articulos = consumo.pedido.articulos.filter((p: any) => p.cantidad > 0);
        consumo.pedido.total = consumo.pedido.articulos.reduce((sum: number, p: any) => sum + (p.precio * p.cantidad), 0);
        localStorage.setItem(key, JSON.stringify(consumo));
        this.cargarConsumoReal(this.mesaSeleccionada.id);
      }
    }
  }

  cambiarPrecioTrago(productoId: number, precioActual: number): void {
    if (!this.mesaSeleccionada) return;
    const nuevoPrecioStr = prompt(`Digite el nuevo precio:`, precioActual.toString());
    if (nuevoPrecioStr === null || isNaN(parseFloat(nuevoPrecioStr))) return;

    const nuevoPrecio = parseFloat(nuevoPrecioStr);
    const key = `mesa_consumo_${this.mesaSeleccionada.id}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      let consumo = JSON.parse(raw);
      const prod = consumo.pedido.articulos.find((p: any) => p.producto_id === productoId);
      if (prod) {
        prod.precio = nuevoPrecio;
        consumo.pedido.total = consumo.pedido.articulos.reduce((sum: number, p: any) => sum + (p.precio * p.cantidad), 0);
        localStorage.setItem(key, JSON.stringify(consumo));
        this.cargarConsumoReal(this.mesaSeleccionada.id);
      }
    }
  }

  abrirComandaMesa(): void {
    if (!this.mesaSeleccionada) return;
    this.cargandoAccionMesa = true;
    this.mesaSrv.actualizarEstado(this.mesaSeleccionada.id, 'OCUPADA').subscribe({
      next: () => {
        if (this.mesaSeleccionada) this.mesaSeleccionada.estado = 'OCUPADA';
        this.cargandoAccionMesa = false;
      }
    });
  }

  liberarMesa(): void {
    if (!this.mesaSeleccionada) return;
    if (confirm(`¿Cerrar cuenta Mesa #${this.mesaSeleccionada.numero_mesa}?`)) {
      localStorage.removeItem(`mesa_consumo_${this.mesaSeleccionada.id}`); // Limpiar local
      this.mesaSrv.actualizarEstado(this.mesaSeleccionada.id, 'LIBRE').subscribe({
        next: () => {
          this.mostrarModal = false;
          this.cargarMesas();
        }
      });
    }
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.mesaSeleccionada = null;
  }
}