-- Migration: Add Central Warehouse Role and Tables
-- Creates ALMACEN_CENTRAL role with independent inventory management

-- 1. Add ALMACEN_CENTRAL role to usuarios
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (
  rol::text = ANY (ARRAY[
    'COORDINACION'::character varying,
    'LOGISTICA'::character varying,
    'ALMACENERO'::character varying,
    'PRODUCCION'::character varying,
    'RESIDENTE'::character varying,
    'ALMACEN_CENTRAL'::character varying
  ]::text[])
);

-- 2. Create stock_almacen_central table
CREATE TABLE IF NOT EXISTS stock_almacen_central (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materiales(id) ON DELETE CASCADE UNIQUE NOT NULL,
    cantidad_disponible DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (cantidad_disponible >= 0),
    cantidad_reservada DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (cantidad_reservada >= 0),
    stock_minimo DECIMAL(10,2) DEFAULT 0,
    stock_maximo DECIMAL(10,2),
    ubicacion VARCHAR(100),
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create movimientos_almacen_central table
CREATE TABLE IF NOT EXISTS movimientos_almacen_central (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materiales(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'TRANSFERENCIA')),
    cantidad DECIMAL(10,2) NOT NULL CHECK (cantidad > 0),
    cantidad_anterior DECIMAL(10,2),
    cantidad_nueva DECIMAL(10,2),
    usuario_id UUID REFERENCES usuarios(id),
    obra_destino_id UUID REFERENCES obras(id),
    motivo VARCHAR(200),
    documento_referencia VARCHAR(100),
    proveedor VARCHAR(200),
    numero_factura VARCHAR(100),
    costo_unitario DECIMAL(10,2),
    metadata JSONB,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create transferencias_pendientes table (pre-registros)
CREATE TABLE IF NOT EXISTS transferencias_pendientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movimiento_salida_id UUID REFERENCES movimientos_almacen_central(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materiales(id) ON DELETE CASCADE NOT NULL,
    obra_destino_id UUID REFERENCES obras(id) ON DELETE CASCADE NOT NULL,
    cantidad_enviada DECIMAL(10,2) NOT NULL CHECK (cantidad_enviada > 0),
    cantidad_recibida DECIMAL(10,2),
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'CONFIRMADA', 'AJUSTADA', 'RECHAZADA')),
    usuario_envio_id UUID REFERENCES usuarios(id),
    usuario_recepcion_id UUID REFERENCES usuarios(id),
    fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_recepcion TIMESTAMP WITH TIME ZONE,
    notas_envio TEXT,
    notas_recepcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_almacen_central_material 
    ON stock_almacen_central(material_id);

CREATE INDEX IF NOT EXISTS idx_movimientos_almacen_central_material 
    ON movimientos_almacen_central(material_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_almacen_central_fecha 
    ON movimientos_almacen_central(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_almacen_central_tipo 
    ON movimientos_almacen_central(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_almacen_central_obra 
    ON movimientos_almacen_central(obra_destino_id);

CREATE INDEX IF NOT EXISTS idx_transferencias_pendientes_obra 
    ON transferencias_pendientes(obra_destino_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_pendientes_estado 
    ON transferencias_pendientes(estado);
CREATE INDEX IF NOT EXISTS idx_transferencias_pendientes_material 
    ON transferencias_pendientes(material_id);

-- 6. Enable Row Level Security
ALTER TABLE stock_almacen_central ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_almacen_central ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferencias_pendientes ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for stock_almacen_central
CREATE POLICY "Allow all authenticated users to view central stock" 
    ON stock_almacen_central FOR SELECT 
    TO authenticated USING (true);

CREATE POLICY "Allow central warehouse and coordinators to manage stock" 
    ON stock_almacen_central FOR ALL 
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.rol IN ('ALMACEN_CENTRAL', 'COORDINACION')
        )
    );

-- 8. RLS Policies for movimientos_almacen_central
CREATE POLICY "Allow all authenticated users to view movements" 
    ON movimientos_almacen_central FOR SELECT 
    TO authenticated USING (true);

CREATE POLICY "Allow central warehouse to create movements" 
    ON movimientos_almacen_central FOR INSERT 
    TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.rol IN ('ALMACEN_CENTRAL', 'COORDINACION')
        )
    );

-- 9. RLS Policies for transferencias_pendientes
CREATE POLICY "Allow users to view transfers for their obra" 
    ON transferencias_pendientes FOR SELECT 
    TO authenticated USING (
        obra_destino_id IN (
            SELECT obra_id FROM usuarios WHERE id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.rol IN ('ALMACEN_CENTRAL', 'COORDINACION', 'LOGISTICA')
        )
    );

CREATE POLICY "Allow central warehouse to create transfers" 
    ON transferencias_pendientes FOR INSERT 
    TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.rol IN ('ALMACEN_CENTRAL', 'COORDINACION')
        )
    );

CREATE POLICY "Allow warehouse staff to update transfers" 
    ON transferencias_pendientes FOR UPDATE 
    TO authenticated USING (
        obra_destino_id IN (
            SELECT obra_id FROM usuarios WHERE id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.rol IN ('ALMACEN_CENTRAL', 'COORDINACION', 'ALMACENERO')
        )
    );

-- 10. Grant permissions
GRANT SELECT ON stock_almacen_central TO anon, authenticated;
GRANT ALL ON stock_almacen_central TO authenticated;

GRANT SELECT ON movimientos_almacen_central TO anon, authenticated;
GRANT ALL ON movimientos_almacen_central TO authenticated;

