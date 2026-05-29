# Fase C — Backend: Separación de cuentas y facturación por subcuenta

**Proyecto:** Seasons Club App  
**Autor:** Camilo Martinez Galarza  
**Estado:** Validado en integración (Postman) — C.1 y C.2  
**Base previa:** Fase A (`pedido_linea`, `pedido.tipo`, `pedido_padre_id`) + Fase B (grupos de mesas)

---

## 1. Resumen de arquitectura

| Concepto | Implementación |
|----------|----------------|
| Fuente de verdad de ítems | Tabla `pedido_linea` (UUID por línea) |
| Cuenta abierta de mesa | Pedido `individual` o `maestra` (`pendiente`) |
| División de pago | Pedidos `subcuenta` con `pedido_padre_id` |
| Integridad tras mutaciones | `persistir_cambios_comanda()` en `comanda_service` |
| Lógica de separación | `services/subcuenta_service.py` |
| Lógica de unión de mesas | `services/grupo_mesa_service.py` (Fase B) |

```text
Mesa OCUPADA
    └── Pedido padre (individual | maestra) — líneas activas
            ├── Pedido subcuenta 1 (etiqueta, pedido_padre_id)
            └── Pedido subcuenta 2 ...
```

---

## 2. Endpoints

Prefijo API: `/api`

### 2.1 GET `/mesas/:id/consumo`

Consulta la comanda activa de la mesa (padre) y metadatos de grupo/subcuentas.

**Respuesta relevante (Fase C):**

```json
{
  "mesa_id": 3,
  "tiene_consumo": true,
  "pedido": {
    "id": 88,
    "tipo": "individual",
    "total": 30000,
    "articulos": [
      {
        "linea_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "producto_id": 4,
        "nombre": "Cerveza Club Colombia Dorada",
        "precio": 10000,
        "cantidad": 3,
        "mesa_origen_id": 3,
        "mesa_origen_numero": 3
      }
    ]
  },
  "subcuentas": [
    {
      "id": 91,
      "etiqueta": "Invitado 1",
      "tipo": "subcuenta",
      "pedido_padre_id": 88,
      "total": 20000,
      "articulos": [...]
    }
  ],
  "tiene_subcuentas": true,
  "total_pendiente_mesa": 50000,
  "grupo_mesa_id": null,
  "es_grupo_activo": false
}
```

| Campo | Descripción |
|-------|-------------|
| `pedido` | Comanda principal (`individual` o `maestra`) |
| `subcuentas[]` | Subcuentas `pendiente` hijas del padre |
| `total_pendiente_mesa` | Suma del total del padre + subcuentas pendientes |

---

### 2.2 POST `/mesas/:id/separar` — Fase C.1

Crea una subcuenta y mueve líneas desde el pedido padre.

**Body:**

```json
{
  "etiqueta": "Invitado 1",
  "lineas": [
    { "linea_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "cantidad": 2 },
    { "linea_id": "otro-uuid-sin-cantidad" }
  ]
}
```

| Campo | Reglas |
|-------|--------|
| `etiqueta` | Obligatoria, máx. 100 caracteres |
| `linea_id` | UUID de `pedido_linea`; debe pertenecer al padre y estar `activa` |
| `cantidad` | Opcional; si se omite, mueve la línea completa. Si es menor que la cantidad de la línea, se hace **split** (nueva fila en subcuenta, resto en padre) |

**Respuesta 201:**

```json
{
  "status": "success",
  "message": "Subcuenta creada correctamente",
  "subcuenta": { "id": 91, "etiqueta": "Invitado 1", "tipo": "subcuenta", ... },
  "pedido_padre": { "id": 88, "total": 30000, ... },
  "lineas_movidas": 1,
  "subcuentas": [...],
  "tiene_subcuentas": true,
  "total_pendiente_mesa": 50000
}
```

**Errores frecuentes:** 400 (mesa no OCUPADA, cantidad inválida), 404 (sin comanda / línea inexistente), 409 (línea no pertenece al padre).

