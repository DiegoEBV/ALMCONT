-- Migración para agregar datos de prueba para inventario cíclico
-- Fecha: 2024-12-18

-- Primero, obtener algunos materiales e IDs de usuarios existentes
DO $$
DECLARE
    material1_id uuid;
    material2_id uuid;
    material3_id uuid;
    material4_id uuid;
    usuario1_id uuid;
    usuario2_id uuid;
    ubicacion1_id uuid;
    ubicacion2_id uuid;
    ubicacion3_id uuid;
    conteo1_id uuid := gen_random_uuid();
    conteo2_id uuid := gen_random_uuid();
    conteo3_id uuid := gen_random_uuid();
    conteo4_id uuid := gen_random_uuid();
    conteo5_id uuid := gen_random_uuid();
BEGIN
    -- Obtener algunos materiales existentes
    SELECT id INTO material1_id FROM materiales WHERE codigo = 'MAT-001' LIMIT 1;
    SELECT id INTO material2_id FROM materiales WHERE codigo = 'MAT-002' LIMIT 1;
    SELECT id INTO material3_id FROM materiales WHERE codigo = 'MAT-003' LIMIT 1;
    SELECT id INTO material4_id FROM materiales WHERE codigo = 'MAT-004' LIMIT 1;
    
    -- Si no existen materiales, crear algunos de prueba
    IF material1_id IS NULL THEN
        INSERT INTO materiales (codigo, nombre, descripcion, categoria, subcategoria, unidad_medida, precio_referencial, stock_minimo, activo)
        VALUES 
            ('MAT-001', 'Cemento Portland', 'Cemento tipo I para construcción', 'CONSTRUCCION', 'CEMENTO', 'BOLSA', 25.50, 100, true),
            ('MAT-002', 'Varilla de Acero 1/2"', 'Varilla corrugada de 1/2 pulgada', 'CONSTRUCCION', 'ACERO', 'UNIDAD', 35.00, 50, true),
            ('MAT-003', 'Ladrillo King Kong', 'Ladrillo de arcilla 18 huecos', 'CONSTRUCCION', 'LADRILLO', 'MILLAR', 450.00, 20, true),
            ('MAT-004', 'Arena Gruesa', 'Arena gruesa para concreto', 'CONSTRUCCION', 'AGREGADOS', 'M3', 80.00, 10, true)
        RETURNING id INTO material1_id;
        
        SELECT id INTO material2_id FROM materiales WHERE codigo = 'MAT-002' LIMIT 1;
        SELECT id INTO material3_id FROM materiales WHERE codigo = 'MAT-003' LIMIT 1;
        SELECT id INTO material4_id FROM materiales WHERE codigo = 'MAT-004' LIMIT 1;
    END IF;
    
    -- Obtener algunos usuarios existentes
    SELECT id INTO usuario1_id FROM usuarios WHERE rol IN ('ALMACENERO', 'LOGISTICA') LIMIT 1;
    SELECT id INTO usuario2_id FROM usuarios WHERE rol IN ('ALMACENERO', 'LOGISTICA') AND id != usuario1_id LIMIT 1;
    
    -- Si no hay usuarios apropiados, usar el primer usuario disponible
    IF usuario1_id IS NULL THEN
        SELECT id INTO usuario1_id FROM usuarios LIMIT 1;
    END IF;
    IF usuario2_id IS NULL THEN
        SELECT id INTO usuario2_id FROM usuarios WHERE id != usuario1_id LIMIT 1;
    END IF;
    
    -- Obtener algunas ubicaciones existentes
    SELECT id INTO ubicacion1_id FROM ubicaciones WHERE activa = true LIMIT 1;
    SELECT id INTO ubicacion2_id FROM ubicaciones WHERE activa = true AND id != ubicacion1_id LIMIT 1;
    SELECT id INTO ubicacion3_id FROM ubicaciones WHERE activa = true AND id NOT IN (ubicacion1_id, ubicacion2_id) LIMIT 1;
    
    -- Si no hay ubicaciones, crear algunas de prueba
    IF ubicacion1_id IS NULL THEN
        INSERT INTO ubicaciones (codigo, almacen, zona, pasillo, estante, nivel, posicion, tipo_ubicacion, capacidad_maxima, activa)
        VALUES 
            ('A01-P01-E01-N01-P01', 'ALMACEN_PRINCIPAL', 'ZONA_A', 'P01', 'E01', 'N01', 'P01', 'fija', 1000, true),
            ('A01-P01-E01-N02-P01', 'ALMACEN_PRINCIPAL', 'ZONA_A', 'P01', 'E01', 'N02', 'P01', 'fija', 1000, true),
            ('A01-P02-E01-N01-P01', 'ALMACEN_PRINCIPAL', 'ZONA_A', 'P02', 'E01', 'N01', 'P01', 'fija', 1000, true)
        RETURNING id INTO ubicacion1_id;
        
        SELECT id INTO ubicacion2_id FROM ubicaciones WHERE codigo = 'A01-P01-E01-N02-P01' LIMIT 1;
        SELECT id INTO ubicacion3_id FROM ubicaciones WHERE codigo = 'A01-P02-E01-N01-P01' LIMIT 1;
    END IF;

    -- Insertar conteos cíclicos de prueba con diferentes estados
    INSERT INTO conteos_ciclicos (id, numero_conteo, tipo_conteo, estado, fecha_programada, fecha_inicio, fecha_fin, contador_asignado, observaciones)
    VALUES 
        -- Conteo completado
        (conteo1_id, 'CC-2024-001', 'abc', 'completado', '2024-12-15', '2024-12-15 08:00:00+00', '2024-12-15 16:30:00+00', usuario1_id, 'Conteo cíclico mensual - Materiales clase A'),
        
        -- Conteo en proceso
        (conteo2_id, 'CC-2024-002', 'rotacion', 'en_proceso', '2024-12-18', '2024-12-18 09:00:00+00', NULL, usuario2_id, 'Conteo por rotación de inventario'),
        
        -- Conteos programados
        (conteo3_id, 'CC-2024-003', 'abc', 'programado', '2024-12-20', NULL, NULL, NULL, 'Conteo programado - Materiales clase B'),
        (conteo4_id, 'CC-2024-004', 'aleatorio', 'programado', '2024-12-22', NULL, NULL, NULL, 'Conteo aleatorio semanal'),
        (conteo5_id, 'CC-2024-005', 'ubicacion', 'programado', '2024-12-25', NULL, NULL, NULL, 'Conteo por ubicación - Zona A');

    -- Insertar detalles de conteos
    -- Detalles para conteo completado (CC-2024-001)
    INSERT INTO detalle_conteos (conteo_id, material_id, ubicacion_id, stock_teorico, stock_contado, diferencia, estado, observaciones)
    VALUES 
        (conteo1_id, material1_id, ubicacion1_id, 150, 148, -2, 'aprobado', 'Diferencia menor, ajuste aprobado'),
        (conteo1_id, material2_id, ubicacion1_id, 75, 75, 0, 'aprobado', 'Stock correcto'),
        (conteo1_id, material3_id, ubicacion2_id, 25, 27, 2, 'aprobado', 'Sobrante encontrado');

    -- Detalles para conteo en proceso (CC-2024-002)
    INSERT INTO detalle_conteos (conteo_id, material_id, ubicacion_id, stock_teorico, stock_contado, diferencia, estado, observaciones)
    VALUES 
        (conteo2_id, material2_id, ubicacion2_id, 100, 98, -2, 'contado', 'Pendiente de aprobación'),
        (conteo2_id, material4_id, ubicacion3_id, 15, NULL, NULL, 'pendiente', 'Pendiente de conteo');

    -- Detalles para conteos programados (solo stock teórico)
    INSERT INTO detalle_conteos (conteo_id, material_id, ubicacion_id, stock_teorico, stock_contado, diferencia, estado, observaciones)
    VALUES 
        (conteo3_id, material1_id, ubicacion2_id, 200, NULL, NULL, 'pendiente', 'Programado para conteo'),
        (conteo3_id, material3_id, ubicacion1_id, 30, NULL, NULL, 'pendiente', 'Programado para conteo'),
        (conteo4_id, material4_id, ubicacion1_id, 12, NULL, NULL, 'pendiente', 'Conteo aleatorio'),
        (conteo5_id, material1_id, ubicacion3_id, 80, NULL, NULL, 'pendiente', 'Conteo por ubicación'),
        (conteo5_id, material2_id, ubicacion3_id, 45, NULL, NULL, 'pendiente', 'Conteo por ubicación');

    RAISE NOTICE 'Datos de prueba para inventario cíclico insertados exitosamente';
    RAISE NOTICE 'Conteos creados: 5 (1 completado, 1 en proceso, 3 programados)';
    RAISE NOTICE 'Detalles de conteo creados: 10';
END $$;

-- Crear algunos índices para mejorar el rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_conteos_ciclicos_estado ON conteos_ciclicos(estado);
CREATE INDEX IF NOT EXISTS idx_conteos_ciclicos_fecha_programada ON conteos_ciclicos(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_conteos_ciclicos_tipo_conteo ON conteos_ciclicos(tipo_conteo);
CREATE INDEX IF NOT EXISTS idx_detalle_conteos_estado ON detalle_conteos(estado);
CREATE INDEX IF NOT EXISTS idx_detalle_conteos_conteo_id ON detalle_conteos(conteo_id);

-- Comentarios informativos
COMMENT ON TABLE conteos_ciclicos IS 'Tabla para gestionar conteos cíclicos de inventario con diferentes tipos y estados';
COMMENT ON TABLE detalle_conteos IS 'Detalles de cada conteo cíclico por material y ubicación';