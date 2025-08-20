-- Eliminar la obra 'Edificio Residencial Los Pinos' con código OBR-2024-001
-- Primero eliminar todos los registros relacionados

-- Verificar que la obra existe y obtener su ID
SELECT id, codigo, nombre, estado 
FROM obras 
WHERE codigo = 'OBR-2024-001' OR nombre ILIKE '%Los Pinos%';

-- Eliminar registros relacionados en orden de dependencias
-- 1. Eliminar de route_deliveries
DELETE FROM route_deliveries 
WHERE obra_id IN (SELECT id FROM obras WHERE codigo = 'OBR-2024-001' OR nombre ILIKE '%Edificio Residencial Los Pinos%');

-- 2. Eliminar de salidas
DELETE FROM salidas 
WHERE obra_id IN (SELECT id FROM obras WHERE codigo = 'OBR-2024-001' OR nombre ILIKE '%Edificio Residencial Los Pinos%');

-- 3. Eliminar de entradas
DELETE FROM entradas 
WHERE obra_id IN (SELECT id FROM obras WHERE codigo = 'OBR-2024-001' OR nombre ILIKE '%Edificio Residencial Los Pinos%');

-- 4. Eliminar de ordenes_compra
DELETE FROM ordenes_compra 
WHERE obra_id IN (SELECT id FROM obras WHERE codigo = 'OBR-2024-001' OR nombre ILIKE '%Edificio Residencial Los Pinos%');

-- 5. Eliminar de solicitudes_compra
DELETE FROM solicitudes_compra 
WHERE obra_id IN (SELECT id FROM obras WHERE codigo = 'OBR-2024-001' OR nombre ILIKE '%Edificio Residencial Los Pinos%');

-- 6. Eliminar de requerimientos
DELETE FROM requerimientos 
WHERE obra_id IN (SELECT id FROM obras WHERE codigo = 'OBR-2024-001' OR nombre ILIKE '%Edificio Residencial Los Pinos%');

-- 7. Eliminar de stock_obra_material
DELETE FROM stock_obra_material 
WHERE obra_id IN (SELECT id FROM obras WHERE codigo = 'OBR-2024-001' OR nombre ILIKE '%Edificio Residencial Los Pinos%');

-- Finalmente eliminar la obra
DELETE FROM obras 
WHERE codigo = 'OBR-2024-001' OR nombre ILIKE '%Edificio Residencial Los Pinos%';

-- Verificar que se eliminó correctamente
SELECT COUNT(*) as obras_restantes FROM obras;
SELECT codigo, nombre FROM obras ORDER BY codigo;