-- Verificar restricciones de clave foránea que afectan la tabla obras
-- Esto nos ayudará a identificar qué tablas tienen referencias a obras

-- 1. Verificar restricciones de clave foránea que referencian la tabla obras
SELECT 
    tc.table_name AS referencing_table,
    kcu.column_name AS referencing_column,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column,
    tc.constraint_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'obras'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 2. Verificar si hay registros en las tablas que referencian obras
-- Esto nos ayudará a entender qué está bloqueando la eliminación

-- Contar usuarios asignados a obras
SELECT 'usuarios' as tabla, COUNT(*) as registros_con_obra_id
FROM usuarios 
WHERE obra_id IS NOT NULL;

-- Contar entradas por obra
SELECT 'entradas' as tabla, COUNT(*) as registros_con_obra_id
FROM entradas 
WHERE obra_id IS NOT NULL;

-- Contar salidas por obra
SELECT 'salidas' as tabla, COUNT(*) as registros_con_obra_id
FROM salidas 
WHERE obra_id IS NOT NULL;

-- Contar órdenes de compra por obra
SELECT 'ordenes_compra' as tabla, COUNT(*) as registros_con_obra_id
FROM ordenes_compra 
WHERE obra_id IS NOT NULL;

-- Contar stock por obra
SELECT 'stock_obra_material' as tabla, COUNT(*) as registros_con_obra_id
FROM stock_obra_material 
WHERE obra_id IS NOT NULL;

-- Contar requerimientos por obra
SELECT 'requerimiento_materiales' as tabla, COUNT(*) as registros_con_obra_id
FROM requerimiento_materiales 
WHERE obra_id IS NOT NULL;

-- Contar solicitudes de compra por obra
SELECT 'solicitudes_compra' as tabla, COUNT(*) as registros_con_obra_id
FROM solicitudes_compra 
WHERE obra_id IS NOT NULL;

-- 3. Verificar si hay configuraciones CASCADE en las restricciones
SELECT 
    tc.table_name,
    tc.constraint_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND rc.delete_rule != 'NO ACTION'
ORDER BY tc.table_name;