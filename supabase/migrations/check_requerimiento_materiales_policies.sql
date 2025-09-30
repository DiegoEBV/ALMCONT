-- Verificar políticas RLS para la tabla requerimiento_materiales

-- 1. Verificar si RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'requerimiento_materiales';

-- 2. Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'requerimiento_materiales';

-- 3. Verificar permisos de tabla para roles anon y authenticated
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name = 'requerimiento_materiales' 
    AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- 4. Verificar el contexto actual del usuario
SELECT 
    current_user,
    session_user,
    current_setting('request.jwt.claims', true) as jwt_claims;

-- 5. Verificar si hay datos en la tabla
SELECT COUNT(*) as total_records FROM requerimiento_materiales;

-- 6. Intentar una consulta SELECT para verificar acceso de lectura
SELECT id, codigo, estado FROM requerimiento_materiales LIMIT 5;