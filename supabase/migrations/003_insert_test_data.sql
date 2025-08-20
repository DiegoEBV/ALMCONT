-- Inserción de datos de prueba para el sistema de almacén
-- Sistema de Almacén de Obra

-- Insertar usuarios de prueba con diferentes roles
INSERT INTO usuarios (id, email, nombre, apellido, rol, activo) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'coordinador@obra.com', 'Juan Carlos', 'Pérez', 'COORDINACION', true),
('550e8400-e29b-41d4-a716-446655440002', 'logistica@obra.com', 'María Elena', 'González', 'LOGISTICA', true),
('550e8400-e29b-41d4-a716-446655440003', 'almacenero@obra.com', 'Pedro Luis', 'Martínez', 'ALMACENERO', true);

-- Insertar obras de prueba
INSERT INTO obras (id, codigo, nombre, descripcion, ubicacion, fecha_inicio, fecha_fin_estimada, estado, responsable_id) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'OBR-2024-001', 'Edificio Residencial Los Pinos', 'Construcción de edificio residencial de 15 pisos', 'Av. Principal 123, La Paz', '2024-01-15', '2025-06-30', 'ACTIVA', '550e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440002', 'OBR-2024-002', 'Centro Comercial Plaza Norte', 'Centro comercial de 3 niveles con estacionamiento', 'Zona Norte, El Alto', '2024-03-01', '2025-12-15', 'ACTIVA', '550e8400-e29b-41d4-a716-446655440001');

-- Insertar materiales de prueba
INSERT INTO materiales (id, codigo, nombre, descripcion, unidad_medida, categoria, precio_referencial, activo) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'CEM-001', 'Cemento Portland IP', 'Cemento Portland puzolánico tipo IP', 'BOLSA', 'CEMENTO', 52.00, true),
('770e8400-e29b-41d4-a716-446655440002', 'HIE-001', 'Fierro corrugado 12mm', 'Varilla de acero corrugado de 12mm x 12m', 'VARILLA', 'FIERRO', 45.50, true),
('770e8400-e29b-41d4-a716-446655440003', 'AGR-001', 'Arena fina', 'Arena fina para construcción', 'M3', 'AGREGADOS', 120.00, true),
('770e8400-e29b-41d4-a716-446655440004', 'LAD-001', 'Ladrillo gambote 6H', 'Ladrillo gambote de 6 huecos', 'UNIDAD', 'LADRILLO', 1.20, true);

-- Insertar requerimientos de prueba
INSERT INTO requerimientos (
    id, obra_id, numero_rq, fecha_requerimiento, fecha_necesidad, solicitante, area_solicitante, 
    justificacion, prioridad, estado, created_by
) VALUES
('880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'RQ-2024-001', '2024-01-20', '2024-01-25', 'Ing. Carlos Mendoza', 'ESTRUCTURA', 'Materiales para fundación del edificio', 'ALTA', 'PENDIENTE', '550e8400-e29b-41d4-a716-446655440001'),
('880e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'RQ-2024-002', '2024-01-22', '2024-01-30', 'Ing. Ana Vargas', 'ALBAÑILERIA', 'Materiales para muros del primer piso', 'MEDIA', 'APROBADO', '550e8400-e29b-41d4-a716-446655440001');

-- Insertar items de requerimientos
INSERT INTO requerimiento_items (
    id, requerimiento_id, material_id, cantidad_solicitada, precio_estimado, observaciones
) VALUES
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 200.00, 52.00, 'Para fundación corrida'),
('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440002', 50.00, 45.50, 'Fierro para zapatas'),
('990e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440004', 5000.00, 1.20, 'Ladrillos para muros'),
('990e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 80.00, 52.00, 'Cemento para mortero');

-- Insertar stock inicial
INSERT INTO stock_obra_material (
    id, obra_id, material_id, stock_actual, stock_minimo, stock_maximo, ubicacion_principal
) VALUES
('110e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 0.00, 20.00, 200.00, 'Almacén A - Sector 1'),
('110e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440002', 0.00, 10.00, 100.00, 'Almacén A - Sector 2'),
('110e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440003', 0.00, 5.00, 50.00, 'Almacén A - Sector 3'),
('110e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440004', 0.00, 1000.00, 10000.00, 'Almacén A - Sector 4');

-- Comentarios sobre los datos de prueba
COMMENT ON TABLE usuarios IS 'Usuarios de prueba: coordinador@obra.com, logistica@obra.com, almacenero@obra.com (password: 123456)';
COMMENT ON TABLE obras IS 'Dos obras de prueba: Edificio Los Pinos y Centro Comercial Plaza Norte';
COMMENT ON TABLE materiales IS 'Materiales básicos de construcción: cemento, fierro, agregados, ladrillos';
COMMENT ON TABLE requerimientos IS 'Requerimientos de prueba con diferentes estados y prioridades';
COMMENT ON TABLE stock_obra_material IS 'Stock inicial vacío para testing del sistema de almacén';