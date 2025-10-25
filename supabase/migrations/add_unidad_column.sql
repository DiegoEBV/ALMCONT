-- Agregar columna unidad a la tabla materiales
-- Esta columna es requerida por el formulario de creación de materiales
-- La tabla ya tiene unidad_medida, pero el código usa 'unidad'

ALTER TABLE materiales 
ADD COLUMN unidad VARCHAR(50);

-- Copiar los valores de unidad_medida a unidad para mantener consistencia
UPDATE materiales 
SET unidad = unidad_medida 
WHERE unidad_medida IS NOT NULL;

-- Agregar comentario a la columna
COMMENT ON COLUMN materiales.unidad IS 'Unidad de medida del material (copia de unidad_medida para compatibilidad)';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'materiales' 
AND column_name IN ('unidad', 'unidad_medida')
ORDER BY column_name;