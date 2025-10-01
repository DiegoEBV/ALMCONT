-- Agregar usuario de prueba con rol PRODUCCION
-- Sistema de Almacén de Obra

-- Insertar usuario de producción
INSERT INTO usuarios (id, email, nombre, apellido, rol, activo) VALUES
('550e8400-e29b-41d4-a716-446655440004', 'produccion@obra.com', 'Carlos', 'Ingeniero', 'PRODUCCION', true);

-- Comentario sobre el nuevo usuario
COMMENT ON TABLE usuarios IS 'Usuarios de prueba: coordinador@obra.com, logistica@obra.com, almacenero@obra.com, produccion@obra.com (password: password123)';