-- Verificar políticas RLS existentes para la tabla obras
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'obras';

-- Verificar permisos de tabla para roles anon y authenticated
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'obras'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Otorgar permisos completos a authenticated para operaciones CRUD
GRANT ALL PRIVILEGES ON obras TO authenticated;

-- Crear políticas RLS para permitir operaciones a usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver obras" ON obras;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear obras" ON obras;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar obras" ON obras;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar obras" ON obras;

-- Política para SELECT (ver obras)
CREATE POLICY "Usuarios autenticados pueden ver obras" ON obras
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para INSERT (crear obras)
CREATE POLICY "Usuarios autenticados pueden crear obras" ON obras
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política para UPDATE (actualizar obras)
CREATE POLICY "Usuarios autenticados pueden actualizar obras" ON obras
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política para DELETE (eliminar obras)
CREATE POLICY "Usuarios autenticados pueden eliminar obras" ON obras
    FOR DELETE
    TO authenticated
    USING (true);

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'obras'
ORDER BY policyname;