**Servicio:** `subcuenta_service.validar_separacion()` → `crear_subcuenta()`.

---

### 2.3 POST `/facturas` — Fase C.2

Registra venta, historial e IVA 19%. Cierra el pedido facturado.

**Body:**

```json
{
  "mesa_id": 3,
  "metodo_pago": "Efectivo",
  "pedido_id": 91
}
```

| Escenario | `pedido_id` | Comportamiento |
|-----------|-------------|----------------|
| Cuenta principal | Omitido o `null` | Factura el pedido padre resuelto por `obtener_pedido_pendiente(mesa_id)` |
| Subcuenta | ID del pedido `subcuenta` | Factura solo esa subcuenta; validar que pertenezca a la mesa y esté `pendiente` |

**Cierre de mesa:**

- Tras facturar una **subcuenta**, la mesa permanece **`OCUPADA`** si el padre u otras subcuentas siguen con saldo pendiente.
- La mesa pasa a **`LIBRE`** solo cuando:
  - El pedido padre no tiene líneas activas pendientes (o está facturado sin saldo), **y**
  - No quedan subcuentas en estado `pendiente`, **y**
  - Si aplica grupo de mesas (Fase B), se ejecuta `cerrar_grupo_activo()` al cerrar la última cuenta del grupo.

**Respuesta 201:**

```json
{
  "status": "success",
  "message": "Factura guardada y venta registrada",
  "venta_id": 120,
  "historial_id": 85,
  "pedido_facturado_id": 91,
  "mesa_estado": "OCUPADA"
}
```

*(Los campos extra `pedido_facturado_id` / `mesa_estado` son recomendados para el frontend C.3; incluirlos si están en tu rama local.)*

---

## 3. Archivos del backend

| Archivo | Responsabilidad |
|---------|-----------------|
| `services/subcuenta_service.py` | Validación y creación de subcuentas; metadatos para GET consumo |
| `services/comanda_service.py` | Consumo, mutaciones de líneas, `persistir_cambios_comanda` |
| `services/grupo_mesa_service.py` | Unión de mesas y cierre de grupo al facturar |
| `routes/mesa_routes.py` | `POST /mesas/:id/separar`, `POST /facturas`, `GET /consumo` |
| `models/pedido.py` | `TIPO_SUBCUENTA`, `pedido_padre_id`, `etiqueta` |
| `models/pedido_linea.py` | `linea_id` (UUID), `mesa_origen_*` |

---

## 4. Flujo de prueba Postman (smoke)

1. `PATCH /api/mesas/3/estado` → `{ "estado": "OCUPADA" }`
2. `POST /api/mesas/3/agregar` → productos con consumo
3. `GET /api/mesas/3/consumo` → copiar `linea_id` del padre
4. `POST /api/mesas/3/separar` → etiqueta + líneas
5. `GET /api/mesas/3/consumo` → verificar `subcuentas[]` y `total_pendiente_mesa`
6. `POST /api/facturas` → `{ "mesa_id": 3, "pedido_id": <subcuenta>, "metodo_pago": "Efectivo" }`
7. `GET /api/mesas/3/consumo` → subcuenta facturada ya no aparece en `subcuentas[]`

---

## 5. Próximo paso: Fase C.3 (Frontend)

- Tabs en modal: **Cuenta principal** + una pestaña por subcuenta.
- Modo **Dividir**: selección por `linea_id` → `POST /separar`.
- **Pagar** en pestaña activa: `POST /facturas` con o sin `pedido_id`.
- Mostrar `total_pendiente_mesa` en el encabezado del modal.

---

## 6. Referencias

- DDL Fase A: `backend/migrations/fase_a_grupos_y_lineas.sql`
- Unión de mesas: `docs/` (Fase B — ver `grupo_mesa_service` y `POST /mesas/unir`)
- Memoria del proyecto: `agents-hub/project_memory.json`
