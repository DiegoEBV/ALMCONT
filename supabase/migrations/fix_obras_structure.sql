-- Script para corregir la estructura de obras
-- Eliminar obras que son bloques y crear obra principal

-- Primero, crear la obra principal del proyecto CHAVIN
INSERT INTO obras (codigo, nombre, descripcion, estado, created_at, updated_at)
VALUES (
  'PROYECTO-CHAVIN',
  'Proyecto CHAVIN',
  'Proyecto principal de CHAVIN con múltiples bloques/ubicaciones',
  'ACTIVA',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (codigo) DO NOTHING;

-- Obtener el ID de la obra principal
DO $$
DECLARE
    obra_principal_id UUID;
    bloque_obra_id UUID;
    req_record RECORD;
BEGIN
    -- Obtener el ID de la obra principal
    SELECT id INTO obra_principal_id 
    FROM obras 
    WHERE codigo = 'PROYECTO-CHAVIN';
    
    -- Actualizar todos los requerimientos que apuntan a obras de bloques
    -- para que apunten a la obra principal
    FOR req_record IN 
        SELECT DISTINCT r.obra_id, o.nombre as obra_nombre
        FROM requerimientos r
        JOIN obras o ON r.obra_id = o.id
        WHERE o.codigo LIKE 'CHAVIN-%'
    LOOP
        -- Actualizar requerimientos para apuntar a la obra principal
        UPDATE requerimientos 
        SET obra_id = obra_principal_id,
            observaciones = CASE 
                WHEN observaciones IS NULL THEN 'Migrado desde: ' || req_record.obra_nombre
                ELSE observaciones || ' - Migrado desde: ' || req_record.obra_nombre
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE obra_id = req_record.obra_id;
        
        RAISE NOTICE 'Actualizados requerimientos de obra: %', req_record.obra_nombre;
    END LOOP;
    
    -- Eliminar las obras de bloques que ya no se usan
    DELETE FROM obras 
    WHERE codigo LIKE 'CHAVIN-%' 
    AND codigo != 'PROYECTO-CHAVIN';
    
    RAISE NOTICE 'Obras de bloques eliminadas exitosamente';
    RAISE NOTICE 'Obra principal creada: %', obra_principal_id;
END $$;

-- Verificar el resultado
SELECT 
    'Obras restantes' as tipo,
    COUNT(*) as cantidad
FROM obras 
WHERE codigo LIKE '%CHAVIN%'
UNION ALL
SELECT 
    'Requerimientos actualizados' as tipo,
    COUNT(*) as cantidad
FROM requerimientos r
JOIN obras o ON r.obra_id = o.id
WHERE o.codigo = 'PROYECTO-CHAVIN