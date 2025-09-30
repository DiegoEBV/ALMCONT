-- Revisar políticas RLS actuales para la tabla entradas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'entradas';

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Users can insert their own entradas" ON entradas;
DROP POLICY IF EXISTS "Users can view their own entradas" ON entradas;
DROP POLICY IF EXISTS "Users can update their own entradas" ON entradas;
DROP POLICY IF EXISTS "Allow authenticated users to insert entradas" ON entradas;
DROP POLICY IF EXISTS "Allow authenticated users to view entradas" ON entradas;
DROP POLICY IF EXISTS "Allow authenticated users to update entradas" ON entradas;

-- Crear nuevas políticas RLS para la tabla entradas
-- Política para permitir inserción a usuarios autenticados
CREATE POLICY "Allow authenticated users to insert entradas" ON entradas
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Allow authenticated users to view entradas" ON entradas
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para permitir actualización a usuarios autenticados
CREATE POLICY "Allow authenticated users to update entradas" ON entradas
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política para permitir eliminación a usuarios autenticados (si es necesario)
CREATE POLICY "Allow authenticated users to delete entradas" ON entradas
    FOR DELETE
    TO authenticated
    USING (true);

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'entradas';

-- Asegurar que los permisos básicos estén otorgados
GRANT ALL PRIVILEGES ON entradas TO authenticated;
GRANT ALL PRIVILEGES ON entradas TO anon;

-- También otorgar permisos en la secuencia si existe
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;