-- Crear tabla ordenes_compra
CREATE TABLE IF NOT EXISTS public.ordenes_compra (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oc_numero VARCHAR(100) NOT NULL UNIQUE,
  sc_id UUID,
  obra_id UUID NOT NULL,
  proveedor VARCHAR(255) NOT NULL,
  fecha_orden DATE NOT NULL,
  fecha_entrega_estimada DATE,
  fecha_entrega_real DATE,
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'ENVIADA', 'RECIBIDA', 'CANCELADA')),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  igv DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  moneda VARCHAR(3) NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
  condiciones_pago TEXT,
  observaciones TEXT,
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_obra_id ON public.ordenes_compra(obra_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_sc_id ON public.ordenes_compra(sc_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_proveedor ON public.ordenes_compra(proveedor);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_estado ON public.ordenes_compra(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_fecha_orden ON public.ordenes_compra(fecha_orden);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_usuario_id ON public.ordenes_compra(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_oc_numero ON public.ordenes_compra(oc_numero);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.ordenes_compra ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad
CREATE POLICY "Usuarios pueden ver ordenes de compra" ON public.ordenes_compra
  FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar ordenes de compra" ON public.ordenes_compra
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar ordenes de compra" ON public.ordenes_compra
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar ordenes de compra" ON public.ordenes_compra
  FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger para actualizar updated_at
CREATE TRIGGER update_ordenes_compra_updated_at
  BEFORE UPDATE ON public.ordenes_compra
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Otorgar permisos a los roles
GRANT ALL PRIVILEGES ON public.ordenes_compra TO authenticated;
GRANT SELECT ON public.ordenes_compra TO anon;