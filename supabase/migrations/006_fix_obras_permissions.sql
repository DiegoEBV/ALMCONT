-- Habilitar RLS y otorgar permisos para la tabla obras

-- Habilitar RLS en la tabla obras
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;

-- Otorgar permisos básicos a los roles anon y authenticated
GRANT SELECT ON obras TO anon;
GRANT ALL PRIVILEGES ON obras TO authenticated;

-- Crear políticas RLS para obras
CREATE POLICY "Obras visible para todos los usuarios autenticados" ON obras
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Obras modificable por coordinadores" ON obras
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.rol IN ('COORDINACION')
        )
    );

-- Verificar que los datos de obras existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM obras LIMIT 1) THEN
        -- Re-insertar datos de obras si no existen
        INSERT INTO obras (id, codigo, nombre, descripcion, ubicacion, fecha_inicio, fecha_fin_estimada, estado, responsable_id) VALUES
        ('660e8400-e29b-41d4-a716-446655440001', 'OBR-2024-001', 'Edificio Residencial Los Pinos', 'Construcción de edificio residencial de 15 pisos', 'Av. Principal 123, La Paz', '2024-01-15', '2025-06-30', 'ACTIVA', '550e8400-e29b-41d4-a716-446655440001'),
        ('660e8400-e29b-41d4-a716-446655440002', 'OBR-2024-002', 'Centro Comercial Plaza Norte', 'Centro comercial de 3 niveles con estacionamiento', 'Zona Norte, El Alto', '2024-03-01', '2025-12-15', 'ACTIVA', '550e8400-e29b-41d4-a716-446655440001')
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Datos de obras re-insertados';
    ELSE
        RAISE NOTICE 'Los datos de obras ya existen';
    END IF;
END $$;

-- Comentario
COMMENT ON TABLE obras IS 'Tabla de obras con RLS habilitado y permisos configurados';