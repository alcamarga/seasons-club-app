---
## 📜 Control de Calidad y Autoría
- **Lead Developer:** Camilo
- **Asistente de Arquitectura:** Gemini/Cami
- **Última Revisión:** 10 de abril de 2026
- **Estado:** Estructura técnica inicial

> "Este estándar es la ley en la Pizzería Core. Cualquier desviación debe ser consultada con Camilo."
---


# 🛠️ Reglas de Operación en el Sistema (WSL Ubuntu)

Este archivo guía a Milo sobre cómo interactuar con mi computadora.

## 1. Gestión de Entorno (Python)
- Siempre verifica que el entorno virtual `.venv` esté activo antes de sugerir instalar librerías.
- Si el entorno no está activo, el comando para activarlo es: `source backend/.venv/bin/activate`.

## 2. Permisos y Ejecución
- Como estamos en Ubuntu, si un comando de instalación falla, intenta sugerir el uso de `sudo`.
- No modifiques archivos dentro de la carpeta `.venv` directamente.

## 3. Resolución de conflictos (puertos)

Política única para **Flask (5000)** y **Angular / `ng serve` (4200)** cuando aparezca *address already in use* o el servidor no arranca.

1. **Diagnóstico (recomendado primero)**  
   Identificar qué proceso usa el puerto:
   ```bash
   sudo lsof -i :5000
   sudo lsof -i :4200
   ```
   Con el PID, se puede terminar con `kill <PID>` (o `kill -9` solo si hace falta).

2. **Liberación rápida en Linux/WSL**  
   Si hay procesos huérfanos tras cerrar terminales y quieres vaciar el puerto de una vez:
   ```bash
   fuser -k 5000/tcp
   fuser -k 4200/tcp
   ```
   **Precaución:** `fuser -k` envía señal de terminación a *todos* los procesos enlazados a ese puerto; no lo uses si otro servicio legítimo lo está usando.

- El `frontend/README.md` (documentación técnica del frontend) **remite a esta sección** para los comandos de puertos, evitando duplicar la política en dos sitios.

## 4. Automatización de Documentación
- Cada vez que terminemos una funcionalidad importante, recuérdame actualizar mi tablero en Notion.

## 5. Política de idiomas en código — comentarios espejo (dual language)

Todo **comentario dentro del código** debe usar el formato **español primero, inglés después**, separados por ` | ` (espacio, barra vertical, espacio).

### Formato
- **TypeScript / JavaScript:** `// [Español] | [English]`
- **Python:** `# [Español] | [English]` (misma regla; el símbolo de comentario es `#`).
- **HTML (plantillas):** `<!-- [Español] | [English] -->` cuando el comentario sea necesario en el markup.
- **CSS / SCSS:** `/* [Español] | [English] */`

### Ejemplo (TypeScript)
```typescript
// Obtener la lista de pedidos desde el servidor | Get the order list from the server
this.http.get(url)...
```

### Alcance
- Aplica a **comentarios de línea o bloque** que expliquen la intención del código.
- **Docstrings** de Python: si el estándar del backend pide docstring, puede usarse una sola línea inicial con el mismo patrón `Español | English`, o el cuerpo bilingüe acordado con el Lead Developer; lo obligatorio para comentarios inline es el formato espejo anterior.

Esta política es **obligatoria** en `frontend/` y `backend/` salvo que Camilo indique una excepción puntual.