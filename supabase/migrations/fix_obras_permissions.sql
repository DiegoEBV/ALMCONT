-- Verificar y corregir permisos para la tabla obras

-- Otorgar permisos básicos a los roles anon y authenticated
GRANT SELECT ON obras TO anon;
GRANT ALL PRIVILEGES ON obras TO authenticated;

-- Crear políticas RLS para permitir operaciones CRUD
-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "obras_select_policy" ON obras;
DROP POLICY IF EXISTS "obras_insert_policy" ON obras;
DROP POLICY IF EXISTS "obras_update_policy" ON obras;
DROP POLICY IF EXISTS "obras_delete_policy" ON obras;

-- Política para SELECT (lectura) - permitir a usuarios autenticados
CREATE POLICY "obras_select_policy" ON obras
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para INSERT (creación) - permitir a usuarios autenticados
CREATE POLICY "obras_insert_policy" ON obras
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política para UPDATE (actualización) - permitir a usuarios autenticados
CREATE POLICY "obras_update_policy" ON obras
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política para DELETE (eliminación) - permitir a usuarios autenticados
CREATE POLICY "obras_delete_policy" ON obras
    FOR DELETE
    TO authenticated
    USING (true);

-- Verificar que RLS esté habilitado
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;

-- Mostrar las políticas creadas
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'obras';

-- Verificar permisos otorgados
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name = 'obras' 
    AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;