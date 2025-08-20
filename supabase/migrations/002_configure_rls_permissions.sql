-- Configuración de Row Level Security (RLS) y permisos para todas las tablas
-- Sistema de Almacén de Obra

-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE requerimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE requerimiento_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitud_compra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_compra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrada_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE salidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE salida_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_obra_material ENABLE ROW LEVEL SECURITY;

-- Otorgar permisos básicos a los roles anon y authenticated
-- Tabla usuarios
GRANT SELECT ON usuarios TO anon;
GRANT ALL PRIVILEGES ON usuarios TO authenticated;

-- Tabla obras
GRANT SELECT ON obras TO anon;
GRANT ALL PRIVILEGES ON obras TO authenticated;

-- Tabla materiales
GRANT SELECT ON materiales TO anon;
GRANT ALL PRIVILEGES ON materiales TO authenticated;

-- Tabla requerimientos
GRANT SELECT ON requerimientos TO anon;
GRANT ALL PRIVILEGES ON requerimientos TO authenticated;

-- Tabla requerimiento_items
GRANT SELECT ON requerimiento_items TO anon;
GRANT ALL PRIVILEGES ON requerimiento_items TO authenticated;

-- Tabla solicitudes_compra
GRANT SELECT ON solicitudes_compra TO anon;
GRANT ALL PRIVILEGES ON solicitudes_compra TO authenticated;

-- Tabla solicitud_compra_items
GRANT SELECT ON solicitud_compra_items TO anon;
GRANT ALL PRIVILEGES ON solicitud_compra_items TO authenticated;

-- Tabla ordenes_compra
GRANT SELECT ON ordenes_compra TO anon;
GRANT ALL PRIVILEGES ON ordenes_compra TO authenticated;

-- Tabla orden_compra_items
GRANT SELECT ON orden_compra_items TO anon;
GRANT ALL PRIVILEGES ON orden_compra_items TO authenticated;

-- Tabla entradas
GRANT SELECT ON entradas TO anon;
GRANT ALL PRIVILEGES ON entradas TO authenticated;

-- Tabla entrada_items
GRANT SELECT ON entrada_items TO anon;
GRANT ALL PRIVILEGES ON entrada_items TO authenticated;

-- Tabla salidas
GRANT SELECT ON salidas TO anon;
GRANT ALL PRIVILEGES ON salidas TO authenticated;

-- Tabla salida_items
GRANT SELECT ON salida_items TO anon;
GRANT ALL PRIVILEGES ON salida_items TO authenticated;

-- Tabla stock_obra_material
GRANT SELECT ON stock_obra_material TO anon;
GRANT ALL PRIVILEGES ON stock_obra_material TO authenticated;

-- Políticas RLS para usuarios
CREATE POLICY "Usuarios pueden ver todos los usuarios" ON usuarios
    FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden actualizar su perfil" ON usuarios
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Solo COORDINACION puede crear usuarios" ON usuarios
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol = 'COORDINACION'
        )
    );

-- Políticas RLS para obras
CREATE POLICY "Todos pueden ver obras activas" ON obras
    FOR SELECT USING (estado = 'ACTIVA' OR auth.uid() IS NOT NULL);

CREATE POLICY "Solo COORDINACION puede gestionar obras" ON obras
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol = 'COORDINACION'
        )
    );

-- Políticas RLS para materiales
CREATE POLICY "Todos pueden ver materiales activos" ON materiales
    FOR SELECT USING (activo = true);

CREATE POLICY "COORDINACION y LOGISTICA pueden gestionar materiales" ON materiales
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol IN ('COORDINACION', 'LOGISTICA')
        )
    );

-- Políticas RLS para requerimientos
CREATE POLICY "Usuarios pueden ver requerimientos de sus obras" ON requerimientos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            JOIN obras o ON o.responsable_id = u.id
            WHERE u.id::text = auth.uid()::text
            AND o.id = requerimientos.obra_id
        )
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol IN ('COORDINACION', 'LOGISTICA')
        )
    );

