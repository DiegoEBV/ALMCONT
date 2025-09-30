-- Crear obra por defecto para la migración
INSERT INTO public.obras (
  codigo,
  nombre,
  descripcion,
  ubicacion,
  fecha_inicio,
  estado,
  presupuesto
) VALUES (
  'OBRA-DEFAULT',
  'Obra por Defecto - Migración',
  'Obra creada automáticamente para la migración de datos desde requerimientos',
  'Por definir',
  CURRENT_DATE,
  'ACTIVA',
  0
)
ON CONFLICT (codigo) DO NOTHING;

-- Verificar que la obra fue creada
SELECT id, codigo, nombre, estado FROM public.obras WHERE codigo = 'OBRA-DEFAULT';