-- Verificar permisos actuales para la tabla obras
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'obras' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Otorgar permisos de lectura a los roles anon y authenticated
GRANT SELECT ON obras TO anon;
GRANT ALL PRIVILEGES ON obras TO authenticated;

-- Verificar permisos después de otorgarlos
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'obras' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Crear política RLS para permitir lectura de obras
DROP POLICY IF EXISTS "Allow read access to obras" ON obras;
CREATE POLICY "Allow read access to obras" ON obras
    FOR SELECT
    USING (true);

-- Crear política RLS para permitir inserción/actualización a usuarios autenticados
DROP POLICY IF EXISTS "Allow authenticated users to manage obras" ON obras;
CREATE POLICY "Allow authenticated users to manage obras" ON obras
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);