-- Crear tabla salidas
CREATE TABLE IF NOT EXISTS public.salidas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL,
  requerimiento_id UUID,
  material_id UUID NOT NULL,
  cantidad_entregada DECIMAL(10,2) NOT NULL DEFAULT 0,
  fecha_entrega DATE NOT NULL,
  numero_salida VARCHAR(100),
  solicitante VARCHAR(255) NOT NULL,
  motivo VARCHAR(500) NOT NULL,
  observaciones TEXT,
  entregado_por VARCHAR(255) NOT NULL,
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_salidas_obra_id ON public.salidas(obra_id);
CREATE INDEX IF NOT EXISTS idx_salidas_material_id ON public.salidas(material_id);
CREATE INDEX IF NOT EXISTS idx_salidas_requerimiento_id ON public.salidas(requerimiento_id);
CREATE INDEX IF NOT EXISTS idx_salidas_fecha_entrega ON public.salidas(fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_salidas_usuario_id ON public.salidas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_salidas_solicitante ON public.salidas(solicitante);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.salidas ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad
CREATE POLICY "Usuarios pueden ver salidas" ON public.salidas
  FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar salidas" ON public.salidas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar salidas" ON public.salidas
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar salidas" ON public.salidas
  FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger para actualizar updated_at
CREATE TRIGGER update_salidas_updated_at
  BEFORE UPDATE ON public.salidas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Otorgar permisos a los roles
GRANT ALL PRIVILEGES ON public.salidas TO authenticated;
GRANT SELECT ON public.salidas TO anon;