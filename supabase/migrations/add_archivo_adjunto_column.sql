-- Agregar columna archivo_adjunto a la tabla requerimientos
-- Esta columna almacenará la ruta o URL del archivo adjunto asociado al requerimiento

ALTER TABLE public.requerimientos 
ADD COLUMN archivo_adjunto TEXT;

-- Agregar comentario a la columna para documentación
COMMENT ON COLUMN public.requerimientos.archivo_adjunto IS 'Ruta o URL del archivo adjunto asociado al requerimiento';

-- Verificar que la columna se agregó correctamente
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'requerimientos' AND column_name = 'archivo_adjunto';