-- =============================================================================
-- Fase A: Grupos de mesas + líneas de pedido (PedidoLinea)
-- Base de datos: seasons_club_db
-- Ejecutar: psql -U postgres -d seasons_club_db -f backend/migrations/fase_a_grupos_y_lineas.sql
--
-- Orden:
--   1. Este script (DDL)
--   2. migrate_pendientes_a_lineas.py (solo pedidos estado = 'pendiente')
--   3. Deploy backend Fase A
-- =============================================================================

-- Extensión para UUID (gen_random_uuid) — en PG 13+ suele existir sin instalar nada extra.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. grupo_mesa — cuenta consolidada (unión de mesas)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grupo_mesa (
    id                  SERIAL PRIMARY KEY,
    mesa_anfitriona_id  INTEGER NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'activo',
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Bogota'),
    closed_at           TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT grupo_mesa_estado_chk
        CHECK (estado IN ('activo', 'cerrado')),
    CONSTRAINT grupo_mesa_mesa_anfitriona_fkey
        FOREIGN KEY (mesa_anfitriona_id) REFERENCES public.mesas(id)
);

CREATE INDEX IF NOT EXISTS idx_grupo_mesa_estado
    ON public.grupo_mesa (estado);

CREATE INDEX IF NOT EXISTS idx_grupo_mesa_anfitriona
    ON public.grupo_mesa (mesa_anfitriona_id);

COMMENT ON TABLE public.grupo_mesa IS
    'Agrupa mesas unidas en una sola cuenta activa (Fase A — unir mesas).';

-- -----------------------------------------------------------------------------
-- 2. mesa_grupo_miembro — mesas que pertenecen a un grupo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mesa_grupo_miembro (
    id              SERIAL PRIMARY KEY,
    grupo_mesa_id   INTEGER NOT NULL,
    mesa_id         INTEGER NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Bogota'),
    left_at         TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT mesa_grupo_miembro_grupo_fkey
        FOREIGN KEY (grupo_mesa_id) REFERENCES public.grupo_mesa(id) ON DELETE CASCADE,
    CONSTRAINT mesa_grupo_miembro_mesa_fkey
        FOREIGN KEY (mesa_id) REFERENCES public.mesas(id),
    CONSTRAINT mesa_grupo_miembro_grupo_mesa_uq
        UNIQUE (grupo_mesa_id, mesa_id)
);

-- Una mesa solo puede estar en un grupo activo a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mesa_grupo_miembro_mesa_activa
    ON public.mesa_grupo_miembro (mesa_id)
    WHERE activo = TRUE;

CREATE INDEX IF NOT EXISTS idx_mesa_grupo_miembro_grupo
    ON public.mesa_grupo_miembro (grupo_mesa_id);

COMMENT ON TABLE public.mesa_grupo_miembro IS
    'Membresía mesa ↔ grupo. activo=TRUE indica pertenencia vigente al grupo.';

-- -----------------------------------------------------------------------------
-- 3. pedido_linea — ítems trazables (reemplaza JSON como fuente de verdad)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pedido_linea (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id           INTEGER NOT NULL,
    producto_id         INTEGER NOT NULL,
    nombre              VARCHAR(200) NOT NULL,
    precio              NUMERIC(10, 2) NOT NULL,
    cantidad            INTEGER NOT NULL DEFAULT 1,
    mesa_origen_id      INTEGER NOT NULL,
    mesa_origen_numero  INTEGER NOT NULL,
    estado_linea        VARCHAR(20) NOT NULL DEFAULT 'activa',
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Bogota'),
    updated_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Bogota'),
    CONSTRAINT pedido_linea_cantidad_chk
        CHECK (cantidad > 0),
    CONSTRAINT pedido_linea_precio_chk
        CHECK (precio >= 0),
    CONSTRAINT pedido_linea_estado_chk
        CHECK (estado_linea IN ('activa', 'movida', 'facturada')),
    CONSTRAINT pedido_linea_pedido_fkey
        FOREIGN KEY (pedido_id) REFERENCES public.pedido(id) ON DELETE CASCADE,
    CONSTRAINT pedido_linea_producto_fkey
        FOREIGN KEY (producto_id) REFERENCES public.producto(id),
    CONSTRAINT pedido_linea_mesa_origen_fkey
        FOREIGN KEY (mesa_origen_id) REFERENCES public.mesas(id)
);

