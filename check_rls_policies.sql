-- Verificar políticas RLS para la tabla requerimientos
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'requerimientos';

-- Verificar permisos de roles para la tabla requerimientos
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name = 'requerimientos' 
    AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;