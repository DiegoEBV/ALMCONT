-- Verificar políticas RLS y permisos para las tablas del dashboard

-- 1. Verificar estado de RLS en las tablas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('requerimiento_materiales', 'entradas', 'salidas', 'stock_obra_material')
ORDER BY tablename;

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
WHERE schemaname = 'public' 
AND tablename IN ('requerimiento_materiales', 'entradas', 'salidas', 'stock_obra_material')
ORDER BY tablename, policyname;

-- 3. Verificar permisos de roles anon y authenticated
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
AND table_name IN ('requerimiento_materiales', 'entradas', 'salidas', 'stock_obra_material')
ORDER BY table_name, grantee;

-- 4. Crear políticas permisivas para permitir acceso a los datos del dashboard
-- Política para requerimiento_materiales (ya tiene RLS habilitado)
DROP POLICY IF EXISTS "dashboard_access_requerimiento_materiales" ON requerimiento_materiales;
CREATE POLICY "dashboard_access_requerimiento_materiales" 
ON requerimiento_materiales 
FOR SELECT 
TO authenticated, anon 
USING (true);

-- Habilitar RLS y crear políticas para las otras tablas
ALTER TABLE entradas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dashboard_access_entradas" ON entradas;
CREATE POLICY "dashboard_access_entradas" 
ON entradas 
FOR SELECT 
TO authenticated, anon 
USING (true);

ALTER TABLE salidas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dashboard_access_salidas" ON salidas;
CREATE POLICY "dashboard_access_salidas" 
ON salidas 
FOR SELECT 
TO authenticated, anon 
USING (true);

ALTER TABLE stock_obra_material ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dashboard_access_stock_obra_material" ON stock_obra_material;
CREATE POLICY "dashboard_access_stock_obra_material" 
ON stock_obra_material 
FOR SELECT 
TO authenticated, anon 
USING (true);

-- 5. Otorgar permisos básicos a los roles
GRANT SELECT ON requerimiento_materiales TO anon, authenticated;
GRANT SELECT ON entradas TO anon, authenticated;
GRANT SELECT ON salidas TO anon, authenticated;
GRANT SELECT ON stock_obra_material TO anon, authenticated;
GRANT SELECT ON obras TO anon, authenticated;
GRANT SELECT ON materiales TO anon, authenticated;
GRANT SELECT ON usuarios TO anon, authenticated;