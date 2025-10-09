-- Insertar datos de ejemplo para devoluciones
-- Primero obtenemos algunos IDs necesarios
DO $$
DECLARE
    obra_id UUID;
    usuario_id UUID;
    material1_id UUID;
    material2_id UUID;
    material3_id UUID;
    devolucion1_id UUID;
    devolucion2_id UUID;
    devolucion3_id UUID;
BEGIN
    -- Obtener IDs existentes
    SELECT id INTO obra_id FROM obras LIMIT 1;
    SELECT id INTO usuario_id FROM usuarios LIMIT 1;
    SELECT id INTO material1_id FROM materiales WHERE nombre ILIKE '%cemento%' LIMIT 1;
    SELECT id INTO material2_id FROM materiales WHERE nombre ILIKE '%arena%' LIMIT 1;
    SELECT id INTO material3_id FROM materiales WHERE nombre ILIKE '%fierro%' LIMIT 1;
    
    -- Si no hay materiales específicos, usar los primeros 3
    IF material1_id IS NULL THEN
        SELECT id INTO material1_id FROM materiales ORDER BY nombre LIMIT 1;
    END IF;
    IF material2_id IS NULL THEN
        SELECT id INTO material2_id FROM materiales ORDER BY nombre OFFSET 1 LIMIT 1;
    END IF;
    IF material3_id IS NULL THEN
        SELECT id INTO material3_id FROM materiales ORDER BY nombre OFFSET 2 LIMIT 1;
    END IF;
    
    -- Insertar devoluciones de ejemplo
    INSERT INTO devoluciones (
        id, numero_devolucion, tipo_devolucion, estado, obra_origen, 
        solicitante, fecha_solicitud, motivo, observaciones
    ) VALUES 
    (
        gen_random_uuid(), 
        'DEV-2024-001', 
        'devolucion_obra', 
        'solicitada',
        obra_id,
        usuario_id,
        NOW() - INTERVAL '5 days',
        'Material sobrante de obra',
        'Materiales en buen estado que sobraron del proyecto'
    ),
    (
        gen_random_uuid(), 
        'DEV-2024-002', 
        'material_defectuoso', 
        'en_inspeccion',
        obra_id,
        usuario_id,
        NOW() - INTERVAL '3 days',
        'Material defectuoso detectado en obra',
        'Cemento con grumos, arena con impurezas'
    ),
    (
        gen_random_uuid(), 
        'DEV-2024-003', 
        'exceso_inventario', 
        'aprobada',
        obra_id,
        usuario_id,
        NOW() - INTERVAL '1 day',
        'Exceso de inventario en almacén',
        'Reducción de stock por cambio de especificaciones'
    )
    RETURNING id INTO devolucion1_id;
    
    -- Obtener los IDs de las devoluciones insertadas
    SELECT id INTO devolucion1_id FROM devoluciones WHERE numero_devolucion = 'DEV-2024-001';
    SELECT id INTO devolucion2_id FROM devoluciones WHERE numero_devolucion = 'DEV-2024-002';
    SELECT id INTO devolucion3_id FROM devoluciones WHERE numero_devolucion = 'DEV-2024-003';
    
    -- Insertar detalles de devoluciones
    INSERT INTO detalle_devoluciones (
        devolucion_id, material_id, cantidad, estado_material, observaciones
    ) VALUES 
    -- Detalles para DEV-2024-001
    (devolucion1_id, material1_id, 50, 'bueno', 'Cemento en buen estado'),
    (devolucion1_id, material2_id, 100, 'bueno', 'Arena limpia'),
    
    -- Detalles para DEV-2024-002
    (devolucion2_id, material1_id, 25, 'defectuoso', 'Cemento con grumos'),
    (devolucion2_id, material3_id, 10, 'reparable', 'Fierro con óxido superficial'),
    
    -- Detalles para DEV-2024-003
    (devolucion3_id, material2_id, 200, 'bueno', 'Arena de buena calidad'),
    (devolucion3_id, material3_id, 50, 'bueno', 'Fierro en perfecto estado');
    
    RAISE NOTICE 'Datos de ejemplo para devoluciones insertados correctamente';
END $$;