# Seasons Club — Sistema POS de Gestión Interna

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

Sistema de punto de venta (POS) diseñado para la operación interna de **Seasons Club**, una discoteca con modelo de cuentas abiertas por mesa. Permite gestionar comandas, facturación con desglose de IVA, cierre de caja por jornada operativa e historial detallado de ventas.

> Proyecto full-stack orientado a entornos de alta rotación nocturna: interfaces táctiles, bajo brillo y flujos rápidos para personal de barra y caja.

---

## Tabla de contenidos

- [Descripción del proyecto](#descripción-del-proyecto)
- [Capturas de pantalla](#capturas-de-pantalla)
- [Funcionalidades principales](#funcionalidades-principales)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Cierre de caja y jornada operativa](#cierre-de-caja-y-jornada-operativa)
- [API REST relevante](#api-rest-relevante)
- [Instalación](#instalación)
- [Uso](#uso)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Diseño UI/UX](#diseño-uiux)
- [Autor](#autor)

---

## Descripción del proyecto

Seasons Club reemplaza flujos de autoservicio público por un **POS interno** centrado en mesas. El personal abre comandas, agrega productos del catálogo de barra, cobra con factura impresa y consulta reportes de caja al cierre de turno.

El sistema combina:

- **Frontend Angular 21** con guards de rol (`authGuard`, `adminGuard`), rutas modulares y sincronización de comandas en tiempo real (polling cada 3 s).
- **Backend Flask 3** con SQLAlchemy y PostgreSQL para pedidos, ventas, cortes de caja, historial e inventario.
- **Autenticación JWT** con contraseñas **bcrypt** y roles **Admin** / **Mesero**.
- **Jornada operativa** definida por cortes manuales de caja (no por medianoche), ideal para locales que operan después de las 00:00.

---

## Capturas de pantalla

> Sustituye los placeholders por tus capturas reales en `docs/screenshots/`.

| Vista | Descripción | Archivo sugerido |
|-------|-------------|------------------|
| Mapa de mesas | Grid táctil con estados LIBRE / OCUPADA | `docs/screenshots/01-mapa-mesas.png` |
| Modal de comanda | Cuenta acumulada, catálogo y cobro | `docs/screenshots/02-modal-comanda.png` |
| Ticket de factura | Impresión con subtotal, IVA 19% y total | `docs/screenshots/03-ticket-factura.png` |
| Historial de ventas | Tabla filtrable por mesa con detalle de ítems | `docs/screenshots/04-historial-ventas.png` |
| Cierre de caja | Totales de jornada y botón Cerrar Caja | `docs/screenshots/05-cierre-caja.png` |
| Inventario | Catálogo y gestión de productos | `docs/screenshots/06-inventario.png` |

```markdown
<!-- Ejemplo para insertar en GitHub -->
![Mapa de mesas](docs/screenshots/01-mapa-mesas.png)
![Historial de ventas](docs/screenshots/04-historial-ventas.png)
```

---

## Funcionalidades principales

| Módulo | Descripción |
|--------|-------------|
| **Mesas (20 unidades)** | Mapa interactivo, apertura de comanda, consumo y liberación de mesa |
| **Facturación** | Registro en BD, ticket con IVA desglosado (subtotal = total ÷ 1.19) |
| **Historial de ventas** | Registro por factura con mesa, artículos, subtotal, IVA y método de pago |
| **Cierre de caja** | Reporte de jornada actual con totales por efectivo y transferencia |
| **Corte de jornada** | Marca en BD el fin de turno; las ventas siguientes inician contador en cero |
| **Inventario** | Catálogo de productos (solo admin) |
| **Control de usuarios** | CRUD de personal con roles `admin` y `mesero` (solo admin) |
| **Autenticación** | Login JWT; sesión en `AuthService` + interceptor HTTP |
| **Roles** | Admin: panel completo; Mesero: solo mapa de mesas |
| **Impresión** | Ticket de factura; reportes de historial de ventas y cierre de caja (`window.print`) |
| **Tiempo real (mesas)** | Polling 3 s de cuenta abierta mientras el modal está activo |

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Angular 21, TypeScript, RxJS, Standalone Components |
| Backend | Flask 3, Flask-SQLAlchemy, Flask-CORS |
| Base de datos | PostgreSQL |
| Estilos | SCSS, CSS Custom Properties, Bootstrap 5 |
| Servidor API | Gunicorn (producción) / Flask dev server (local) |

---

## Arquitectura

### Vista general

```mermaid
flowchart TB
    subgraph Frontend["Frontend — Angular 21"]
        Login[Login + JWT]
        Guards[authGuard / adminGuard]
        MC[MesasComponent\npolling 3s]
        CC[CierreCajaComponent]
        HV[HistorialVentasComponent]
        INV[Inventario + Usuarios]
        MS[MesaService]
        Login --> Guards
        Guards --> MC
        Guards --> CC
        Guards --> HV
        Guards --> INV
        MC --> MS
        CC --> MS
        HV --> MS
    end

    subgraph Backend["Backend — Flask"]
        Auth[auth.py JWT+bcrypt]
        MR[mesa_routes.py]
        Admin[admin_routes.py]
        RS[reporte_service.py]
        Auth --> DB[(PostgreSQL)]
        MR --> RS
        MR --> DB
        Admin --> DB
    end

    MS -->|HTTP REST + Bearer| MR
    MS --> Auth
```

### Backend (Flask)

Organización por capas:

```
backend/
├── app.py                 # Factory, blueprints, seed
├── config.py              # DATABASE_URL, SECRET_KEY
├── models/                # SQLAlchemy ORM
│   ├── mesa.py
│   ├── pedido.py
│   ├── venta.py
│   ├── corte_caja.py      # Cortes de jornada
│   └── historial_ventas.py
├── routes/
│   ├── mesa_routes.py     # Mesas, facturas, reportes, historial
│   ├── auth_routes.py
│   ├── producto_routes.py
│   └── admin_routes.py
└── services/
    └── reporte_service.py   # Lógica de jornada y agregaciones SQL
```

**Modelos clave de ventas y caja:**

| Modelo | Tabla | Rol |
|--------|-------|-----|
| `Venta` | `venta` | Total facturado por mesa y método de pago |
| `CorteCaja` | `corte_caja` | Snapshot al cerrar caja; marca inicio de nueva jornada |
| `HistorialVentas` | `historial_ventas` | Detalle de cada factura (artículos, IVA, mesa) |
| `Pedido` | `pedido` | Comanda activa en servidor (estado pendiente / facturado) |

### Frontend (Angular)

```
frontend/src/app/
├── components/
│   ├── mesas/              # Mapa POS, polling, factura
│   ├── cierre-caja/        # Jornada + historial de cierres + impresión
│   ├── historial-ventas/   # Ventas + impresión
│   ├── inventario/         # Solo admin
│   ├── usuarios/           # CRUD personal — solo admin
│   └── factura-print/
├── guards/
│   ├── auth.guard.ts
│   └── admin.guard.ts
├── services/
│   ├── mesa.service.ts     # Mesas, consumo, reportes
│   ├── auth.service.ts
│   └── inventario.service.ts
├── interceptors/auth.interceptor.ts
└── app.routes.ts
```

**Comandas:** el consumo activo vive en PostgreSQL (`pedido` pendiente). El frontend sincroniza con `GET /api/mesas/:id/consumo` (polling) y muta con `POST .../agregar`, `.../cantidad`, `.../precio`. `localStorage` actúa solo como respaldo offline.

---

## Cierre de caja y jornada operativa

La jornada **no se reinicia a medianoche**. Se define por el último registro en `corte_caja`. Esto permite que un turno que cruza las 00:00 siga siendo una sola jornada hasta que el encargado cierre caja.

### Flujo operativo

```mermaid
sequenceDiagram
    participant U as Usuario (caja)
    participant F as Frontend
    participant API as Flask API
    participant DB as PostgreSQL

    Note over U,DB: Durante el turno
    U->>F: Cobrar mesa (Efectivo / Transferencia)
    F->>API: POST /api/facturas
    API->>DB: INSERT venta + historial_ventas

    Note over U,DB: Consulta de jornada
    U->>F: Ver Cierre de Caja
    F->>API: GET /api/reporte/diario
    API->>DB: SUM ventas WHERE fecha > ultimo_corte

    Note over U,DB: Fin de turno
    U->>F: Cerrar Caja
    F->>API: POST /api/reporte/cierre
    API->>DB: INSERT corte_caja
    F->>API: GET /api/reporte/diario
    API-->>F: total = 0 (sin ventas nuevas)
```

### Pasos resumidos

1. **Facturar** — Cada cobro crea una `Venta` y un `HistorialVentas` con desglose de IVA.
2. **Consultar reporte** — `GET /api/reporte/diario` suma solo ventas con `fecha` posterior al último `CorteCaja`.
3. **Cerrar caja** — `POST /api/reporte/cierre` guarda totales y marca el fin de jornada.
4. **Nueva jornada** — Las ventas posteriores al corte cuentan desde cero hasta el siguiente cierre.

### Desglose de IVA en ticket

| Concepto | Fórmula |
|----------|---------|
| Subtotal | `total ÷ 1.19` |
| IVA (19%) | `total − subtotal` |
| Total | Monto cobrado (IVA incluido) |

---

## API REST relevante

Base URL local: `http://localhost:5000/api` (ver `frontend/src/environments/environment.ts`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/login` | Autenticación JWT |
| `GET` | `/mesas` | Lista de mesas y estados |
| `PATCH` | `/mesas/:id/estado` | Abrir comanda o liberar mesa |
| `GET` | `/mesas/:id/consumo` | Cuenta abierta (polling) |
| `POST` | `/mesas/:id/agregar` | Agregar producto a comanda |
| `POST` | `/mesas/:id/cantidad` | Sumar/restar cantidad |
| `POST` | `/mesas/:id/precio` | Cambiar precio en línea |
| `POST` | `/facturas` | Facturar, venta e historial |
| `GET` | `/reporte/diario` | Totales de la jornada actual |
| `POST` | `/reporte/cierre` | Registrar corte de caja |
| `GET` | `/reporte/cierres` | Historial de cierres previos |
| `GET` | `/historial-ventas?mesa_id=` | Historial de ventas |
| `GET/POST` | `/usuarios` | Gestión de usuarios (admin) |
| `GET` | `/productos` | Catálogo / inventario |

---

## Instalación

### Requisitos previos

- Node.js 20+ y npm
- Python 3.12+
- PostgreSQL 14+ en ejecución (base `seasons_club_db`)

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/seasons-club-app.git
cd seasons-club-app
```

### 2. Backend (entorno virtual `.venv`)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Linux / macOS / WSL
# .venv\Scripts\activate           # Windows PowerShell / CMD
pip install -r requirements.txt
```

Configura PostgreSQL si no usas el valor por defecto de `backend/config.py`:

```bash
export DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/seasons_club_db"
```

Arranca el API (crea tablas y usuarios demo al iniciar):

```bash
python app.py
```

API en: `http://localhost:5000` — prefijo REST: `/api`

Datos demo adicionales (mesas/productos):

```bash
curl http://localhost:5000/api/seed
```

### 3. Frontend (desarrollo)

```bash
cd frontend
npm install
npm start
```

App en: `http://localhost:4200` (el proxy de `ng serve` reenvía `/api` al backend según `proxy.conf.json`).

Configuración de API: `frontend/src/environments/environment.ts` (`apiUrl`, `serverUrl`).

### 4. Frontend (compilación para producción)

```bash
cd frontend
npm run build
```

Salida en `frontend/dist/frontend/`. Sirve esos archivos con Nginx u otro estático; el `nginx.conf` del repo incluye proxy hacia el API Flask.

---

## Uso

### Inicio de sesión y roles

| Rol | Usuario demo | Contraseña | Qué ve |
|-----|--------------|------------|--------|
| **Admin** | `admin@seasonsclub.com` | `admin1` | Mesas + menú lateral (Inventario, Historial, Cierre, Usuarios) |
| **Mesero** | `mesero@seasonsclub.com` | `mesero1` | Solo mapa de mesas (sin menú admin) |

Tras el login, el sistema redirige a `/mesas`. Las rutas administrativas rechazan acceso a meseros (redirección a mesas).

### Operación diaria — mesero o admin

1. Inicia sesión y abre una **mesa libre** → **Abrir comanda**.
2. Agrega productos del catálogo; la cuenta se actualiza en servidor y se refresca cada **3 segundos** con el modal abierto.
3. Cobra con **Efectivo** o **Transferencia** → ticket con subtotal, IVA 19% y total.

### Operación diaria — solo admin

4. **Historial de ventas** — consulta, filtro por mesa, botón **Imprimir** (reporte limpio sin sidebar).
5. **Cierre de caja** — jornada actual, historial de cierres previos, **Imprimir jornada** o **Imprimir historial de cierres**, y **Cerrar caja** al fin del turno.
6. **Inventario** y **Control de usuarios** — catálogo y alta de meseros/admins desde el menú lateral.

### Impresión

- **Factura:** ventana emergente al cobrar (formato ticket).
- **Reportes admin:** `window.print()` con estilos `@media print`; solo tablas y totales visibles (header, botones y sidebar ocultos).

### Fin de jornada

Tras **Cerrar caja**, el reporte diario vuelve a **$0** hasta registrar nuevas ventas.

---

## Estructura del repositorio

```
seasons-club-app/
├── backend/           # API Flask + modelos
├── frontend/          # SPA Angular
├── docs/
│   └── screenshots/   # Capturas para README (añadir aquí)
├── README.md
├── project_memory.md       # Memoria técnica (estado estable)
└── agents-hub/
    └── project_memory.json # Memoria para agentes / orquestación
```

---

## Diseño UI/UX

Sistema **Deep Cosmic** optimizado para ambientes con poca luz:

| Token | Valor | Uso |
|-------|-------|-----|
| Fondo base | `#070509` | Reducir fatiga visual |
| Acento primario | `#ff007f` | Acciones críticas (cobro) |
| Acento secundario | `#00f0ff` | Selección y filtros |
| Glass panels | `backdrop-filter: blur(16px)` | Contenedores flotantes |

Componente reutilizable: `<app-glass-panel [interactive]="true">` para tarjetas y botones táctiles.

---

## Autor

**Camilo Martinez Galarza** — Desarrollo full-stack (Angular + Flask)

---

## Licencia

Proyecto privado / portafolio. Consultar al autor antes de uso comercial o redistribución.
