import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MesaService, Mesa } from '../../services/mesa.service';
import { InventarioComponent } from '../inventario/inventario.component';

@Component({
  selector: 'app-mesas',
  standalone: true,
  imports: [CommonModule, InventarioComponent],
  templateUrl: './mesas.component.html',
  styleUrls: ['./mesas.component.scss']
})
export class MesasComponent implements OnInit {
  
  // 🎛️ Controladores del Modal Estilo Lina POS
  mostrarModal = false;
  mesaSeleccionada: Mesa | null = null;
  cargandoAccionMesa = false;
  cargando = false; // Añadido porque lo usas en cargarMesas
  mesas: Mesa[] = []; // Añadido porque lo usas en cargarMesas

  // 🍹 Datos del consumo activo de la mesa
  productosReales: any[] = [];
  totalCuentaReal = 0;

  // 🍾 Controladores para el menú táctil de adición de tragos
  mostrandoMenuBebidas = false;
  menuBarra: any[] = [];

  constructor(private mesaSrv: MesaService) {}

  ngOnInit(): void {
    this.cargarMesas();
    this.cargarMenuBarra();
  }

  // 🟢 Cargar el mapa de mesas desde el backend
  cargarMesas(): void {
    this.cargando = true;
    this.mesaSrv.obtenerMesas().subscribe({
      next: (data) => {
        this.mesas = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar mesas:', err);
        this.cargando = false;
      }
    });
  }

  // 🍾 Cargar el catálogo completo de bebidas
  cargarMenuBarra(): void {
    this.mesaSrv.obtenerProductosBarra().subscribe({
      next: (productos) => {
        this.menuBarra = productos;
      },
      error: (err) => {
        console.error('❌ Error al precargar productos de barra:', err);
      }
    });
  }

  // 🛎️ Evento al dar clic a una mesa
  onMesaClick(m: Mesa): void {
    this.mesaSeleccionada = m;
    this.mostrarModal = true;
    this.productosReales = [];
    this.totalCuentaReal = 0;
    this.mostrandoMenuBebidas = false;

    if (m.estado === 'OCUPADA') {
      this.cargarConsumoReal(m.id);
    }
  }

  // 📝 Consultar la cuenta en tiempo real
  cargarConsumoReal(id: number): void {
    this.mesaSrv.obtenerConsumo(id).subscribe({
      next: (res) => {
        if (res.tiene_consumo && res.pedido) {
          this.productosReales = res.pedido.articulos || [];
          this.totalCuentaReal = res.pedido.total || 0;
        }
      },
      error: (err) => {
        console.error('❌ Error al traer consumo de la BD:', err);
      }
    });
  }

  // 🚀 Inyectar un trago
  inyectarTrago(prod: any): void {
    if (!this.mesaSeleccionada) return;

    const payload = {
      producto_id: prod.id,
      nombre: prod.nombre,
      precio: prod.precio_base || prod.precio,
      cantidad: 1
    };

    this.mesaSrv.añadirProductoAMesa(this.mesaSeleccionada.id, payload).subscribe({
      next: (res) => {
        this.cargarConsumoReal(this.mesaSeleccionada!.id);
      },
      error: (err) => {
        console.error('❌ Error al inyectar trago:', err);
      }
    });
  }

  // 🎛️ Modificar cantidad
  cambiarCantidadTrago(productoId: number, operacion: 'sumar' | 'restar'): void {
    if (!this.mesaSeleccionada) return;
    this.mesaSrv.alterarCantidadProducto(this.mesaSeleccionada.id, productoId, operacion).subscribe({
      next: () => this.cargarConsumoReal(this.mesaSeleccionada!.id),
      error: (err) => console.error('❌ Error al modificar cantidad:', err)
    });
  }

  // 💵 Cambiar precio
  cambiarPrecioTrago(productoId: number, precioActual: number): void {
    if (!this.mesaSeleccionada) return;
    const nuevoPrecioStr = prompt(`Digite el nuevo precio:`, precioActual.toString());
    if (nuevoPrecioStr === null || nuevoPrecioStr.trim() === '') return;
    const nuevoPrecio = parseFloat(nuevoPrecioStr);
    
    this.mesaSrv.alterarPrecioProducto(this.mesaSeleccionada.id, productoId, nuevoPrecio).subscribe({
      next: () => this.cargarConsumoReal(this.mesaSeleccionada!.id),
      error: (err) => console.error('❌ Error al cambiar precio:', err)
    });
  }

  // 🚀 Abrir comanda
  abrirComandaMesa(): void {
    if (!this.mesaSeleccionada) return;
    this.cargandoAccionMesa = true;
    this.mesaSrv.actualizarEstado(this.mesaSeleccionada.id, 'OCUPADA').subscribe({
      next: () => {
        if (this.mesaSeleccionada) {
          this.mesaSeleccionada.estado = 'OCUPADA';
          this.cargarConsumoReal(this.mesaSeleccionada.id);
        }
        this.cargandoAccionMesa = false;
      },
      error: (err) => {
        console.error('❌ Error al abrir comanda:', err);
        this.cargandoAccionMesa = false;
      }
    });
  }

  // 💳 Liberar mesa
  liberarMesa(): void {
    if (!this.mesaSeleccionada) return;
    if (confirm(`¿Cerrar cuenta Mesa #${this.mesaSeleccionada.numero_mesa}?`)) {
      this.cargandoAccionMesa = true;
      this.mesaSrv.actualizarEstado(this.mesaSeleccionada.id, 'LIBRE').subscribe({
        next: () => {
          this.mostrarModal = false;
          this.cargarMesas();
          this.cargandoAccionMesa = false;
        },
        error: (err) => {
          console.error('❌ Error al cerrar caja:', err);
          this.cargandoAccionMesa = false;
        }
      });
    }
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.mesaSeleccionada = null;
    this.mostrandoMenuBebidas = false;
  }
}