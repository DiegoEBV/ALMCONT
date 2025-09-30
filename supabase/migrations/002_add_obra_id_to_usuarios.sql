-- =====================================================
-- MIGRACIÓN: Agregar campo obra_id a tabla usuarios
-- Fecha: 2025-01-27
-- Descripción: Agregar relación entre usuarios y obras asignadas
-- =====================================================

-- Agregar columna obra_id a la tabla usuarios
ALTER TABLE usuarios 
ADD COLUMN obra_id UUID REFERENCES obras(id);

-- Crear índice para optimizar consultas
CREATE INDEX idx_usuarios_obra_id ON usuarios(obra_id);

-- Comentario para documentar el campo
COMMENT ON COLUMN usuarios.obra_id IS 'Obra asignada al usuario (especialmente para almaceneros)';