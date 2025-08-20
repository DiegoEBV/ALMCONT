-- Verificar políticas RLS para la tabla obras
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

-- Verificar permisos de tabla para roles anon y authenticated
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name = 'obras' 
    AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;