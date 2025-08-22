-- Otorgar permisos SELECT a los roles anon y authenticated para la tabla requerimientos
-- Esto permitirá que los usuarios puedan leer los datos de requerimientos

-- Otorgar permisos SELECT al rol anon (usuarios no autenticados)
GRANT SELECT ON requerimientos TO anon;

-- Otorgar todos los permisos al rol authenticated (usuarios autenticados)
GRANT ALL PRIVILEGES ON requerimientos TO authenticated;

-- Crear una política RLS que permita a todos los usuarios leer los requerimientos
CREATE POLICY "Allow read access to requerimientos" ON requerimientos
    FOR SELECT
    USING (true);

-- Crear una política RLS que permita a usuarios autenticados modificar requerimientos
CREATE POLICY "Allow authenticated users to modify requerimientos" ON requerimientos
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Verificar que RLS esté habilitado (debería estar ya habilitado)
ALTER TABLE requerimientos ENABLE ROW LEVEL SECURITY;