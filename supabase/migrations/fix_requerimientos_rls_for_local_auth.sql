-- Arreglar políticas RLS para requerimientos para trabajar con autenticación local
-- Problema: Las políticas actuales requieren auth.uid() que no funciona con autenticación local

-- Eliminar políticas existentes para requerimientos
DROP POLICY IF EXISTS "Usuarios pueden ver requerimientos de sus obras" ON requerimientos;
DROP POLICY IF EXISTS "Usuarios pueden crear requerimientos" ON requerimientos;
DROP POLICY IF EXISTS "Creadores y supervisores pueden actualizar requerimientos" ON requerimientos;

-- Eliminar políticas existentes para requerimiento_items
DROP POLICY IF EXISTS "Ver items de requerimientos accesibles" ON requerimiento_items;
DROP POLICY IF EXISTS "Gestionar items de requerimientos" ON requerimiento_items;

-- Crear nuevas políticas que permitan acceso anónimo para requerimientos
CREATE POLICY "Permitir SELECT en requerimientos" ON requerimientos
    FOR SELECT USING (true);

CREATE POLICY "Permitir INSERT en requerimientos" ON requerimientos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir UPDATE en requerimientos" ON requerimientos
    FOR UPDATE USING (true);

CREATE POLICY "Permitir DELETE en requerimientos" ON requerimientos
    FOR DELETE USING (true);

-- Crear nuevas políticas que permitan acceso anónimo para requerimiento_items
CREATE POLICY "Permitir SELECT en requerimiento_items" ON requerimiento_items
    FOR SELECT USING (true);

CREATE POLICY "Permitir INSERT en requerimiento_items" ON requerimiento_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir UPDATE en requerimiento_items" ON requerimiento_items
    FOR UPDATE USING (true);

CREATE POLICY "Permitir DELETE en requerimiento_items" ON requerimiento_items
    FOR DELETE USING (true);

-- Verificar que los permisos estén correctos
GRANT SELECT ON requerimientos TO anon;
GRANT ALL PRIVILEGES ON requerimientos TO authenticated;

GRANT SELECT ON requerimiento_items TO anon;
GRANT ALL PRIVILEGES ON requerimiento_items TO authenticated;