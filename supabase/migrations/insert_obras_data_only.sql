-- Insertar obras de ejemplo para testing (solo datos)
INSERT INTO obras (codigo, nombre, descripcion, ubicacion, fecha_inicio, fecha_fin_estimada, estado, presupuesto) VALUES
('OBRA-001', 'Construcción Edificio Central', 'Construcción del edificio principal del complejo', 'Lima, Perú', '2024-01-15', '2024-12-31', 'ACTIVA', 500000.00),
('OBRA-002', 'Remodelación Oficinas Norte', 'Remodelación completa de las oficinas del sector norte', 'Callao, Perú', '2024-02-01', '2024-08-30', 'ACTIVA', 150000.00),
('OBRA-003', 'Ampliación Almacén Sur', 'Ampliación del almacén principal en el sector sur', 'San Juan de Lurigancho, Lima', '2024-03-01', '2024-10-15', 'ACTIVA', 200000.00),
('OBRA-004', 'Instalación Sistema Eléctrico', 'Instalación del nuevo sistema eléctrico en toda la planta', 'Villa El Salvador, Lima', '2024-01-20', '2024-06-30', 'PAUSADA', 75000.00),
('OBRA-005', 'Construcción Área Recreativa', 'Construcción de área recreativa para empleados', 'Miraflores, Lima', '2023-11-01', '2024-04-30', 'FINALIZADA', 80000.00)
ON CONFLICT (codigo) DO NOTHING;