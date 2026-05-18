> **Creado por:** Camilo Martinez
> **Fecha:** 11 de abril de 2026
> **Estado:** Estándar de Backend Validado

# 🐍 Estándar de Desarrollo Backend (Python)

Este archivo guía a Milo sobre cómo construir la lógica y las APIs de la Pizzería Core.

## 1. Framework y Estructura
- **Framework:** FastAPI (o Flask, según lo definido).
- **Entorno:** Siempre verificar que el entorno virtual (`.venv`) esté activo antes de sugerir instalaciones.
- **CORS:** Es obligatorio configurar los Middlewares de CORS para permitir peticiones desde `http://localhost:4200`.

## 2. Base de Datos y Modelos
- **Tipado:** Usar `Pydantic` para los esquemas de validación de datos.
- **Modelos:** Mantener una estructura clara entre los modelos de la base de datos y los objetos que se envían al Frontend.

## 3. Manejo de Puertos
- **Puerto Default:** 5000 o 8000 (según configuración actual).
- **Liberación de Puertos:** Si el puerto está ocupado, sugerir el comando `fuser -k [PUERTO]/tcp`.

## 4. Documentación y Respuestas
- **Comentarios inline:** Usar el formato espejo definido en `instrucciones-sistema.md` (sección **5**): `# Español | English`.
- **Docstrings:** Todas las funciones deben documentarse; la primera línea (o resumen) puede seguir el patrón bilingüe `Español | English` alineado con esa política.
- **Logs:** Incluir prints o logs informativos para saber qué está procesando el servidor (ej: "Pedido recibido: ID #123"). Los mensajes de log pueden ir solo en español si son operativos; los **comentarios en código** siguen siempre el espejo.

---
**Lead Developer:** Camilo
*"Lógica sólida, entregas rápidas. 🐍🍕"*