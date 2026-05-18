# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.6.

## Documentación técnica (entorno de desarrollo)

Notas sobre ajustes aplicados al frontend en Ubuntu/WSL y compatibilidad con Angular 21.

### Zone.js

La versión de Angular del proyecto requiere la inclusión explícita de **zone.js**. Se añadió la dependencia con:

```bash
npm install zone.js
```

En **`angular.json`**, dentro de `projects.frontend.architect.build.options`, se configuró el arreglo **`polyfills`** para cargar el paquete:

```json
"polyfills": [
  "zone.js"
]
```

### Sintaxis `@for` y plantillas HTML

En **`src/app/app.html`** se corrigió el uso del nuevo flujo de control **`@for`** de Angular, cerrando correctamente las etiquetas de tabla (**`<tbody>`**, **`<tr>`**, **`<td>`**). Un cierre incorrecto provoca errores de compilación del template; conviene validar que cada bloque `@for { ... }` envuelva filas/celdas de forma coherente con el DOM esperado.

### Bootstrap de la aplicación (`provideZoneChangeDetection`)

En **`src/app/app.config.ts`** se actualizó la configuración de la aplicación para incluir **`provideZoneChangeDetection`**, por ejemplo con coalescing de eventos:

```typescript
provideZoneChangeDetection({ eventCoalescing: true })
```

Se verificó el punto de entrada **`src/main.ts`** para que el componente raíz se arranque con `bootstrapApplication` y la configuración anterior quede aplicada.

### Gestión de puertos (4200 y 5000)

La política unificada —diagnóstico con `sudo lsof -i :[PUERTO]`, liberación opcional con `fuser -k …/tcp` y advertencias— está en **`.cursor-rules/instrucciones-sistema.md`** (sección **3. Resolución de conflictos (puertos)**). Aplica al dev server de Angular (**4200**) y al backend Flask (**5000**).

---

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
