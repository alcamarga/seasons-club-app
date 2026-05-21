# 🌌 Seasons Club - Ecosistema POS de Gestión Interna

Ecosistema informático de punto de venta (POS) y control transaccional diseñado a medida para la operación de la discoteca **Seasons Club**. Desarrollado a partir de una arquitectura base robusta y escalable de microservicios, el sistema ha sido transformado para operar de forma 100% interna bajo un modelo de cuentas abiertas por mesas, eliminando el autoservicio público para maximizar la velocidad operativa del local.

## 🚀 Características Principales del Ecosistema

* **Control de 20 Mesas en Tiempo Real:** Mapa interactivo que refleja de manera reactiva el estado de ocupación y los subtotales acumulados en caliente.
* **Gestión por Recetas y Descuento de Barra:** Descuento inteligente de insumos. Una orden de cóctel deduce las onzas de licor correspondientes del inventario global, mientras que las botellas y bebidas directas se restan como unidades enteras.
* **Módulo de Cierre de Caja y Rentabilidad:** Panel administrativo automatizado para el cálculo de ingresos brutos de la jornada, costos de adquisición de licores y cálculo exacto de ganancias netas por día o rango de fechas.
* **Métricas de Ventas por Mesero:** Registro preciso de comisiones basado en las comandas creadas y cerradas por cada ID de empleado.

## 👥 Roles del Sistema (Uso 100% Interno)

1. **Administrador / Dueño:** Acceso total al inventario, reportes macro de rentabilidad, auditoría de cajas y analíticas de rendimiento de personal.
2. **Barman / Barra:** Vista optimizada de ticketera en tiempo real para la preparación rápida de cócteles y despacho de botellas.
3. **Mesero:** Aplicación móvil/tablet optimizada para la toma de comandas a pie de mesa, visualización del mapa del establecimiento y solicitud instantánea de precuentas.

## 🎨 Sistema de Diseño UI/UX (Deep Cosmic)

Para operar con éxito en el ambiente de una discoteca (baja iluminación, velocidad extrema, múltiples estímulos visuales), Seasons Club cuenta con un sistema de diseño optimizado para turnos nocturnos, enfocado en reducir la fatiga visual y agilizar la interacción táctil.

### 🌌 Paleta de Colores "Deep Cosmic"
* **Fondo Base (Deep Black):** `#070509` (Negro Cósmico) - Reduce drásticamente la luz emitida por las pantallas.
* **Fondo de Contenedores (Glass):** `rgba(18, 14, 24, 0.65)` - Base translúcida para el efecto cristal.
* **Acento Primario (Neon Pink):** `#ff007f` (Rosa Eléctrico) - Para llamados a la acción de alta prioridad (ej. procesar pagos).
* **Acento Secundario (Cyan):** `#00f0ff` (Cian Neón) - Filtros activos y estados de selección.
* **Textos:** `#f8fafc` (Texto principal de alto contraste) y `#94a3b8` (Texto secundario/muted).

### 🔮 Efecto Glassmorphism
Implementamos contenedores con desenfoque de fondo (`backdrop-filter: blur(16px)`) combinados con bordes ultra-delgados translúcidos. Esto crea un efecto tridimensional "esmerilado" que simula paneles de cristal flotantes iluminados por las luces de fondo del club, aportando una estética premium, moderna y llena de energía.

---

### 📦 Componente Reutilizable: `GlassPanelComponent`

Para mantener la consistencia visual en todas las vistas de la aplicación, se ha desarrollado el componente modular `<app-glass-panel>`.

#### 🔧 Importación
Al ser un componente **standalone**, impórtalo directamente en el módulo o componente que lo requiera:

```typescript
import { GlassPanelComponent } from './components/glass-panel/glass-panel.component';

@Component({
  standalone: true,
  imports: [GlassPanelComponent, ...],
  // ...
})
export class MiComponente {}
```

#### 💻 Uso en Plantillas (HTML)

**1. Contenedor Estático Simple:**
```html
<app-glass-panel class="p-4">
  <h3>Título del Panel</h3>
  <p>Contenido estático aquí...</p>
</app-glass-panel>
```

**2. Panel Interactivo con Efecto de Enfoque (Hover/Active):**
Al activar `[interactive]="true"`, el panel responderá visualmente al cursor o toques de pantalla flotando levemente, iluminando sus bordes en magenta y aplicando un brillo interno neón. Ideal para botones, mesas del mapa táctil y productos seleccionables.
```html
<app-glass-panel [interactive]="true" class="p-6 cursor-pointer">
  <h4>🍸 Margarita Cocktail</h4>
  <span>$12,000 COP</span>
</app-glass-panel>
```

---

## 🛠️ Stack Tecnológico

El ecosistema transaccional de Seasons Club está construido con tecnologías modernas que garantizan un rendimiento óptimo y estabilidad operativa:

* **Frontend (Angular 18+):**
  * Arquitectura reactiva basada en **Standalone Components** y control de estados optimizado.
  * **CSS Moderno & Custom Properties:** Sistema de diseño centralizado en `:root` con variables CSS para fácil mantenimiento de paletas, sombras y transiciones.
  * **Diseño Responsivo Táctil:** Interfaces adaptadas con grids flexibles y botones sobredimensionados para operaciones rápidas en tablets y pantallas POS fijas del personal de barra.
* **Backend:** Flask (Python) con arquitectura RESTful estructurada.
* **Base de Datos:** PostgreSQL para persistencia transaccional e histórica robusta.
* **Infraestructura:** Docker y despliegue continuo automatizado.