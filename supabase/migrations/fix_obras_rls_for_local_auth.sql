-- Solución para permitir operaciones CRUD en obras con autenticación local
-- El problema: RLS está configurado solo para 'authenticated' pero usamos autenticación local

-- Otorgar permisos completos a usuarios anónimos (anon) para operaciones CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON obras TO anon;
GRANT ALL PRIVILEGES ON obras TO authenticated;

-- Eliminar políticas restrictivas existentes
DROP POLICY IF EXISTS "obras_select_policy" ON obras;
DROP POLICY IF EXISTS "obras_insert_policy" ON obras;
DROP POLICY IF EXISTS "obras_update_policy" ON obras;
DROP POLICY IF EXISTS "obras_delete_policy" ON obras;

-- Crear políticas permisivas para usuarios anónimos y autenticados
-- Política para SELECT (lectura) - permitir a todos
CREATE POLICY "obras_select_policy" ON obras
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Política para INSERT (creación) - permitir a todos
CREATE POLICY "obras_insert_policy" ON obras
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Política para UPDATE (actualización) - permitir a todos
CREATE POLICY "obras_update_policy" ON obras
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Política para DELETE (eliminación) - permitir a todos
CREATE POLICY "obras_delete_policy" ON obras
    FOR DELETE
    TO anon, authenticated
    USING (true);

-- Mantener RLS habilitado pero con políticas permisivas
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;

-- Verificar las políticas creadas
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