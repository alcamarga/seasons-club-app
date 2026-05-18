import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { PizzaService } from '../../services/pizza.service';
import { Pizza } from '../../models/pizza.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  // Inyecciones públicas para que el HTML pueda acceder a ellas sin errores TS2341
  public readonly auth = inject(AuthService);
  public readonly router = inject(Router);
  private readonly pizzaService = inject(PizzaService);

  // Variables de estado
  listaPizzas = signal<Pizza[]>([]);
  
  cargandoInventario = true;
  errorInventario: string | null = null;

  ngOnInit(): void {
    // 1. Verificación de seguridad inmediata
    if (!this.auth.estaAutenticado()) {
      this.router.navigate(['/login']);
      return;
    }

    // 2. Cargar el inventario de pizzas
    this.cargarInventario();
  }

  // Carga el catálogo de pizzas (Inventario)
  private cargarInventario(): void {
    this.cargandoInventario = true;
    this.pizzaService.obtenerCatalogoPizzas().subscribe({
      next: (pizzas: Pizza[]) => {
        this.listaPizzas.set(pizzas);
        this.cargandoInventario = false;
      },
      error: (err) => {
        if (err.status === 401 || err.status === 403) {
          console.error('[AUTH ERROR] Sesión inválida al cargar inventario:', err);
        } else {
          console.error('Error al cargar inventario:', err);
        }
        this.errorInventario = 'Error al cargar el inventario. Inténtalo de nuevo.';
        this.cargandoInventario = false;
      }
    });
  }

  // Función para volver al menú público
  volverAlMenu(): void {
    this.router.navigate(['/menu']);
  }

  // --- FORMULARIO NUEVA PIZZA ---
  mostrarFormulario = false;
  categoriasPosibles = ['Pizza', 'Gaseosa', 'Lasaña', 'Otros'];
  nuevaPizza: any = { nombre: '', descripcion: '', categoria: 'Pizza', precio_1: 0, precio_2: 0, precio_3: 0 };

  // Retorna las etiquetas dinámicas según categoría
  getEtiquetaPrecio(index: number): string {
    const cat = this.nuevaPizza.categoria;
    if (cat === 'Pizza') return ['Personal', 'Mediana', 'Familiar'][index - 1];
    if (cat === 'Gaseosa') return ['Personal', 'Litro', 'Familiar'][index - 1];
    if (cat === 'Lasaña') return ['Pequeña', 'Grande'][index - 1];
    return 'Único';
  }

  // Define visualmente si ocultamos el campo
  mostrarCampoPrecio(index: number): boolean {
    const cat = this.nuevaPizza.categoria;
    if (cat === 'Otros') return index === 1; // Solo 1 precio libre
    if (cat === 'Lasaña') return index <= 2; // Solo pequeña y grande
    return true; // Pizza y Gaseosa usan 3
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  guardarPizza(): void {
    if(!this.nuevaPizza.nombre) {
      alert("El nombre de la pizza es obligatorio");
      return;
    }
    this.pizzaService.crearPizza(this.nuevaPizza).subscribe({
      next: (res) => {
        this.cargarInventario();
        this.cancelarFormulario();
      },
      error: (err) => {
        console.error('Error al guardar pizza', err);
        alert('Error al guardar la pizza.');
      }
    });
  }

  cancelarFormulario(): void {
    this.nuevaPizza = { nombre: '', descripcion: '', categoria: 'Pizza', precio_1: 0, precio_2: 0, precio_3: 0 };
    this.mostrarFormulario = false;
  }

  // Eliminar pizza físicamente | Delete pizza physically
  eliminarPizza(id: number): void {
    if (confirm('¿Realmente deseas eliminar esta pizza de la base de datos?')) {
      this.pizzaService.eliminarPizza(id).subscribe({
        next: () => {
          // Refresco automático usando el Signal | Auto-refresh using Signal
          this.listaPizzas.update(actuales => actuales.filter(p => p.id !== id));
        },
        error: (err) => {
          console.error('Error al eliminar pizza:', err);
          alert('Hubo un error al eliminar la pizza.');
        }
      });
    }
  }

  // Función para cerrar sesión con redirección limpia y refresco forzado
  cerrarSesion(): void {
    this.auth.cerrarSesion();
  }
}
