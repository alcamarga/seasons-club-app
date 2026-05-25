-- =============================================================================
-- Migración: sincronizar tabla public.producto con models/producto.py
-- Base de datos: seasons_club_db
-- Ejecutar: psql -U postgres -d seasons_club_db -f backend/migrations/sync_producto_inventario.sql
-- =============================================================================

-- Estado ANTES (solo menú): id, nombre, precio, descripcion, categoria,
--   precio_pequena, precio_mediana, precio_grande

-- Columnas requeridas por el ORM + InventarioService (camelCase en JSON):
--   precio_compra  -> precioCompra
--   precio_venta   -> precioVenta
--   stock          -> stock
--   imagen_url     -> imagenUrl
--   es_insumo      -> esInsumo

ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_compra DOUBLE PRECISION;
ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_venta DOUBLE PRECISION;
ALTER TABLE producto ADD COLUMN IF NOT EXISTS stock INTEGER;
ALTER TABLE producto ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500);
ALTER TABLE producto ADD COLUMN IF NOT EXISTS es_insumo BOOLEAN;

-- Valores por defecto para filas existentes
UPDATE producto SET precio_compra = 0 WHERE precio_compra IS NULL;
UPDATE producto SET precio_venta = COALESCE(precio_pequena, precio::double precision, 0) WHERE precio_venta IS NULL;
UPDATE producto SET stock = 0 WHERE stock IS NULL;
UPDATE producto SET imagen_url = '' WHERE imagen_url IS NULL;
UPDATE producto SET es_insumo = FALSE WHERE es_insumo IS NULL;

-- NOT NULL (solo si la columna ya existe y tiene datos saneados)
ALTER TABLE producto ALTER COLUMN precio_compra SET DEFAULT 0;
ALTER TABLE producto ALTER COLUMN precio_compra SET NOT NULL;
ALTER TABLE producto ALTER COLUMN precio_venta SET DEFAULT 0;
ALTER TABLE producto ALTER COLUMN precio_venta SET NOT NULL;
ALTER TABLE producto ALTER COLUMN stock SET DEFAULT 0;
ALTER TABLE producto ALTER COLUMN stock SET NOT NULL;
ALTER TABLE producto ALTER COLUMN imagen_url SET DEFAULT '';
ALTER TABLE producto ALTER COLUMN es_insumo SET DEFAULT FALSE;
ALTER TABLE producto ALTER COLUMN es_insumo SET NOT NULL;

-- Asegurar que precio (precio_base en Python) nunca quede NULL en inserts de inventario
UPDATE producto SET precio = 0 WHERE precio IS NULL;
ALTER TABLE producto ALTER COLUMN precio SET DEFAULT 0;
