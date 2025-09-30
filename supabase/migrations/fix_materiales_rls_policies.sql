-- Habilitar RLS en la tabla materiales
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Allow read access to materiales for authenticated users" ON materiales
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Política para permitir lectura a usuarios anónimos (para búsquedas públicas)
CREATE POLICY "Allow read access to materiales for anon users" ON materiales
    FOR SELECT
    USING (auth.role() = 'anon');

-- Política para permitir inserción a usuarios autenticados con rol admin o almacenero
CREATE POLICY "Allow insert materiales for admin and warehouse users" ON materiales
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol IN ('admin', 'almacenero')
        )
    );

-- Política para permitir actualización a usuarios autenticados con rol admin o almacenero
CREATE POLICY "Allow update materiales for admin and warehouse users" ON materiales
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol IN ('admin', 'almacenero')
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol IN ('admin', 'almacenero')
        )
    );

-- Política para permitir eliminación solo a administradores
CREATE POLICY "Allow delete materiales for admin users only" ON materiales
    FOR DELETE
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol = 'admin'
        )
    );

-- Otorgar permisos básicos a los roles
GRANT SELECT ON materiales TO anon;
GRANT ALL PRIVILEGES ON materiales TO authenticated;

-- Comentario sobre la tabla
COMMENT ON TABLE materiales IS 'Tabla de materiales con RLS habilitado para control de acceso basado en roles de usuario';