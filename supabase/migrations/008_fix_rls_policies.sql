-- Configurar políticas RLS para acceso público a obras y materiales

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "obras_select_policy" ON obras;
DROP POLICY IF EXISTS "obras_all_policy" ON obras;
DROP POLICY IF EXISTS "materiales_select_policy" ON materiales;
DROP POLICY IF EXISTS "materiales_all_policy" ON materiales;

-- Crear políticas más permisivas para obras
CREATE POLICY "obras_select_all" ON obras
    FOR SELECT
    USING (true); -- Permitir lectura a todos

CREATE POLICY "obras_modify_authenticated" ON obras
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Crear políticas más permisivas para materiales
CREATE POLICY "materiales_select_all" ON materiales
    FOR SELECT
    USING (true); -- Permitir lectura a todos

CREATE POLICY "materiales_modify_authenticated" ON materiales
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Verificar que RLS esté habilitado
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;

-- Otorgar permisos explícitos
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON obras TO anon;
GRANT ALL ON obras TO authenticated;
GRANT SELECT ON materiales TO anon;
GRANT ALL ON materiales TO authenticated;

-- Verificar datos
DO $$
DECLARE
    obras_count INTEGER;
    materiales_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO obras_count FROM obras;
    SELECT COUNT(*) INTO materiales_count FROM materiales;
    
    RAISE NOTICE 'Verificación final:';
    RAISE NOTICE '- Obras: %', obras_count;
    RAISE NOTICE '- Materiales: %', materiales_count;
END $$;