CREATE POLICY "Usuarios pueden crear requerimientos" ON requerimientos
    FOR INSERT WITH CHECK (auth.uid()::text = created_by::text);

CREATE POLICY "Creadores y supervisores pueden actualizar requerimientos" ON requerimientos
    FOR UPDATE USING (
        auth.uid()::text = created_by::text
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol IN ('COORDINACION', 'LOGISTICA')
        )
    );

-- Políticas RLS para requerimiento_items
CREATE POLICY "Ver items de requerimientos accesibles" ON requerimiento_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM requerimientos r
            WHERE r.id = requerimiento_items.requerimiento_id
        )
    );

CREATE POLICY "Gestionar items de requerimientos" ON requerimiento_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM requerimientos r
            WHERE r.id = requerimiento_items.requerimiento_id
            AND (r.created_by::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM usuarios 
                    WHERE id::text = auth.uid()::text 
                    AND rol IN ('COORDINACION', 'LOGISTICA')
                ))
        )
    );

-- Políticas RLS para solicitudes_compra
CREATE POLICY "Ver solicitudes de compra" ON solicitudes_compra
    FOR SELECT USING (
        auth.uid()::text = created_by::text
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol IN ('COORDINACION', 'LOGISTICA')
        )
    );

CREATE POLICY "LOGISTICA puede gestionar solicitudes de compra" ON solicitudes_compra
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol IN ('COORDINACION', 'LOGISTICA')
        )
    );

-- Políticas RLS para solicitud_compra_items
CREATE POLICY "Ver items de solicitudes accesibles" ON solicitud_compra_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM solicitudes_compra sc
            WHERE sc.id = solicitud_compra_items.solicitud_compra_id
        )
    );

CREATE POLICY "Gestionar items de solicitudes" ON solicitud_compra_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM solicitudes_compra sc
            WHERE sc.id = solicitud_compra_items.solicitud_compra_id
            AND (sc.created_by::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM usuarios 
                    WHERE id::text = auth.uid()::text 
                    AND rol IN ('COORDINACION', 'LOGISTICA')
                ))
        )
    );

-- Políticas RLS para ordenes_compra
CREATE POLICY "Ver órdenes de compra" ON ordenes_compra
    FOR SELECT USING (
        auth.uid()::text = created_by::text
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol IN ('COORDINACION', 'LOGISTICA')
        )
    );

CREATE POLICY "LOGISTICA puede gestionar órdenes de compra" ON ordenes_compra
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol IN ('COORDINACION', 'LOGISTICA')
        )
    );

-- Políticas RLS para orden_compra_items
CREATE POLICY "Ver items de órdenes accesibles" ON orden_compra_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ordenes_compra oc
            WHERE oc.id = orden_compra_items.orden_compra_id
        )
    );

CREATE POLICY "Gestionar items de órdenes" ON orden_compra_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ordenes_compra oc
            WHERE oc.id = orden_compra_items.orden_compra_id
            AND (oc.created_by::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM usuarios 
                    WHERE id::text = auth.uid()::text 
                    AND rol IN ('COORDINACION', 'LOGISTICA')
                ))
        )
    );

-- Políticas RLS para entradas
CREATE POLICY "Ver entradas de almacén" ON entradas
    FOR SELECT USING (
        auth.uid()::text = recibido_por::text
        OR auth.uid()::text = verificado_por::text
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol IN ('COORDINACION', 'LOGISTICA', 'ALMACENERO')
        )
    );

CREATE POLICY "ALMACENERO puede gestionar entradas" ON entradas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol IN ('COORDINACION', 'ALMACENERO')
        )
    );

-- Políticas RLS para entrada_items
CREATE POLICY "Ver items de entradas accesibles" ON entrada_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM entradas e
            WHERE e.id = entrada_items.entrada_id
        )
    );

