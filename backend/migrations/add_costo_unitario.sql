-- Migración: columna costo_unitario para rentabilidad en producto
-- Ejecutar: psql -U postgres -d seasons_club_db -f backend/migrations/add_costo_unitario.sql

ALTER TABLE producto ADD COLUMN IF NOT EXISTS costo_unitario DOUBLE PRECISION;

UPDATE producto
SET costo_unitario = COALESCE(precio_compra, 0)
WHERE costo_unitario IS NULL;

UPDATE producto SET costo_unitario = 0 WHERE costo_unitario IS NULL;

ALTER TABLE producto ALTER COLUMN costo_unitario SET DEFAULT 0;
ALTER TABLE producto ALTER COLUMN costo_unitario SET NOT NULL;
