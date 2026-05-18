---
## 📜 Control de Calidad y Autoría
- **Lead Developer:** Camilo
- **Asistente de Arquitectura:** Gemini/Cami
- **Última Revisión:** Abril 2026
- **Estado:** Validado y en Producción.

> "Este estándar es la ley en la Pizzería Core. Cualquier desviación debe ser consultada con Camilo."
---
# 🎨 Estándar de Desarrollo Frontend (Angular)

Este archivo guía a Milo sobre cómo escribir código en el proyecto de la Pizzería.

## 1. Arquitectura Angular (v18+)
- **Standalone Components:** No usar `NgModules`. Todo componente debe ser `standalone: true`.
- **Flujo de Control Moderno:** Usar siempre la sintaxis de @-rules:
  - `@for (item of list; track item.id) { ... }` en lugar de `*ngFor`.
  - `@if (condition) { ... }` en lugar de `*ngIf`.

## 2. Configuración Crítica del Sistema
- **Zone.js:** Recordar que el proyecto requiere Zone.js. Si se crea un nuevo entorno o falla el renderizado, verificar que `zone.js` esté en `polyfills` dentro de `angular.json`.
- **Detección de Cambios:** Preferir `provideZoneChangeDetection({ eventCoalescing: true })` en `app.config.ts`.

## 3. Estilo y UI
- **Framework:** Usar **Bootstrap 5** para todas las clases de CSS.
- **Estructura HTML:** Mantener la semántica (usar `<thead>`, `<tbody>`, `<th>` para tablas) para evitar errores de hidratación.
- **Diseño:** Mantener el esquema de colores de la "Pizzería Core" (Rojos, Naranjas y Blancos limpios).

## 4. Tipado y Modelos
- **Interfaces:** Antes de crear un servicio, definir una `interface` para los datos (ej. `Pedido`, `Usuario`).
- **Strict Mode:** Evitar el uso de `any`. Si no conocemos el tipo, investigar o usar una interfaz temporal.

## 4.1 Comentarios en código (idioma)
- Seguir la política **comentarios espejo** de `instrucciones-sistema.md` (sección **5**): `// Español | English` en TS, `<!-- … | … -->` en plantillas cuando aplique.

## 5. Limpieza de Errores (Troubleshooting)
Si Angular se queda "pegado" o no muestra cambios:
1. Sugerir: `rm -rf .angular/cache`
2. Sugerir: `fuser -k 4200/tcp`
3. Reiniciar con: `ng serve --host 0.0.0.0`