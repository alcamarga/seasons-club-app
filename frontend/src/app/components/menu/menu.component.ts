import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PizzaService } from '../../services/pizza.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { Pizza } from '../../models/pizza.model';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit {
  pizzaService = inject(PizzaService);
  auth = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  cartService = inject(CartService);

  pizzas = signal<Pizza[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  estaAutenticado = computed(() => this.auth.estaAutenticado());
  usuarioActual = this.auth.obtenerUsuarioActual();
  mensajeExito = signal<string | null>(null);
  // Estado para animar el botón pulsado
  agregandoState = signal<{ [key: string]: boolean }>({});


  ngOnInit(): void {
    this.cargarMenu();
    this.manejarIntencionCompra();
  }

  private manejarIntencionCompra(): void {
    this.route.queryParams.subscribe(params => {
      const pizzaId = params['agregar'];
      const tamanoStr = params['tamano'];
      if (pizzaId && tamanoStr && this.estaAutenticado()) {
        const pizza = this.pizzas().find(p => p.id === Number(pizzaId));
        if (pizza) {
          const cat = pizza.categoria || 'Pizza';
          let precio = 0;
          const etiquetas = this.getEtiquetasPrecio(cat);
          if (tamanoStr === etiquetas[0]) precio = pizza.precio_1 ?? 0;
          else if (tamanoStr === etiquetas[1]) precio = pizza.precio_2 || 0;
          else if (tamanoStr === etiquetas[2]) precio = pizza.precio_3 || 0;

          this.cartService.agregarAlCarrito(pizza, tamanoStr, precio);
          this.mensajeExito.set('¡Producto agregado al carrito! 🎉');
          this.router.navigate(['/menu'], { replaceUrl: true });
          setTimeout(() => this.mensajeExito.set(null), 3000);
        }
      }
    });
  }

  cargarMenu(): void {
    this.cargando.set(true);
    this.pizzaService.obtenerCatalogoPizzas().subscribe({
      next: (pizzas) => {
        // Agregamos 'pizzas &&' para asegurar que existan antes de filtrar
        if (pizzas && Array.isArray(pizzas)) {
          // El backend PostgreSQL ya no manda el campo 'activo', así que lo omitimos
          this.pizzas.set(pizzas);
        } else {
          this.pizzas.set([]); // Si no hay nada, lista vacía
        }
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        // ... resto del código de error ...
      }
    });
  }

  agregarAlCarrito(pizza: Pizza, tamanoLabel: string, precio: number): void {
    if (!this.estaAutenticado()) {
      this.router.navigate(['/login']);
      return;
    }

    const key = `${pizza.id}-${tamanoLabel}`;

    // Feedback visual en el botón
    this.agregandoState.update(prev => ({ ...prev, [key]: true }));

    // Llamada al servicio
    this.cartService.agregarAlCarrito(pizza, tamanoLabel, precio);

    // Mensaje global
    this.mensajeExito.set(`¡${pizza.nombre} (${tamanoLabel}) agregada! 🍕`);

    // Resetear estados después de 1.5 segundos
    setTimeout(() => {
      this.agregandoState.update(prev => ({ ...prev, [key]: false }));
      this.mensajeExito.set(null);
    }, 1500);
  }


  // --- NUEVAS FUNCIONES PARA EL ADMIN ---
  irAlDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  // Control del formulario de edición
  mostrarFormulario = false;
  pizzaEnEdicionId: number | null = null;
  categoriasPosibles = ['Pizza', 'Gaseosa', 'Lasaña', 'Otros'];
  nuevaPizza: any = {
    nombre: '',
    descripcion: '',
    categoria: 'Pizza',
    precio_1: 0,
    precio_2: 0,
    precio_3: 0
  };

  // Helpers Categoria
  getEtiquetasPrecio(cat: string): string[] {
    if (cat === 'Pizza') return ['Personal', 'Mediana', 'Familiar'];
    if (cat === 'Gaseosa') return ['Personal', 'Litro', 'Familiar'];
    if (cat === 'Lasaña') return ['Pequeña', 'Grande'];
    return ['Único'];
  }

  getEtiquetaPrecioForm(index: number): string {
    return this.getEtiquetasPrecio(this.nuevaPizza.categoria)[index - 1] || '';
  }

  mostrarCampoPrecioForm(index: number): boolean {
    const cat = this.nuevaPizza.categoria;
    if (cat === 'Otros') return index === 1;
    if (cat === 'Lasaña') return index <= 2;
    return true;
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) this.pizzaEnEdicionId = null;
  }

  modificarPizza(id: number): void {
    const pizza = this.pizzas().find(p => p.id === id);
    if (pizza) {
      this.pizzaEnEdicionId = pizza.id;
      this.nuevaPizza = {
        nombre: pizza.nombre,
        descripcion: pizza.descripcion,
        categoria: pizza.categoria || 'Pizza',
        precio_1: pizza.precio_1,
        precio_2: pizza.precio_2,
        precio_3: pizza.precio_3
      };
      this.mostrarFormulario = true;
    }
  }

  guardarPizza(): void {
    if (this.pizzaEnEdicionId) {
      this.pizzaService.actualizarPizza(this.pizzaEnEdicionId, this.nuevaPizza).subscribe({
        next: () => {
          this.cargarMenu();
          this.cancelarFormulario();
        },
        error: (err) => {
          console.error('Error al actualizar la pizza:', err);
          alert('No se pudo actualizar la pizza.');
        }
      });
    }
  }

  cancelarFormulario(): void {
    this.nuevaPizza = { nombre: '', descripcion: '', categoria: 'Pizza', precio_1: 0, precio_2: 0, precio_3: 0 };
    this.pizzaEnEdicionId = null;
    this.mostrarFormulario = false;
  }
}
