-- Insertar obras de ejemplo para testing
INSERT INTO obras (codigo, nombre, descripcion, ubicacion, fecha_inicio, fecha_fin_estimada, estado, presupuesto) VALUES
('OBR-001', 'Construcción Edificio Central', 'Construcción del edificio principal de oficinas', 'Lima Centro', '2024-01-15', '2024-12-31', 'ACTIVA', 500000.00),
('OBR-002', 'Remodelación Almacén Norte', 'Ampliación y modernización del almacén norte', 'Lima Norte', '2024-02-01', '2024-08-30', 'ACTIVA', 150000.00),
('OBR-003', 'Proyecto Residencial Las Flores', 'Construcción de complejo residencial', 'San Isidro', '2024-03-01', '2025-02-28', 'ACTIVA', 800000.00),
('OBR-004', 'Mantenimiento Planta Industrial', 'Mantenimiento preventivo de equipos industriales', 'Callao', '2024-01-01', '2024-06-30', 'PAUSADA', 75000.00),
('OBR-005', 'Centro Comercial Plaza Sur', 'Construcción de centro comercial', 'Lima Sur', '2023-06-01', '2024-05-31', 'FINALIZADA', 1200000.00);

-- Verificar que se insertaron correctamente
SELECT codigo, nombre, estado FROM obras ORDER BY codigo;