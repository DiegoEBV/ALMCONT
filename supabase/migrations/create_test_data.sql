-- Crear datos de prueba para el dashboard
-- Primero obtenemos un usuario existente para usar como solicitante

-- Insertar datos en requerimiento_materiales usando el primer usuario disponible
INSERT INTO requerimiento_materiales (codigo, solicitante_id, estado, comentarios, fecha_solicitud) 
SELECT 
    'REQ-001',
    u.id,
    'PENDIENTE',
    'Requerimiento de materiales para obra principal',
    '2024-01-15'
FROM usuarios u 
LIMIT 1;

INSERT INTO requerimiento_materiales (codigo, solicitante_id, estado, comentarios, fecha_solicitud) 
SELECT 
    'REQ-002',
    u.id,
    'APROBADO',
    'Materiales urgentes para construcción',
    '2024-01-14'
FROM usuarios u 
LIMIT 1;

INSERT INTO requerimiento_materiales (codigo, solicitante_id, estado, comentarios, fecha_solicitud) 
SELECT 
    'REQ-003',
    u.id,
    'PENDIENTE',
    'Solicitud de herramientas adicionales',
    '2024-01-13'
FROM usuarios u 
LIMIT 1;

-- Insertar datos en obras si no existen
INSERT INTO obras (codigo, nombre, ubicacion, estado) VALUES
('OBR-001', 'Obra Principal', 'Av. Principal 123', 'ACTIVA'),
('OBR-002', 'Obra Secundaria', 'Calle Secundaria 456', 'ACTIVA')
ON CONFLICT (codigo) DO NOTHING;

-- Insertar datos en materiales si no existen
INSERT INTO materiales (codigo, nombre, categoria, unidad_medida, precio_referencial, created_by) 
SELECT 
    'MAT-001',
    'Cemento Portland',
    'CONSTRUCCION',
    'bolsa',
    25.50,
    u.id
FROM usuarios u 
LIMIT 1
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO materiales (codigo, nombre, categoria, unidad_medida, precio_referencial, created_by) 
SELECT 
    'MAT-002',
    'Varilla de acero 12mm',
    'CONSTRUCCION',
    'unidad',
    45.00,
    u.id
FROM usuarios u 
LIMIT 1
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO materiales (codigo, nombre, categoria, unidad_medida, precio_referencial, created_by) 
SELECT 
    'MAT-003',
    'Ladrillo común',
    'CONSTRUCCION',
    'millar',
    180.00,
    u.id
FROM usuarios u 
LIMIT 1
ON CONFLICT (codigo) DO NOTHING;

-- Insertar stock con algunos items con stock bajo
INSERT INTO stock_obra_material (obra_id, material_id, stock_actual, stock_minimo, stock_maximo) 
SELECT 
    o.id as obra_id,
    m.id as material_id,
    CASE 
        WHEN m.codigo = 'MAT-001' THEN 5  -- Stock bajo
        WHEN m.codigo = 'MAT-002' THEN 8  -- Stock bajo
        ELSE 50
    END as stock_actual,
    10 as stock_minimo,
    100 as stock_maximo
FROM obras o
CROSS JOIN materiales m
WHERE o.codigo IN ('OBR-001', 'OBR-002')
AND m.codigo IN ('MAT-001', 'MAT-002', 'MAT-003')
ON CONFLICT (obra_id, material_id) DO UPDATE SET
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    stock_maximo = EXCLUDED.stock_maximo;

-- Insertar algunas entradas recientes con obra_id y fecha_entrada requeridos
INSERT INTO entradas (numero_entrada, obra_id, fecha_entrada, proveedor, recibido_por) 
SELECT 
    'ENT-001',
    o.id,
    '2024-01-15',
    'Proveedor ABC',
    u.id
FROM usuarios u, obras o
WHERE o.codigo = 'OBR-001'
LIMIT 1;

INSERT INTO entradas (numero_entrada, obra_id, fecha_entrada, proveedor, recibido_por) 
SELECT 
    'ENT-002',
    o.id,
    '2024-01-14',
    'Constructora XYZ',
    u.id
FROM usuarios u, obras o
WHERE o.codigo = 'OBR-001'
LIMIT 1;

INSERT INTO entradas (numero_entrada, obra_id, fecha_entrada, proveedor, recibido_por) 
SELECT 
    'ENT-003',
    o.id,
    '2024-01-13',
    'Materiales del Norte',
    u.id
FROM usuarios u, obras o
WHERE o.codigo = 'OBR-002'
LIMIT 1;

-- Insertar algunas salidas con campos requeridos
INSERT INTO salidas (numero_salida, obra_id, fecha_salida, area_destino, solicitado_por, entregado_por) 
SELECT 
    'SAL-001',
    o.id,
    '2024-01-15',
    'Área de Construcción',
    u.id,
    u.id
FROM usuarios u, obras o
WHERE o.codigo = 'OBR-001'
LIMIT 1;

INSERT INTO salidas (numero_salida, obra_id, fecha_salida, area_destino, solicitado_por, entregado_por) 
SELECT 
    'SAL-002',
    o.id,
    '2024-01-14',
    'Área de Acabados',
    u.id,
    u.id
FROM usuarios u, obras o
WHERE o.codigo = 'OBR-002'
LIMIT 1;