-- Verificar y otorgar permisos para todas las tablas necesarias

-- Verificar permisos actuales
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
AND table_name IN ('obras', 'materiales', 'usuarios', 'requerimiento_materiales')
ORDER BY table_name, grantee;

-- Otorgar permisos básicos a materiales si no existen
GRANT SELECT ON materiales TO anon;
GRANT ALL PRIVILEGES ON materiales TO authenticated;

-- Otorgar permisos a usuarios
GRANT SELECT ON usuarios TO anon;
GRANT ALL PRIVILEGES ON usuarios TO authenticated;

-- Otorgar permisos a requerimiento_materiales
GRANT SELECT ON requerimiento_materiales TO anon;
GRANT ALL PRIVILEGES ON requerimiento_materiales TO authenticated;

-- Otorgar permisos a detalle_requerimiento
GRANT SELECT ON detalle_requerimiento TO anon;
GRANT ALL PRIVILEGES ON detalle_requerimiento TO authenticated;

-- Verificar que los datos existen
DO $$
DECLARE
    obras_count INTEGER;
    materiales_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO obras_count FROM obras;
    SELECT COUNT(*) INTO materiales_count FROM materiales;
    
    RAISE NOTICE 'Obras encontradas: %', obras_count;
    RAISE NOTICE 'Materiales encontrados: %', materiales_count;
    
    IF obras_count = 0 THEN
        RAISE NOTICE 'Re-insertando datos de obras...';
        INSERT INTO obras (id, codigo, nombre, descripcion, ubicacion, fecha_inicio, fecha_fin_estimada, estado, responsable_id) VALUES
        ('660e8400-e29b-41d4-a716-446655440001', 'OBR-2024-001', 'Edificio Residencial Los Pinos', 'Construcción de edificio residencial de 15 pisos', 'Av. Principal 123, La Paz', '2024-01-15', '2025-06-30', 'ACTIVA', '550e8400-e29b-41d4-a716-446655440001'),
        ('660e8400-e29b-41d4-a716-446655440002', 'OBR-2024-002', 'Centro Comercial Plaza Norte', 'Centro comercial de 3 niveles con estacionamiento', 'Zona Norte, El Alto', '2024-03-01', '2025-12-15', 'ACTIVA', '550e8400-e29b-41d4-a716-446655440001')
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    IF materiales_count = 0 THEN
        RAISE NOTICE 'Re-insertando datos de materiales...';
        INSERT INTO materiales (id, codigo, nombre, descripcion, unidad_medida, categoria, precio_referencial, activo) VALUES
        ('770e8400-e29b-41d4-a716-446655440001', 'CEM-001', 'Cemento Portland IP', 'Cemento Portland puzolánico tipo IP', 'BOLSA', 'CEMENTO', 52.00, true),
        ('770e8400-e29b-41d4-a716-446655440002', 'HIE-001', 'Fierro corrugado 12mm', 'Varilla de acero corrugado de 12mm x 12m', 'VARILLA', 'FIERRO', 45.50, true),
        ('770e8400-e29b-41d4-a716-446655440003', 'AGR-001', 'Arena fina', 'Arena fina para construcción', 'M3', 'AGREGADOS', 120.00, true),
        ('770e8400-e29b-41d4-a716-446655440004', 'LAD-001', 'Ladrillo gambote 6H', 'Ladrillo gambote de 6 huecos', 'UNIDAD', 'LADRILLO', 1.20, true)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Comentario final
COMMENT ON SCHEMA public IS 'Esquema público con permisos configurados para anon y authenticated';