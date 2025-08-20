-- Insertar obras de prueba para verificar la funcionalidad

-- Limpiar datos existentes si los hay
DELETE FROM obras WHERE codigo IN ('OBR-001', 'OBR-002', 'OBR-003');

-- Insertar obras de prueba
INSERT INTO obras (codigo, nombre, descripcion, ubicacion, fecha_inicio, fecha_fin_estimada, estado, presupuesto)
VALUES 
    ('OBR-001', 'Edificio Los Pinos', 'Construcción de edificio residencial de 10 pisos', 'Av. Los Pinos 123, Lima', '2024-01-15', '2024-12-15', 'ACTIVA', 2500000.00),
    ('OBR-002', 'Centro Comercial Plaza Norte', 'Construcción de centro comercial con 3 niveles', 'Av. Túpac Amaru 210, Lima', '2024-02-01', '2025-01-31', 'ACTIVA', 5000000.00),
    ('OBR-003', 'Puente Vehicular San Juan', 'Construcción de puente vehicular sobre río', 'Distrito San Juan de Lurigancho', '2024-03-01', '2024-11-30', 'PAUSADA', 1800000.00);

-- Verificar que se insertaron correctamente
SELECT codigo, nombre, estado, presupuesto FROM obras ORDER BY codigo;