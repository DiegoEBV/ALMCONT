-- Add PRODUCCION role to existing usuarios table
-- First drop the existing check constraint
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
-- Add the new constraint with PRODUCCION role
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol::text = ANY (ARRAY['COORDINACION'::character varying, 'LOGISTICA'::character varying, 'ALMACENERO'::character varying, 'PRODUCCION'::character varying]::text[]));

-- Materiales table already exists, just add missing column if needed
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES usuarios(id);

-- Create requerimiento_materiales table
CREATE TABLE IF NOT EXISTS requerimiento_materiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    obra_id UUID REFERENCES obras(id),
    solicitante_id UUID REFERENCES usuarios(id) NOT NULL,
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_requerida DATE,
    estado VARCHAR(50) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_PROCESO', 'COMPLETADO')),
    prioridad VARCHAR(20) DEFAULT 'MEDIA' CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'URGENTE')),
    comentarios TEXT,
    aprobado_por UUID REFERENCES usuarios(id),
    fecha_aprobacion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create detalle_requerimiento table
CREATE TABLE IF NOT EXISTS detalle_requerimiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requerimiento_id UUID REFERENCES requerimiento_materiales(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materiales(id),
    cantidad_solicitada DECIMAL(10,2) NOT NULL,
    cantidad_aprobada DECIMAL(10,2),
    comentarios TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alertas table
CREATE TABLE IF NOT EXISTS alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('REQUERIMIENTO_APROBADO', 'REQUERIMIENTO_RECHAZADO', 'STOCK_BAJO', 'REQUERIMIENTO_VENCIDO', 'GENERAL')),
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT false,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_vencimiento TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_materiales_codigo ON materiales(codigo);
CREATE INDEX IF NOT EXISTS idx_materiales_categoria ON materiales(categoria);
CREATE INDEX IF NOT EXISTS idx_requerimiento_materiales_obra ON requerimiento_materiales(obra_id);
CREATE INDEX IF NOT EXISTS idx_requerimiento_materiales_solicitante ON requerimiento_materiales(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_requerimiento_materiales_estado ON requerimiento_materiales(estado);
CREATE INDEX IF NOT EXISTS idx_detalle_requerimiento_material ON detalle_requerimiento(material_id);
CREATE INDEX IF NOT EXISTS idx_alertas_usuario ON alertas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_alertas_leida ON alertas(leida);

-- Enable RLS on new tables
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE requerimiento_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_requerimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for materiales
CREATE POLICY "Users can view all materials" ON materiales FOR SELECT USING (true);
CREATE POLICY "Coordinators can manage materials" ON materiales FOR ALL USING (
    EXISTS (
        SELECT 1 FROM usuarios 
        WHERE usuarios.id = auth.uid() 
        AND usuarios.rol = 'COORDINACION'
    )
);

-- Create RLS policies for requerimiento_materiales
CREATE POLICY "Users can view their own requirements" ON requerimiento_materiales FOR SELECT USING (
    solicitante_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM usuarios 
        WHERE usuarios.id = auth.uid() 
        AND usuarios.rol IN ('COORDINACION', 'LOGISTICA')
    )
);
CREATE POLICY "Production users can create requirements" ON requerimiento_materiales FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM usuarios 
        WHERE usuarios.id = auth.uid() 
        AND usuarios.rol = 'PRODUCCION'
    ) AND solicitante_id = auth.uid()
);
CREATE POLICY "Coordinators can manage requirements" ON requerimiento_materiales FOR ALL USING (
    EXISTS (
        SELECT 1 FROM usuarios 
        WHERE usuarios.id = auth.uid() 
        AND usuarios.rol IN ('COORDINACION', 'LOGISTICA')
    )
);

-- Create RLS policies for detalle_requerimiento
CREATE POLICY "Users can view requirement details" ON detalle_requerimiento FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM requerimiento_materiales rm
        WHERE rm.id = detalle_requerimiento.requerimiento_id
        AND (rm.solicitante_id = auth.uid() OR 
             EXISTS (
                 SELECT 1 FROM usuarios 
                 WHERE usuarios.id = auth.uid() 
                 AND usuarios.rol IN ('COORDINACION', 'LOGISTICA')
             ))
    )
);
CREATE POLICY "Production users can manage their requirement details" ON detalle_requerimiento FOR ALL USING (
    EXISTS (
        SELECT 1 FROM requerimiento_materiales rm
        JOIN usuarios u ON u.id = auth.uid()
        WHERE rm.id = detalle_requerimiento.requerimiento_id
        AND (rm.solicitante_id = auth.uid() OR u.rol IN ('COORDINACION', 'LOGISTICA'))
    )
);

-- Create RLS policies for alertas
CREATE POLICY "Users can view their own alerts" ON alertas FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY "Users can update their own alerts" ON alertas FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY "System can create alerts" ON alertas FOR INSERT WITH CHECK (true);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON materiales TO anon, authenticated;
GRANT ALL PRIVILEGES ON materiales TO authenticated;
GRANT SELECT ON requerimiento_materiales TO anon, authenticated;
GRANT ALL PRIVILEGES ON requerimiento_materiales TO authenticated;
GRANT SELECT ON detalle_requerimiento TO anon, authenticated;
GRANT ALL PRIVILEGES ON detalle_requerimiento TO authenticated;
GRANT SELECT ON alertas TO anon, authenticated;
GRANT ALL PRIVILEGES ON alertas TO authenticated;

-- Insert some sample materials (using existing column names)
INSERT INTO materiales (codigo, nombre, descripcion, unidad_medida, categoria, precio_referencial, stock_minimo) VALUES
('MAT-001', 'Cemento Portland', 'Cemento Portland tipo I', 'BOLSA', 'CONSTRUCCION', 25.50, 100),
('MAT-002', 'Varilla de Acero 1/2"', 'Varilla corrugada de 1/2 pulgada', 'UNIDAD', 'ACERO', 35.00, 50),
('MAT-003', 'Arena Gruesa', 'Arena gruesa para concreto', 'M3', 'AGREGADOS', 45.00, 10),
('MAT-004', 'Piedra Chancada', 'Piedra chancada 3/4"', 'M3', 'AGREGADOS', 55.00, 10),
('MAT-005', 'Ladrillo King Kong', 'Ladrillo de arcilla 18 huecos', 'MILLAR', 'ALBAÑILERIA', 450.00, 5)
ON CONFLICT (codigo) DO NOTHING;