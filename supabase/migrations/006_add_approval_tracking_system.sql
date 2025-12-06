-- Migration: Add approval tracking system for requerimiento_materiales
-- This creates a dedicated table to track all approval/rejection actions

-- Create aprobaciones_requerimientos table to track approval history
CREATE TABLE IF NOT EXISTS aprobaciones_requerimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requerimiento_id UUID NOT NULL REFERENCES requerimiento_materiales(id) ON DELETE CASCADE,
    aprobador_id UUID NOT NULL REFERENCES usuarios(id),
    accion VARCHAR(20) NOT NULL CHECK (accion IN ('APROBAR', 'RECHAZAR')),
    comentarios TEXT,
    fecha_accion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_aprobaciones_requerimientos_requerimiento 
    ON aprobaciones_requerimientos(requerimiento_id);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_requerimientos_aprobador 
    ON aprobaciones_requerimientos(aprobador_id);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_requerimientos_fecha 
    ON aprobaciones_requerimientos(fecha_accion DESC);

-- Enable RLS
ALTER TABLE aprobaciones_requerimientos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view approvals for their requirements" 
    ON aprobaciones_requerimientos FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM requerimiento_materiales rm
            WHERE rm.id = aprobaciones_requerimientos.requerimiento_id
            AND (rm.solicitante_id = auth.uid() OR 
                 EXISTS (
                     SELECT 1 FROM usuarios 
                     WHERE usuarios.id = auth.uid() 
                     AND usuarios.rol IN ('COORDINACION', 'LOGISTICA', 'RESIDENTE')
                 ))
        )
    );

CREATE POLICY "Authorized users can create approvals" 
    ON aprobaciones_requerimientos FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.rol IN ('COORDINACION', 'LOGISTICA', 'RESIDENTE')
        ) AND aprobador_id = auth.uid()
    );

-- Grant permissions
GRANT SELECT ON aprobaciones_requerimientos TO anon, authenticated;
GRANT ALL PRIVILEGES ON aprobaciones_requerimientos TO authenticated;

-- Update detalle_requerimiento to ensure it has all needed columns
ALTER TABLE detalle_requerimiento 
    ADD COLUMN IF NOT EXISTS cantidad DECIMAL(10,2);
    
-- Rename cantidad_solicitada to cantidad if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'detalle_requerimiento' 
        AND column_name = 'cantidad_solicitada'
    ) THEN
        -- Copy data if cantidad doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'detalle_requerimiento' 
            AND column_name = 'cantidad'
        ) THEN
            ALTER TABLE detalle_requerimiento 
                RENAME COLUMN cantidad_solicitada TO cantidad;
        ELSE
            -- If both exist, update cantidad with cantidad_solicitada values
            UPDATE detalle_requerimiento 
            SET cantidad = cantidad_solicitada 
            WHERE cantidad IS NULL;
        END IF;
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
ALTER TABLE detalle_requerimiento 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to update requerimiento_materiales.updated_at
CREATE OR REPLACE FUNCTION update_requerimiento_materiales_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_requerimiento_materiales_timestamp_trigger 
    ON requerimiento_materiales;
    
CREATE TRIGGER update_requerimiento_materiales_timestamp_trigger
    BEFORE UPDATE ON requerimiento_materiales
    FOR EACH ROW
    EXECUTE FUNCTION update_requerimiento_materiales_timestamp();

-- Create function to handle approval/rejection
CREATE OR REPLACE FUNCTION aprobar_rechazar_requerimiento(
    p_requerimiento_id UUID,
    p_aprobador_id UUID,
    p_accion VARCHAR(20),
    p_comentarios TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_nuevo_estado VARCHAR(50);
    v_result JSONB;
BEGIN
    -- Determine new state
    IF p_accion = 'APROBAR' THEN
        v_nuevo_estado := 'APROBADO';
    ELSIF p_accion = 'RECHAZAR' THEN
        v_nuevo_estado := 'RECHAZADO';
    ELSE
        RAISE EXCEPTION 'Acción inválida: %', p_accion;
    END IF;

    -- Update requerimiento state
    UPDATE requerimiento_materiales
    SET 
        estado = v_nuevo_estado,
        aprobado_por = p_aprobador_id,
        fecha_aprobacion = NOW(),
        updated_at = NOW()
    WHERE id = p_requerimiento_id;

    -- Insert approval record
    INSERT INTO aprobaciones_requerimientos (
        requerimiento_id,
        aprobador_id,
        accion,
        comentarios,
        fecha_accion
    ) VALUES (
        p_requerimiento_id,
        p_aprobador_id,
        p_accion,
        p_comentarios,
        NOW()
    );

    -- Return result
    SELECT jsonb_build_object(
        'success', true,
        'requerimiento_id', p_requerimiento_id,
        'nuevo_estado', v_nuevo_estado,
        'aprobador_id', p_aprobador_id,
        'fecha', NOW()
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION aprobar_rechazar_requerimiento TO authenticated;

COMMENT ON TABLE aprobaciones_requerimientos IS 'Historial de aprobaciones y rechazos de requerimientos de materiales';
COMMENT ON FUNCTION aprobar_rechazar_requerimiento IS 'Función para aprobar o rechazar un requerimiento de materiales de forma atómica';