GRANT SELECT ON transferencias_pendientes TO anon, authenticated;
GRANT ALL ON transferencias_pendientes TO authenticated;

-- 11. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_almacen_central_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_almacen_central_timestamp
    BEFORE UPDATE ON stock_almacen_central
    FOR EACH ROW
    EXECUTE FUNCTION update_almacen_central_timestamp();

CREATE TRIGGER update_transferencias_pendientes_timestamp
    BEFORE UPDATE ON transferencias_pendientes
    FOR EACH ROW
    EXECUTE FUNCTION update_almacen_central_timestamp();

-- 12. Function to register material entry
CREATE OR REPLACE FUNCTION registrar_entrada_almacen_central(
    p_material_id UUID,
    p_cantidad DECIMAL(10,2),
    p_usuario_id UUID,
    p_proveedor VARCHAR DEFAULT NULL,
    p_numero_factura VARCHAR DEFAULT NULL,
    p_costo_unitario DECIMAL DEFAULT NULL,
    p_motivo VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_cantidad_anterior DECIMAL(10,2);
    v_cantidad_nueva DECIMAL(10,2);
    v_movimiento_id UUID;
BEGIN
    -- Get current stock or create if doesn't exist
    INSERT INTO stock_almacen_central (material_id, cantidad_disponible)
    VALUES (p_material_id, 0)
    ON CONFLICT (material_id) DO NOTHING;

    -- Get current quantity
    SELECT cantidad_disponible INTO v_cantidad_anterior
    FROM stock_almacen_central
    WHERE material_id = p_material_id;

    -- Calculate new quantity
    v_cantidad_nueva := v_cantidad_anterior + p_cantidad;

    -- Update stock
    UPDATE stock_almacen_central
    SET cantidad_disponible = v_cantidad_nueva,
        updated_at = NOW()
    WHERE material_id = p_material_id;

    -- Register movement
    INSERT INTO movimientos_almacen_central (
        material_id, tipo, cantidad, cantidad_anterior, cantidad_nueva,
        usuario_id, proveedor, numero_factura, costo_unitario, motivo
    ) VALUES (
        p_material_id, 'ENTRADA', p_cantidad, v_cantidad_anterior, v_cantidad_nueva,
        p_usuario_id, p_proveedor, p_numero_factura, p_costo_unitario, p_motivo
    ) RETURNING id INTO v_movimiento_id;

    RETURN jsonb_build_object(
        'success', true,
        'movimiento_id', v_movimiento_id,
        'cantidad_anterior', v_cantidad_anterior,
        'cantidad_nueva', v_cantidad_nueva
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Function to register material transfer to obra
CREATE OR REPLACE FUNCTION registrar_transferencia_obra(
    p_material_id UUID,
    p_cantidad DECIMAL(10,2),
    p_obra_destino_id UUID,
    p_usuario_id UUID,
    p_notas VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_cantidad_anterior DECIMAL(10,2);
    v_cantidad_nueva DECIMAL(10,2);
    v_movimiento_id UUID;
    v_transferencia_id UUID;
    v_stock_disponible DECIMAL(10,2);
BEGIN
    -- Check available stock
    SELECT cantidad_disponible INTO v_stock_disponible
    FROM stock_almacen_central
    WHERE material_id = p_material_id;

    IF v_stock_disponible IS NULL OR v_stock_disponible < p_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Solicitado: %', 
            COALESCE(v_stock_disponible, 0), p_cantidad;
    END IF;

    v_cantidad_anterior := v_stock_disponible;
    v_cantidad_nueva := v_stock_disponible - p_cantidad;

    -- Update stock
    UPDATE stock_almacen_central
    SET cantidad_disponible = v_cantidad_nueva,
        updated_at = NOW()
    WHERE material_id = p_material_id;

    -- Register movement
    INSERT INTO movimientos_almacen_central (
        material_id, tipo, cantidad, cantidad_anterior, cantidad_nueva,
        usuario_id, obra_destino_id, motivo
    ) VALUES (
        p_material_id, 'TRANSFERENCIA', p_cantidad, v_cantidad_anterior, v_cantidad_nueva,
        p_usuario_id, p_obra_destino_id, 'Transferencia a obra'
    ) RETURNING id INTO v_movimiento_id;

    -- Create pending transfer (pre-registro)
    INSERT INTO transferencias_pendientes (
        movimiento_salida_id, material_id, obra_destino_id,
        cantidad_enviada, usuario_envio_id, notas_envio, estado
    ) VALUES (
        v_movimiento_id, p_material_id, p_obra_destino_id,
        p_cantidad, p_usuario_id, p_notas, 'PENDIENTE'
    ) RETURNING id INTO v_transferencia_id;

    RETURN jsonb_build_object(
        'success', true,
        'movimiento_id', v_movimiento_id,
        'transferencia_id', v_transferencia_id,
        'cantidad_enviada', p_cantidad
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION registrar_entrada_almacen_central TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_transferencia_obra TO authenticated;

-- Comments
COMMENT ON TABLE stock_almacen_central IS 'Inventario del almacén central - stock independiente de obras';
COMMENT ON TABLE movimientos_almacen_central IS 'Historial de movimientos (entradas/salidas/transferencias) del almacén central';
COMMENT ON TABLE transferencias_pendientes IS 'Pre-registros de transferencias a obras pendientes de confirmación';
COMMENT ON FUNCTION registrar_entrada_almacen_central IS 'Registra entrada de material al almacén central';
COMMENT ON FUNCTION registrar_transferencia_obra IS 'Registra transferencia de material a una obra (crea pre-registro)';