CREATE INDEX IF NOT EXISTS idx_pedido_linea_pedido
    ON public.pedido_linea (pedido_id);

CREATE INDEX IF NOT EXISTS idx_pedido_linea_mesa_origen
    ON public.pedido_linea (mesa_origen_id);

CREATE INDEX IF NOT EXISTS idx_pedido_linea_estado_activa
    ON public.pedido_linea (pedido_id, estado_linea)
    WHERE estado_linea = 'activa';

COMMENT ON TABLE public.pedido_linea IS
    'Líneas de comanda con trazabilidad por mesa de origen. Fuente de verdad Fase A.';

COMMENT ON COLUMN public.pedido_linea.mesa_origen_id IS
    'Mesa física que pidió el producto (se conserva al unir mesas).';

-- -----------------------------------------------------------------------------
-- 4. Columnas nuevas en pedido
-- -----------------------------------------------------------------------------
ALTER TABLE public.pedido
    ADD COLUMN IF NOT EXISTS grupo_mesa_id INTEGER,
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'individual',
    ADD COLUMN IF NOT EXISTS pedido_padre_id INTEGER,
    ADD COLUMN IF NOT EXISTS etiqueta VARCHAR(100);

-- Defaults para filas existentes
UPDATE public.pedido
SET tipo = 'individual'
WHERE tipo IS NULL;

ALTER TABLE public.pedido
    DROP CONSTRAINT IF EXISTS pedido_tipo_chk;

ALTER TABLE public.pedido
    ADD CONSTRAINT pedido_tipo_chk
        CHECK (tipo IN ('individual', 'maestra', 'subcuenta'));

ALTER TABLE public.pedido
    DROP CONSTRAINT IF EXISTS pedido_grupo_mesa_fkey;

ALTER TABLE public.pedido
    ADD CONSTRAINT pedido_grupo_mesa_fkey
        FOREIGN KEY (grupo_mesa_id) REFERENCES public.grupo_mesa(id);

ALTER TABLE public.pedido
    DROP CONSTRAINT IF EXISTS pedido_pedido_padre_fkey;

ALTER TABLE public.pedido
    ADD CONSTRAINT pedido_pedido_padre_fkey
        FOREIGN KEY (pedido_padre_id) REFERENCES public.pedido(id);

CREATE INDEX IF NOT EXISTS idx_pedido_grupo_mesa
    ON public.pedido (grupo_mesa_id);

CREATE INDEX IF NOT EXISTS idx_pedido_padre
    ON public.pedido (pedido_padre_id);

CREATE INDEX IF NOT EXISTS idx_pedido_mesa_estado
    ON public.pedido (mesa_id, estado);

COMMENT ON COLUMN public.pedido.tipo IS
    'individual | maestra (cuenta consolidada) | subcuenta (división de pago).';

-- -----------------------------------------------------------------------------
-- 5. Columnas nuevas en mesas
-- -----------------------------------------------------------------------------
ALTER TABLE public.mesas
    ADD COLUMN IF NOT EXISTS grupo_mesa_id INTEGER;

ALTER TABLE public.mesas
    DROP CONSTRAINT IF EXISTS mesas_grupo_mesa_fkey;

ALTER TABLE public.mesas
    ADD CONSTRAINT mesas_grupo_mesa_fkey
        FOREIGN KEY (grupo_mesa_id) REFERENCES public.grupo_mesa(id);

CREATE INDEX IF NOT EXISTS idx_mesas_grupo_mesa
    ON public.mesas (grupo_mesa_id);

COMMENT ON COLUMN public.mesas.grupo_mesa_id IS
    'Grupo activo al que pertenece la mesa (NULL = mesa individual).';

-- =============================================================================
-- Fin Fase A — DDL
-- Siguiente paso: migrate_pendientes_a_lineas.py (NO backfill histórico cerrado)
-- =============================================================================
