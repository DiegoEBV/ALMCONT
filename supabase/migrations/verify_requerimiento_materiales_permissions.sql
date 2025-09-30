-- Verificar permisos y políticas RLS de la tabla requerimiento_materiales
-- después de aplicar las correcciones

-- 1. Verificar que RLS esté habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as rls_status
FROM pg_tables 
WHERE tablename = 'requerimiento_materiales';

-- 2. Verificar las políticas RLS existentes
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
WHERE tablename = 'requerimiento_materiales'
ORDER BY policyname;

-- 3. Verificar permisos de tabla para roles anon y authenticated
SELECT 
    grantee, 
    table_name, 
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'requerimiento_materiales' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY grantee, privilege_type;

-- 4. Verificar estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'requerimiento_materiales'
ORDER BY ordinal_position;

-- 5. Verificar si hay datos de prueba
SELECT COUNT(*) as total_requerimientos FROM requerimiento_materiales;

-- 6. Verificar contexto de autenticación actual
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- 7. Verificar usuarios existentes (para debug)
SELECT id, email, rol FROM usuarios LIMIT 5;