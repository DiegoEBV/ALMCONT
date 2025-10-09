-- =====================================================
-- DATOS DE PRUEBA PARA SISTEMA DE PRÉSTAMOS Y TERCEROS
-- =====================================================

-- Insertar terceros de prueba
INSERT INTO terceros (codigo, razon_social, nombre_comercial, tipo_tercero, ruc, direccion, telefono, email, contacto_principal, telefono_contacto, email_contacto, estado, calificacion, limite_credito, dias_credito, observaciones) VALUES
('CONT-001', 'Constructora Los Andes S.A.C.', 'Los Andes Construcción', 'contratista', '20123456789', 'Av. Los Constructores 123, Lima', '01-234-5678', 'contacto@losandes.com', 'Juan Pérez', '987-654-321', 'juan.perez@losandes.com', 'activo', 4, 50000.00, 30, 'Contratista principal con buena reputación'),
('CONT-002', 'Servicios Técnicos del Norte E.I.R.L.', 'TecNorte', 'subcontratista', '20987654321', 'Jr. Industrial 456, Trujillo', '044-123-456', 'info@tecnorte.com', 'María García', '956-789-123', 'maria.garcia@tecnorte.com', 'activo', 5, 30000.00, 15, 'Especialistas en instalaciones eléctricas'),
('CONT-003', 'Transportes y Logística Rápida S.R.L.', 'LogiRápida', 'proveedor_servicios', '20456789123', 'Av. Transporte 789, Arequipa', '054-987-654', 'ventas@logirapida.com', 'Carlos Mendoza', '945-123-789', 'carlos.mendoza@logirapida.com', 'activo', 3, 20000.00, 7, 'Servicios de transporte y logística'),
('CONT-004', 'Estructuras Metálicas del Sur S.A.', 'MetalSur', 'contratista', '20789123456', 'Parque Industrial 321, Cusco', '084-456-789', 'estructuras@metalsur.com', 'Ana Rodríguez', '932-456-789', 'ana.rodriguez@metalsur.com', 'suspendido', 2, 15000.00, 0, 'Suspendido por incumplimiento en proyecto anterior'),
('CONT-005', 'Acabados y Pinturas Premium S.A.C.', 'Premium Acabados', 'subcontratista', '20321654987', 'Av. Los Artesanos 654, Piura', '073-789-123', 'acabados@premium.com', 'Luis Torres', '987-321-654', 'luis.torres@premium.com', 'activo', 4, 25000.00, 20, 'Especialistas en acabados de alta calidad');

-- Obtener IDs necesarios para los datos de prueba
DO $$
DECLARE
    obra_id UUID;
    usuario_coord_id UUID;
    usuario_almacen_id UUID;
    tercero1_id UUID;
    tercero2_id UUID;
    tercero3_id UUID;
    material1_id UUID;
    material2_id UUID;
    material3_id UUID;
    ubicacion1_id UUID;
    acuerdo1_id UUID := gen_random_uuid();
    acuerdo2_id UUID := gen_random_uuid();
    prestamo1_id UUID := gen_random_uuid();
    prestamo2_id UUID := gen_random_uuid();
    prestamo3_id UUID := gen_random_uuid();
    prestamo4_id UUID := gen_random_uuid();
    devolucion1_id UUID := gen_random_uuid();
