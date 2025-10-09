-- =====================================================
-- MIGRACIÓN: Corregir tamaño de columna estado en prestamos_materiales
-- =====================================================

-- Modificar la columna estado para permitir valores más largos
ALTER TABLE prestamos_materiales 
ALTER COLUMN estado TYPE VARCHAR(30);

-- Actualizar la restricción CHECK para incluir el nuevo tamaño
ALTER TABLE prestamos_materiales 
DROP CONSTRAINT IF EXISTS prestamos_materiales_estado_check;

ALTER TABLE prestamos_materiales 
ADD CONSTRAINT prestamos_materiales_estado_check 
CHECK (estado IN ('solicitado', 'aprobado', 'entregado', 'parcialmente_devuelto', 'devuelto_completo', 'vencido', 'cancelado'));