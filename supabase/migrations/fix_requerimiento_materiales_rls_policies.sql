-- Verificar y corregir las políticas RLS para la tabla requerimiento_materiales
-- Esto permitirá que los usuarios autenticados puedan crear requerimientos

-- Primero, eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Users can insert their own requerimientos" ON requerimiento_materiales;
DROP POLICY IF EXISTS "Users can view their own requerimientos" ON requerimiento_materiales;
DROP POLICY IF EXISTS "Users can update their own requerimientos" ON requerimiento_materiales;
DROP POLICY IF EXISTS "Admins can view all requerimientos" ON requerimiento_materiales;
DROP POLICY IF EXISTS "Admins can update all requerimientos" ON requerimiento_materiales;

-- Crear políticas RLS para permitir operaciones necesarias

-- Política para permitir INSERT: Los usuarios autenticados pueden crear requerimientos
CREATE POLICY "authenticated_users_can_insert_requerimientos" 
ON requerimiento_materiales 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = solicitante_id::uuid);

-- Política para permitir SELECT: Los usuarios pueden ver sus propios requerimientos
CREATE POLICY "users_can_view_own_requerimientos" 
ON requerimiento_materiales 
FOR SELECT 
TO authenticated 
USING (auth.uid() = solicitante_id::uuid);

-- Política para permitir UPDATE: Los usuarios pueden actualizar sus propios requerimientos
CREATE POLICY "users_can_update_own_requerimientos" 
ON requerimiento_materiales 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = solicitante_id::uuid)
WITH CHECK (auth.uid() = solicitante_id::uuid);

-- Política adicional para administradores (si existe un rol admin)
-- Los administradores pueden ver y actualizar todos los requerimientos
CREATE POLICY "admins_can_manage_all_requerimientos" 
ON requerimiento_materiales 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id::uuid = auth.uid() 
    AND rol = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id::uuid = auth.uid() 
    AND rol = 'ADMIN'
  )
);

-- Asegurar que la tabla tenga RLS habilitado
ALTER TABLE requerimiento_materiales ENABLE ROW LEVEL SECURITY;

-- Otorgar permisos básicos a los roles
GRANT SELECT, INSERT, UPDATE ON requerimiento_materiales TO authenticated;
GRANT SELECT ON requerimiento_materiales TO anon;

-- Verificar las políticas creadas
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

-- Verificar permisos de la tabla
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'requerimiento_materiales' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;