BEGIN
    -- Obtener obra existente
    SELECT id INTO obra_id FROM obras WHERE codigo = 'PROYECTO-CHAVIN' LIMIT 1;
    IF obra_id IS NULL THEN
        SELECT id INTO obra_id FROM obras LIMIT 1;
    END IF;
    
    -- Obtener usuarios
    SELECT id INTO usuario_coord_id FROM usuarios WHERE rol = 'COORDINACION' LIMIT 1;
    SELECT id INTO usuario_almacen_id FROM usuarios WHERE rol = 'ALMACENERO' LIMIT 1;
    
    -- Obtener terceros
    SELECT id INTO tercero1_id FROM terceros WHERE codigo = 'CONT-001';
    SELECT id INTO tercero2_id FROM terceros WHERE codigo = 'CONT-002';
    SELECT id INTO tercero3_id FROM terceros WHERE codigo = 'CONT-003';
    
    -- Obtener materiales
    SELECT id INTO material1_id FROM materiales WHERE codigo = 'MAT-001' LIMIT 1;
    SELECT id INTO material2_id FROM materiales WHERE codigo = 'MAT-002' LIMIT 1;
    SELECT id INTO material3_id FROM materiales WHERE codigo = 'MAT-003' LIMIT 1;
    
    -- Si no hay materiales, crear algunos
    IF material1_id IS NULL THEN
        INSERT INTO materiales (codigo, nombre, descripcion, categoria, subcategoria, unidad_medida, precio_referencial, stock_minimo, activo)
        VALUES 
            ('MAT-PREST-001', 'Andamios Metálicos', 'Andamios tubulares para construcción', 'EQUIPOS', 'ANDAMIOS', 'UNIDAD', 150.00, 10, true),
            ('MAT-PREST-002', 'Herramientas Eléctricas', 'Taladros y amoladoras industriales', 'HERRAMIENTAS', 'ELECTRICAS', 'UNIDAD', 350.00, 5, true),
            ('MAT-PREST-003', 'Cables Eléctricos 12 AWG', 'Cable eléctrico calibre 12 AWG', 'ELECTRICO', 'CABLES', 'METRO', 8.50, 500, true)
        RETURNING id INTO material1_id;
        
        SELECT id INTO material2_id FROM materiales WHERE codigo = 'MAT-PREST-002';
        SELECT id INTO material3_id FROM materiales WHERE codigo = 'MAT-PREST-003';
    END IF;
    
    -- Obtener ubicación
    SELECT id INTO ubicacion1_id FROM ubicaciones LIMIT 1;
    
    -- Insertar acuerdos de préstamo
    INSERT INTO acuerdos_prestamo (id, numero_acuerdo, tercero_id, obra_id, tipo_acuerdo, estado, fecha_inicio, fecha_vencimiento, descripcion, condiciones_especiales, garantia_requerida, tipo_garantia, monto_garantia, responsable_empresa, responsable_tercero, telefono_responsable_tercero)
    VALUES 
        (acuerdo1_id, 'ACU-2024-001', tercero1_id, obra_id, 'prestamo_a_tercero', 'activo', '2024-01-15', '2024-12-31', 'Acuerdo para préstamo de equipos y herramientas', 'Devolución en mismo estado, mantenimiento por cuenta del tercero', true, 'deposito_efectivo', 5000.00, usuario_coord_id, 'Juan Pérez', '987-654-321'),
        (acuerdo2_id, 'ACU-2024-002', tercero2_id, obra_id, 'prestamo_de_tercero', 'activo', '2024-02-01', '2024-06-30', 'Préstamo de materiales eléctricos especializados', 'Materiales nuevos, garantía de 6 meses', false, null, null, usuario_coord_id, 'María García', '956-789-123');
    
    -- Insertar préstamos de materiales
    INSERT INTO prestamos_materiales (id, numero_prestamo, acuerdo_id, tercero_id, obra_id, tipo_prestamo, estado, fecha_solicitud, fecha_aprobacion, fecha_entrega, fecha_devolucion_programada, solicitado_por, aprobado_por, entregado_por, recibido_por, motivo, condiciones_devolucion, penalidad_retraso, valor_total_estimado, observaciones)
    VALUES 
        (prestamo1_id, 'PS-2024-0001', acuerdo1_id, tercero1_id, obra_id, 'prestamo_saliente', 'entregado', '2024-01-20 08:00:00', '2024-01-20 10:00:00', '2024-01-21 14:00:00', '2024-03-21', usuario_almacen_id, usuario_coord_id, usuario_almacen_id, 'Juan Pérez', 'Préstamo de andamios para estructura de edificio', 'Devolución en mismo estado de conservación', 50.00, 3000.00, 'Préstamo activo, vence en marzo'),
        (prestamo2_id, 'PE-2024-0001', acuerdo2_id, tercero2_id, obra_id, 'prestamo_entrante', 'devuelto_completo', '2024-02-05 09:00:00', '2024-02-05 11:00:00', '2024-02-06 16:00:00', '2024-04-06', usuario_almacen_id, usuario_coord_id, usuario_almacen_id, 'María García', 'Préstamo de herramientas eléctricas especializadas', 'Devolución con mantenimiento realizado', 0.00, 1750.00, 'Préstamo completado exitosamente'),
        (prestamo3_id, 'PS-2024-0002', acuerdo1_id, tercero1_id, obra_id, 'prestamo_saliente', 'vencido', '2024-01-25 10:00:00', '2024-01-25 14:00:00', '2024-01-26 09:00:00', '2024-02-26', usuario_almacen_id, usuario_coord_id, usuario_almacen_id, 'Juan Pérez', 'Préstamo de cables eléctricos', 'Devolución completa requerida', 25.00, 850.00, 'PRÉSTAMO VENCIDO - Requiere seguimiento'),
        (prestamo4_id, 'PS-2024-0003', null, tercero3_id, obra_id, 'prestamo_saliente', 'parcialmente_devuelto', '2024-03-01 08:30:00', '2024-03-01 12:00:00', '2024-03-02 15:00:00', '2024-04-02', usuario_almacen_id, usuario_coord_id, usuario_almacen_id, 'Carlos Mendoza', 'Préstamo de herramientas para mantenimiento', 'Devolución parcial aceptable', 30.00, 1050.00, 'Devolución parcial recibida');
    
    -- Insertar detalles de préstamos
    INSERT INTO detalle_prestamos (prestamo_id, material_id, cantidad_solicitada, cantidad_aprobada, cantidad_entregada, cantidad_devuelta, precio_unitario_referencial, valor_total, condicion_entrega, condicion_devolucion_esperada, ubicacion_origen, ubicacion_destino_tercero, observaciones_detalle)
    VALUES 
        -- Préstamo 1: Andamios (activo)
        (prestamo1_id, material1_id, 20, 20, 20, 0, 150.00, 3000.00, 'usado_bueno', 'mismo_estado', ubicacion1_id, 'Obra Los Andes - Sector A', 'Andamios en buen estado'),
        
        -- Préstamo 2: Herramientas (completado)
        (prestamo2_id, material2_id, 5, 5, 5, 5, 350.00, 1750.00, 'nuevo', 'usado_aceptable', ubicacion1_id, 'Taller TecNorte', 'Herramientas nuevas, devueltas con mantenimiento'),
        
        -- Préstamo 3: Cables (vencido)
        (prestamo3_id, material3_id, 100, 100, 100, 0, 8.50, 850.00, 'nuevo', 'mismo_estado', ubicacion1_id, 'Instalación temporal - Bloque B', 'VENCIDO - Cables no devueltos'),
        
        -- Préstamo 4: Herramientas (parcialmente devuelto)
        (prestamo4_id, material2_id, 3, 3, 3, 2, 350.00, 1050.00, 'usado_bueno', 'usado_aceptable', ubicacion1_id, 'Taller LogiRápida', 'Devueltas 2 de 3 herramientas');
    
    -- Insertar devolución de préstamo
    INSERT INTO devoluciones_prestamos (id, numero_devolucion, prestamo_id, tipo_devolucion, estado, fecha_devolucion, recibido_por, inspeccionado_por, fecha_inspeccion, observaciones_recepcion, observaciones_inspeccion, penalidad_aplicada, motivo_penalidad)
    VALUES 
        (devolucion1_id, 'DEV-PREST-2024-001', prestamo2_id, 'devolucion_total', 'procesada', '2024-04-05 10:00:00', usuario_almacen_id, usuario_coord_id, '2024-04-05 14:00:00', 'Herramientas recibidas en buen estado', 'Herramientas con mantenimiento realizado, estado excelente', 0.00, null);
    
    -- Insertar detalle de devolución
    INSERT INTO detalle_devoluciones_prestamos (devolucion_prestamo_id, detalle_prestamo_id, material_id, cantidad_devuelta, condicion_devolucion, accion_tomada, valor_depreciacion, ubicacion_destino, observaciones_detalle)
    SELECT 
        devolucion1_id,
        dp.id,
        dp.material_id,
        dp.cantidad_entregada,
        'usado_bueno',
        'reintegrar_inventario',
        0.00,
        ubicacion1_id,
        'Herramientas reintegradas al inventario'
    FROM detalle_prestamos dp
    WHERE dp.prestamo_id = prestamo2_id;
    
    -- Insertar garantías
    INSERT INTO garantias_prestamos (prestamo_id, tipo_garantia, descripcion, valor_garantia, fecha_constitucion, fecha_vencimiento, estado, observaciones)
    VALUES 
        (prestamo1_id, 'deposito_efectivo', 'Depósito en efectivo por préstamo de andamios', 5000.00, '2024-01-21', '2024-03-21', 'activa', 'Depósito constituido en cuenta bancaria'),
        (prestamo3_id, 'retencion_pagos', 'Retención de pagos por préstamo vencido', 850.00, '2024-02-26', null, 'ejecutada', 'Garantía ejecutada por vencimiento de préstamo');
    
    -- Insertar alertas
    INSERT INTO alertas_prestamos (prestamo_id, tipo_alerta, nivel_prioridad, mensaje, fecha_alerta, fecha_vencimiento, estado, notificado_a, observaciones_resolucion)
    VALUES 
        (prestamo1_id, 'vencimiento_proximo', 'media', 'El préstamo PS-2024-0001 vence en 7 días', NOW() - INTERVAL '2 days', '2024-03-21', 'activa', usuario_coord_id, null),
        (prestamo3_id, 'prestamo_vencido', 'critica', 'El préstamo PS-2024-0002 está vencido desde hace 15 días', NOW() - INTERVAL '15 days', '2024-02-26', 'notificada', usuario_coord_id, null),
        (prestamo4_id, 'devolucion_parcial_pendiente', 'alta', 'Préstamo PS-2024-0003 tiene devolución parcial pendiente', NOW() - INTERVAL '5 days', '2024-04-02', 'activa', usuario_almacen_id, null);
    
    RAISE NOTICE 'Datos de prueba para préstamos insertados exitosamente';
    RAISE NOTICE 'Obra ID: %', obra_id;
    RAISE NOTICE 'Terceros creados: 5';
    RAISE NOTICE 'Acuerdos creados: 2';
    RAISE NOTICE 'Préstamos creados: 4';
    RAISE NOTICE 'Alertas creadas: 3';
