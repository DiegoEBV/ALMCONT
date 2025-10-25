-- Migración para agregar la columna stock_maximo a la tabla materiales
-- Fecha: 2025-01-02
-- Descripción: Agregar columna stock_maximo para completar la funcionalidad del formulario de materiales

-- Agregar la columna stock_maximo a la tabla materiales
ALTER TABLE materiales 
ADD COLUMN IF NOT EXISTS stock_maximo INTEGER DEFAULT 0;

-- Agregar comentario a la columna
COMMENT ON COLUMN materiales.stock_maximo IS 'Stock máximo recomendado para el material';

-- Agregar constraint para asegurar que stock_maximo sea mayor o igual a 0
ALTER TABLE materiales 
ADD CONSTRAINT check_stock_maximo_positive 
CHECK (stock_maximo >= 0);

-- Opcional: Agregar constraint para asegurar que stock_maximo sea mayor o igual a stock_minimo
ALTER TABLE materiales 
ADD CONSTRAINT check_stock_maximo_greater_than_minimo 
CHECK (stock_maximo >= stock_minimo OR stock_maximo = 0);

-- Actualizar materiales existentes con un valor por defecto basado en stock_minimo
UPDATE materiales 
SET stock_maximo = CASE 
    WHEN stock_minimo > 0 THEN stock_minimo * 3 
    ELSE 100 
END
WHERE stock_maximo IS NULL OR stock_maximo = 0;