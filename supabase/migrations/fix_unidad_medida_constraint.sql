-- Fix unidad_medida constraint issue in materiales table
-- The form uses 'unidad' field but database has 'unidad_medida' as NOT NULL
-- Solution: Make unidad_medida nullable and ensure unidad is properly populated

-- First, make unidad_medida nullable to avoid constraint violations
ALTER TABLE materiales 
ALTER COLUMN unidad_medida DROP NOT NULL;

-- Ensure unidad column has values where unidad_medida exists
UPDATE materiales 
SET unidad = unidad_medida 
WHERE unidad IS NULL AND unidad_medida IS NOT NULL;

-- Ensure unidad_medida has values where unidad exists  
UPDATE materiales 
SET unidad_medida = unidad 
WHERE unidad_medida IS NULL AND unidad IS NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN materiales.unidad_medida IS 'Unidad de medida del material (nullable para compatibilidad con formulario)';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'materiales' 
AND column_name IN ('unidad', 'unidad_medida')
ORDER BY column_name;