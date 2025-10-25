-- Agregar columna precio_unitario a la tabla materiales
-- Esta columna es requerida por el formulario de creación de materiales

ALTER TABLE materiales 
ADD COLUMN precio_unitario NUMERIC(10,2) DEFAULT 0;

-- Agregar comentario a la columna
COMMENT ON COLUMN materiales.precio_unitario IS 'Precio unitario del material en soles';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'materiales' 
AND column_name = 'precio_unitario';