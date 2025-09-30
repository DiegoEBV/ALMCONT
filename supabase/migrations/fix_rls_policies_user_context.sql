-- Crear función auxiliar para verificar permisos de coordinación
CREATE OR REPLACE FUNCTION user_has_coordination_access()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM usuarios 
        WHERE id = get_current_user_id()
        AND rol IN ('COORDINACION', 'LOGISTICA')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION user_has_coordination_access() TO anon, authenticated;

-- Habilitar RLS en solicitudes_compra si no está habilitado
ALTER TABLE solicitudes_compra ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "coordinacion_full_access" ON solicitudes_compra;
DROP POLICY IF EXISTS "user_own_solicitudes" ON solicitudes_compra;

-- Crear política simple para coordinación que permita todo acceso
CREATE POLICY "coordinacion_full_access" ON solicitudes_compra
    FOR ALL USING (user_has_coordination_access());

-- Crear política para que los usuarios vean sus propias solicitudes
CREATE POLICY "user_own_solicitudes" ON solicitudes_compra
    FOR SELECT USING (created_by = get_current_user_id());

-- Otorgar permisos básicos a los roles
GRANT SELECT ON solicitudes_compra TO anon;
GRANT ALL PRIVILEGES ON solicitudes_compra TO authenticated;

-- Comentario sobre las políticas
COMMENT ON POLICY "coordinacion_full_access" ON solicitudes_compra IS 'Permite acceso completo a usuarios de coordinación y logística';
COMMENT ON POLICY "user_own_solicitudes" ON solicitudes_compra IS 'Permite a usuarios ver sus propias solicitudes';