CREATE POLICY "Gestionar items de entradas" ON entrada_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM entradas e
            WHERE e.id = entrada_items.entrada_id
            AND (e.recibido_por::text = auth.uid()::text
                OR e.verificado_por::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM usuarios 
                    WHERE id::text = auth.uid()::text 
                    AND rol IN ('COORDINACION', 'ALMACENERO')
                ))
        )
    );

-- Políticas RLS para salidas
CREATE POLICY "Ver salidas de almacén" ON salidas
    FOR SELECT USING (
        auth.uid()::text = solicitado_por::text
        OR auth.uid()::text = autorizado_por::text
        OR auth.uid()::text = entregado_por::text
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol IN ('COORDINACION', 'LOGISTICA', 'ALMACENERO')
        )
    );

CREATE POLICY "Usuarios pueden crear salidas" ON salidas
    FOR INSERT WITH CHECK (auth.uid()::text = solicitado_por::text);

CREATE POLICY "Autorizar y entregar salidas" ON salidas
    FOR UPDATE USING (
        auth.uid()::text = solicitado_por::text
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol IN ('COORDINACION', 'LOGISTICA', 'ALMACENERO')
        )
    );

-- Políticas RLS para salida_items
CREATE POLICY "Ver items de salidas accesibles" ON salida_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM salidas s
            WHERE s.id = salida_items.salida_id
        )
    );

CREATE POLICY "Gestionar items de salidas" ON salida_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM salidas s
            WHERE s.id = salida_items.salida_id
            AND (s.solicitado_por::text = auth.uid()::text
                OR s.autorizado_por::text = auth.uid()::text
                OR s.entregado_por::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM usuarios 
                    WHERE id::text = auth.uid()::text 
                    AND rol IN ('COORDINACION', 'LOGISTICA', 'ALMACENERO')
                ))
        )
    );

-- Políticas RLS para stock_obra_material
CREATE POLICY "Ver stock de materiales" ON stock_obra_material
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            JOIN obras o ON o.responsable_id = u.id
            WHERE u.id::text = auth.uid()::text
            AND o.id = stock_obra_material.obra_id
        )
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol IN ('COORDINACION', 'LOGISTICA', 'ALMACENERO')
        )
    );

CREATE POLICY "ALMACENERO puede actualizar stock" ON stock_obra_material
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol IN ('COORDINACION', 'ALMACENERO')
        )
    );

-- Crear función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT rol 
        FROM usuarios 
        WHERE id::text = auth.uid()::text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear función para verificar si el usuario tiene acceso a una obra
CREATE OR REPLACE FUNCTION user_has_obra_access(obra_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM usuarios u
        JOIN obras o ON o.responsable_id = u.id
        WHERE u.id::text = auth.uid()::text
        AND o.id = obra_uuid
    ) OR EXISTS (
        SELECT 1 FROM usuarios 
        WHERE id::text = auth.uid()::text 
        AND rol IN ('COORDINACION', 'LOGISTICA')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios sobre las políticas implementadas
COMMENT ON POLICY "Usuarios pueden ver todos los usuarios" ON usuarios IS 'Permite a todos los usuarios ver la lista de usuarios para asignaciones';
COMMENT ON POLICY "Solo COORDINACION puede crear usuarios" ON usuarios IS 'Solo el rol COORDINACION puede crear nuevos usuarios';
COMMENT ON POLICY "Todos pueden ver obras activas" ON obras IS 'Permite ver obras activas para selección en formularios';
COMMENT ON POLICY "LOGISTICA puede gestionar solicitudes de compra" ON solicitudes_compra IS 'El área de logística gestiona las solicitudes de compra';
COMMENT ON POLICY "ALMACENERO puede gestionar entradas" ON entradas IS 'Los almaceneros gestionan las entradas de materiales';
COMMENT ON POLICY "ALMACENERO puede actualizar stock" ON stock_obra_material IS 'Los almaceneros actualizan el stock de materiales';