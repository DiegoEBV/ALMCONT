-- Insertar materiales de ejemplo para el sistema de almacén
-- Fecha: 2024-01-15

-- Insertar materiales de construcción
INSERT INTO materiales (codigo, nombre, descripcion, categoria, subcategoria, unidad_medida, precio_referencial, stock_minimo, activo)
VALUES 
  ('MAT-001', 'Cemento Portland Tipo I', 'Cemento Portland Tipo I de 42.5 kg', 'Construcción', 'Cementos', 'Bolsa', 25.50, 50, true),
  ('MAT-002', 'Fierro Corrugado 1/2"', 'Varilla de fierro corrugado de 1/2 pulgada x 9m', 'Construcción', 'Fierros', 'Varilla', 35.80, 100, true),
  ('MAT-003', 'Ladrillo King Kong 18 huecos', 'Ladrillo de arcilla cocida 18 huecos', 'Construcción', 'Ladrillos', 'Unidad', 0.85, 1000, true),
  ('MAT-004', 'Arena Gruesa', 'Arena gruesa para concreto', 'Construcción', 'Agregados', 'm3', 45.00, 10, true),
  ('MAT-005', 'Piedra Chancada 3/4"', 'Piedra chancada de 3/4 pulgada', 'Construcción', 'Agregados', 'm3', 55.00, 10, true),
  ('MAT-006', 'Tubo PVC 4" Desagüe', 'Tubo PVC de 4 pulgadas para desagüe x 3m', 'Sanitarios', 'Tuberías', 'Unidad', 18.50, 20, true),
  ('MAT-007', 'Cable THW 12 AWG', 'Cable eléctrico THW calibre 12 AWG', 'Eléctricos', 'Cables', 'Metro', 3.20, 500, true),
  ('MAT-008', 'Pintura Látex Blanco', 'Pintura látex color blanco para interiores', 'Pinturas', 'Látex', 'Galón', 65.00, 15, true),
  ('MAT-009', 'Tornillo Tirafondo 3"', 'Tornillo tirafondo de 3 pulgadas', 'Ferretería', 'Tornillos', 'Unidad', 0.75, 200, true),
  ('MAT-010', 'Pegamento PVC', 'Pegamento para tuberías PVC', 'Sanitarios', 'Accesorios', 'Frasco', 12.50, 25, true);

-- Verificar que los materiales se insertaron correctamente
SELECT COUNT(*) as total_materiales FROM materiales WHERE activo = true;

-- Mostrar los materiales insertados
SELECT codigo, nombre, categoria, unidad_medida, precio_referencial 
FROM materiales 
WHERE activo = true 
ORDER BY categoria, nombre;