-- Agregar datos de prueba para el sistema de reorden automático
-- Fecha: 2024-01-20

-- Insertar configuraciones de reorden para materiales existentes
INSERT INTO configuracion_reorden (
    material_id, 
    stock_minimo, 
    punto_reorden, 
    cantidad_reorden, 
    lead_time_dias, 
    activo
)
SELECT 
    m.id,
    CASE 
        WHEN m.codigo = 'MAT-001' THEN 20
        WHEN m.codigo = 'MAT-002' THEN 30
        WHEN m.codigo = 'MAT-003' THEN 500
        WHEN m.codigo = 'MAT-004' THEN 5
        WHEN m.codigo = 'MAT-005' THEN 5
        ELSE 10
    END as stock_minimo,
    CASE 
        WHEN m.codigo = 'MAT-001' THEN 50
        WHEN m.codigo = 'MAT-002' THEN 80
        WHEN m.codigo = 'MAT-003' THEN 1000
        WHEN m.codigo = 'MAT-004' THEN 15
        WHEN m.codigo = 'MAT-005' THEN 15
        ELSE 25
    END as punto_reorden,
    CASE 
        WHEN m.codigo = 'MAT-001' THEN 100
        WHEN m.codigo = 'MAT-002' THEN 150
        WHEN m.codigo = 'MAT-003' THEN 2000
        WHEN m.codigo = 'MAT-004' THEN 30
        WHEN m.codigo = 'MAT-005' THEN 30
        ELSE 50
    END as cantidad_reorden,
    7 as lead_time_dias,
    true as activo
FROM materiales m
WHERE m.activo = true
ON CONFLICT (material_id) DO UPDATE SET
    stock_minimo = EXCLUDED.stock_minimo,
    punto_reorden = EXCLUDED.punto_reorden,
    cantidad_reorden = EXCLUDED.cantidad_reorden,
    lead_time_dias = EXCLUDED.lead_time_dias,
    activo = EXCLUDED.activo;

-- Crear registros de stock para simular necesidad de reorden
-- Primero obtenemos una obra existente
DO $$
DECLARE
    obra_id_var UUID;
    mat_id UUID;
BEGIN
    -- Obtener una obra existente
    SELECT id INTO obra_id_var FROM obras LIMIT 1;
    
    -- Si no hay obras, crear una de prueba
    IF obra_id_var IS NULL THEN
        INSERT INTO obras (codigo, nombre, descripcion, estado)
        VALUES ('OBRA-TEST', 'Obra de Prueba', 'Obra para pruebas del sistema de reorden', 'ACTIVA')
        RETURNING id INTO obra_id_var;
    END IF;
    
    -- Insertar stock para materiales de prueba
    FOR mat_id IN 
        SELECT id FROM materiales WHERE codigo IN ('MAT-001', 'MAT-002', 'MAT-003', 'MAT-004', 'MAT-005')
    LOOP
        INSERT INTO stock_obra_material (obra_id, material_id, stock_actual, costo_promedio)
        VALUES (
            obra_id_var,
            mat_id,
            CASE 
                WHEN (SELECT codigo FROM materiales WHERE id = mat_id) = 'MAT-001' THEN 8   -- Por debajo del punto de reorden (10)
                WHEN (SELECT codigo FROM materiales WHERE id = mat_id) = 'MAT-002' THEN 45  -- Por debajo del punto de reorden (50)
                WHEN (SELECT codigo FROM materiales WHERE id = mat_id) = 'MAT-003' THEN 800 -- Por debajo del punto de reorden (1000)
                WHEN (SELECT codigo FROM materiales WHERE id = mat_id) = 'MAT-004' THEN 12  -- Por encima del punto de reorden
                WHEN (SELECT codigo FROM materiales WHERE id = mat_id) = 'MAT-005' THEN 18  -- Por encima del punto de reorden
                ELSE 0
            END,
            100.00
        )
        ON CONFLICT (obra_id, material_id) 
        DO UPDATE SET 
            stock_actual = EXCLUDED.stock_actual,
            costo_promedio = EXCLUDED.costo_promedio;
    END LOOP;
END $$;

-- Verificar que la vista materiales_requieren_reorden funciona correctamente
SELECT 
    codigo,
    nombre,
    stock_actual,
    stock_minimo,
    punto_reorden,
    cantidad_reorden,
    proveedor_preferido
FROM materiales_requieren_reorden
ORDER BY codigo;