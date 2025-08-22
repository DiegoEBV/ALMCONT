-- Crear tabla entradas
CREATE TABLE IF NOT EXISTS public.entradas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL,
  solicitud_compra_id UUID,
  material_id UUID NOT NULL,
  cantidad_recibida DECIMAL(10,2) NOT NULL DEFAULT 0,
  cantidad_atendida DECIMAL(10,2) NOT NULL DEFAULT 0,
  fecha_recepcion DATE NOT NULL,
  fecha_entrada DATE NOT NULL,
  numero_factura VARCHAR(100),
  numero_guia VARCHAR(100),
  numero_sc VARCHAR(100),
  proveedor VARCHAR(255) NOT NULL,
  precio_unitario DECIMAL(10,2),
  observaciones TEXT,
  recibido_por VARCHAR(255) NOT NULL,
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_entradas_obra_id ON public.entradas(obra_id);
CREATE INDEX IF NOT EXISTS idx_entradas_material_id ON public.entradas(material_id);
CREATE INDEX IF NOT EXISTS idx_entradas_solicitud_compra_id ON public.entradas(solicitud_compra_id);
CREATE INDEX IF NOT EXISTS idx_entradas_fecha_entrada ON public.entradas(fecha_entrada);
CREATE INDEX IF NOT EXISTS idx_entradas_usuario_id ON public.entradas(usuario_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.entradas ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad
CREATE POLICY "Usuarios pueden ver entradas" ON public.entradas
  FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar entradas" ON public.entradas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar entradas" ON public.entradas
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar entradas" ON public.entradas
  FOR DELETE USING (auth.role() = 'authenticated');

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_entradas_updated_at
  BEFORE UPDATE ON public.entradas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Otorgar permisos a los roles
GRANT ALL PRIVILEGES ON public.entradas TO authenticated;
GRANT SELECT ON public.entradas TO anon;