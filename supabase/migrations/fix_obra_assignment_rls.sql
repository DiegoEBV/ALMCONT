-- Migración para corregir las políticas RLS y permisos de asignación de obras
-- Fecha: 2024-12-30
-- Descripción: Corrige los permisos para permitir la asignación correcta de obras a usuarios

-- 1. Verificar el estado actual de RLS
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('usuarios', 'obras');

-- 2. Verificar políticas existentes
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('usuarios', 'obras');

-- 3. Verificar permisos de roles actuales
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name IN ('usuarios', 'obras') 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- 4. Habilitar RLS en la tabla usuarios si no está habilitado
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- 5. Eliminar políticas existentes que puedan estar causando conflictos
DROP POLICY IF EXISTS "usuarios_select_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_policy" ON usuarios;

DROP POLICY IF EXISTS "obras_select_policy" ON obras;
DROP POLICY IF EXISTS "obras_update_policy" ON obras;
DROP POLICY IF EXISTS "obras_insert_policy" ON obras;

-- 6. Crear políticas RLS para la tabla usuarios
-- Permitir a usuarios autenticados ver todos los usuarios
CREATE POLICY "usuarios_select_policy" ON usuarios
    FOR SELECT
    TO authenticated
    USING (true);

-- Permitir a usuarios autenticados actualizar su propia información y a coordinadores actualizar otros usuarios
CREATE POLICY "usuarios_update_policy" ON usuarios
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid()::text = id::text OR 
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id::text = auth.uid()::text 
            AND u.rol = 'COORDINACION'
        )
    );

-- Permitir a coordinadores insertar nuevos usuarios
CREATE POLICY "usuarios_insert_policy" ON usuarios
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id::text = auth.uid()::text 
            AND u.rol = 'COORDINACION'
        )
    );

-- 7. Crear políticas RLS para la tabla obras
-- Permitir a usuarios autenticados ver todas las obras
CREATE POLICY "obras_select_policy" ON obras
    FOR SELECT
    TO authenticated
    USING (true);

-- Permitir a coordinadores y responsables actualizar obras
CREATE POLICY "obras_update_policy" ON obras
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id::text = auth.uid()::text 
            AND (u.rol = 'COORDINACION' OR u.id = obras.responsable_id)
        )
    );

-- Permitir a coordinadores insertar nuevas obras
CREATE POLICY "obras_insert_policy" ON obras
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id::text = auth.uid()::text 
            AND u.rol = 'COORDINACION'
        )
    );

-- 8. Otorgar permisos básicos a los roles
-- Permisos para usuarios anónimos (solo lectura limitada si es necesario)
GRANT SELECT ON usuarios TO anon;
GRANT SELECT ON obras TO anon;

-- Permisos para usuarios autenticados
GRANT ALL PRIVILEGES ON usuarios TO authenticated;
GRANT ALL PRIVILEGES ON obras TO authenticated;

-- 9. Crear función auxiliar para verificar permisos de coordinador
CREATE OR REPLACE FUNCTION is_coordinator(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM usuarios 
        WHERE id = user_id 
        AND rol = 'COORDINACION' 
        AND activo = true
    );
END;
$$;

-- 10. Crear función para asignar obra a usuario (solo coordinadores)
CREATE OR REPLACE FUNCTION assign_obra_to_user(user_id uuid, obra_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    result json;
BEGIN
    -- Obtener el ID del usuario actual
    current_user_id := auth.uid();
    
    -- Verificar que el usuario actual es coordinador
    IF NOT is_coordinator(current_user_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Solo los coordinadores pueden asignar obras a usuarios'
        );
    END IF;
    
    -- Verificar que el usuario existe
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = user_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado'
        );
    END IF;
    
    -- Verificar que la obra existe
    IF NOT EXISTS (SELECT 1 FROM obras WHERE id = obra_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Obra no encontrada'
        );
    END IF;
    
    -- Asignar la obra al usuario
    UPDATE usuarios 
    SET obra_id = assign_obra_to_user.obra_id, 
        updated_at = now()
    WHERE id = user_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Obra asignada correctamente al usuario'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- 11. Verificar el resultado final
SELECT 'Migración completada. Verificando permisos...' as status;

SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name IN ('usuarios', 'obras') 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;