END $$;

-- Verificar los datos insertados
SELECT 'Resumen de datos de prueba insertados:' as titulo;

SELECT 
    'Terceros' as tabla,
    COUNT(*) as registros,
    COUNT(CASE WHEN estado = 'activo' THEN 1 END) as activos,
    COUNT(CASE WHEN estado = 'suspendido' THEN 1 END) as suspendidos
FROM terceros
UNION ALL
SELECT 
    'Acuerdos de Préstamo' as tabla,
    COUNT(*) as registros,
    COUNT(CASE WHEN estado = 'activo' THEN 1 END) as activos,
    COUNT(CASE WHEN estado = 'borrador' THEN 1 END) as borradores
FROM acuerdos_prestamo
UNION ALL
SELECT 
    'Préstamos de Materiales' as tabla,
    COUNT(*) as registros,
    COUNT(CASE WHEN estado = 'entregado' THEN 1 END) as entregados,
    COUNT(CASE WHEN estado = 'vencido' THEN 1 END) as vencidos
FROM prestamos_materiales
UNION ALL
SELECT 
    'Alertas de Préstamos' as tabla,
    COUNT(*) as registros,
    COUNT(CASE WHEN estado = 'activa' THEN 1 END) as activas,
    COUNT(CASE WHEN nivel_prioridad = 'critica' THEN 1 END) as criticas
FROM alertas_prestamos;

-- Mostrar préstamos por estado
SELECT 
    'Estado de Préstamos' as resumen,
    estado,
    COUNT(*) as cantidad,
    SUM(valor_total_estimado) as valor_total
FROM prestamos_materiales
GROUP BY estado
ORDER BY cantidad DESC;