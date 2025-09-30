-- Eliminar la tabla rq_sc existente y recrearla con la referencia correcta
DROP TABLE IF EXISTS public.rq_sc CASCADE;

-- Crear tabla rq_sc con la referencia correcta a la tabla requerimientos
CREATE TABLE public.rq_sc (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    requerimiento_id UUID NOT NULL REFERENCES public.requerimientos(id) ON DELETE CASCADE,
    solicitud_compra_id UUID NOT NULL REFERENCES public.solicitudes_compra(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Evitar duplicados
    UNIQUE(requerimiento_id, solicitud_compra_id)
);

-- Habilitar RLS
ALTER TABLE public.rq_sc ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Usuarios autenticados pueden ver relaciones rq_sc" ON public.rq_sc
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden insertar relaciones rq_sc" ON public.rq_sc
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar relaciones rq_sc" ON public.rq_sc
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar relaciones rq_sc" ON public.rq_sc
    FOR DELETE USING (auth.role() = 'authenticated');

-- Otorgar permisos a los roles
GRANT ALL PRIVILEGES ON public.rq_sc TO authenticated;
GRANT SELECT ON public.rq_sc TO anon;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_rq_sc_requerimiento_id ON public.rq_sc(requerimiento_id);
CREATE INDEX IF NOT EXISTS idx_rq_sc_solicitud_compra_id ON public.rq_sc(solicitud_compra_id);

-- Comentario en la tabla
COMMENT ON TABLE public.rq_sc IS 'Tabla de relación entre requerimientos y solicitudes de compra';
COMMENT ON COLUMN public.rq_sc.requerimiento_id IS 'ID del requerimiento';
COMMENT ON COLUMN public.rq_sc.solicitud_compra_id IS 'ID de la solicitud de compra';