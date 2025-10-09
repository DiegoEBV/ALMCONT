-- =====================================================
-- SISTEMA DE PRÉSTAMOS Y TERCEROS - MIGRACIÓN
-- Extensión del sistema de devoluciones para manejar préstamos
-- con terceros (contratistas/subcontratistas)
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLA: terceros (Contratistas/Subcontratistas)
-- =====================================================
CREATE TABLE terceros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    nombre_comercial VARCHAR(200),
    tipo_tercero VARCHAR(30) NOT NULL CHECK (tipo_tercero IN ('contratista', 'subcontratista', 'proveedor_servicios', 'cliente_externo')),
    ruc VARCHAR(20) UNIQUE,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    contacto_principal VARCHAR(100),
    telefono_contacto VARCHAR(20),
    email_contacto VARCHAR(100),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido', 'bloqueado')),
    calificacion INTEGER CHECK (calificacion >= 1 AND calificacion <= 5),
    limite_credito DECIMAL(15,2) DEFAULT 0,
    dias_credito INTEGER DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABLA: acuerdos_prestamo (Contratos/Acuerdos de préstamo)
-- =====================================================
CREATE TABLE acuerdos_prestamo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_acuerdo VARCHAR(30) UNIQUE NOT NULL,
    tercero_id UUID REFERENCES terceros(id),
    obra_id UUID REFERENCES obras(id),
    tipo_acuerdo VARCHAR(30) NOT NULL CHECK (tipo_acuerdo IN ('prestamo_a_tercero', 'prestamo_de_tercero', 'intercambio_materiales')),
    estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'activo', 'suspendido', 'finalizado', 'cancelado')),
    fecha_inicio DATE NOT NULL,
    fecha_vencimiento DATE,
    descripcion TEXT,
    condiciones_especiales TEXT,
    garantia_requerida BOOLEAN DEFAULT false,
    tipo_garantia VARCHAR(30) CHECK (tipo_garantia IN ('deposito_efectivo', 'carta_fianza', 'retencion_pagos', 'aval_personal')),
    monto_garantia DECIMAL(15,2),
    responsable_empresa UUID REFERENCES usuarios(id),
    responsable_tercero VARCHAR(100),
    telefono_responsable_tercero VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABLA: prestamos_materiales (Préstamos específicos)
-- =====================================================
CREATE TABLE prestamos_materiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_prestamo VARCHAR(30) UNIQUE NOT NULL,
    acuerdo_id UUID REFERENCES acuerdos_prestamo(id),
    tercero_id UUID REFERENCES terceros(id),
    obra_id UUID REFERENCES obras(id),
    tipo_prestamo VARCHAR(30) NOT NULL CHECK (tipo_prestamo IN ('prestamo_saliente', 'prestamo_entrante', 'intercambio')),
    estado VARCHAR(30) DEFAULT 'solicitado' CHECK (estado IN ('solicitado', 'aprobado', 'entregado', 'parcialmente_devuelto', 'devuelto_completo', 'vencido', 'cancelado')),
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_aprobacion TIMESTAMP WITH TIME ZONE,
    fecha_entrega TIMESTAMP WITH TIME ZONE,
    fecha_devolucion_programada DATE,
    fecha_devolucion_real TIMESTAMP WITH TIME ZONE,
    solicitado_por UUID REFERENCES usuarios(id),
    aprobado_por UUID REFERENCES usuarios(id),
    entregado_por UUID REFERENCES usuarios(id),
    recibido_por VARCHAR(100), -- Persona del tercero que recibe
    motivo TEXT NOT NULL,
    condiciones_devolucion TEXT,
    penalidad_retraso DECIMAL(10,2), -- Penalidad por día de retraso
    valor_total_estimado DECIMAL(15,2),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TABLA: detalle_prestamos (Detalles de materiales prestados)
-- =====================================================
CREATE TABLE detalle_prestamos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prestamo_id UUID REFERENCES prestamos_materiales(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materiales(id),
    cantidad_solicitada INTEGER NOT NULL CHECK (cantidad_solicitada > 0),
    cantidad_aprobada INTEGER CHECK (cantidad_aprobada >= 0),
    cantidad_entregada INTEGER CHECK (cantidad_entregada >= 0),
    cantidad_devuelta INTEGER DEFAULT 0 CHECK (cantidad_devuelta >= 0),
    precio_unitario_referencial DECIMAL(10,2),
    valor_total DECIMAL(15,2),
    condicion_entrega VARCHAR(20) DEFAULT 'nuevo' CHECK (condicion_entrega IN ('nuevo', 'usado_bueno', 'usado_regular', 'reparable')),
    condicion_devolucion_esperada VARCHAR(20) DEFAULT 'mismo_estado' CHECK (condicion_devolucion_esperada IN ('mismo_estado', 'usado_aceptable', 'cualquier_estado')),
    ubicacion_origen UUID REFERENCES ubicaciones(id),
    ubicacion_destino_tercero TEXT,
    observaciones_detalle TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. TABLA: devoluciones_prestamos (Devoluciones de préstamos)
-- =====================================================
CREATE TABLE devoluciones_prestamos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_devolucion VARCHAR(30) UNIQUE NOT NULL,
    prestamo_id UUID REFERENCES prestamos_materiales(id),
    tipo_devolucion VARCHAR(30) NOT NULL CHECK (tipo_devolucion IN ('devolucion_parcial', 'devolucion_total', 'devolucion_con_reposicion')),
    estado VARCHAR(20) DEFAULT 'recibida' CHECK (estado IN ('recibida', 'en_inspeccion', 'aprobada', 'rechazada', 'procesada')),
    fecha_devolucion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recibido_por UUID REFERENCES usuarios(id),
    inspeccionado_por UUID REFERENCES usuarios(id),
    fecha_inspeccion TIMESTAMP WITH TIME ZONE,
    observaciones_recepcion TEXT,
    observaciones_inspeccion TEXT,
    penalidad_aplicada DECIMAL(10,2) DEFAULT 0,
    motivo_penalidad TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. TABLA: detalle_devoluciones_prestamos
-- =====================================================
CREATE TABLE detalle_devoluciones_prestamos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devolucion_prestamo_id UUID REFERENCES devoluciones_prestamos(id) ON DELETE CASCADE,
    detalle_prestamo_id UUID REFERENCES detalle_prestamos(id),
    material_id UUID REFERENCES materiales(id),
    cantidad_devuelta INTEGER NOT NULL CHECK (cantidad_devuelta > 0),
    condicion_devolucion VARCHAR(20) NOT NULL CHECK (condicion_devolucion IN ('nuevo', 'usado_bueno', 'usado_regular', 'defectuoso', 'no_reparable')),
    accion_tomada VARCHAR(30) CHECK (accion_tomada IN ('reintegrar_inventario', 'reparar', 'descartar', 'cobrar_reposicion', 'aceptar_como_pago')),
    valor_depreciacion DECIMAL(10,2) DEFAULT 0,
    ubicacion_destino UUID REFERENCES ubicaciones(id),
    observaciones_detalle TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. TABLA: garantias_prestamos (Garantías de préstamos)
-- =====================================================
CREATE TABLE garantias_prestamos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prestamo_id UUID REFERENCES prestamos_materiales(id),
    tipo_garantia VARCHAR(30) NOT NULL CHECK (tipo_garantia IN ('deposito_efectivo', 'carta_fianza', 'retencion_pagos', 'aval_personal', 'equipos_garantia')),
    descripcion TEXT NOT NULL,
    valor_garantia DECIMAL(15,2),
    fecha_constitucion DATE NOT NULL,
    fecha_vencimiento DATE,
    estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'liberada', 'ejecutada', 'vencida')),
    documento_respaldo TEXT, -- Ruta del documento
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. TABLA: documentos_prestamos (Documentos asociados)
-- =====================================================
CREATE TABLE documentos_prestamos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prestamo_id UUID REFERENCES prestamos_materiales(id),
    devolucion_prestamo_id UUID REFERENCES devoluciones_prestamos(id),
    tipo_documento VARCHAR(30) NOT NULL CHECK (tipo_documento IN ('acta_entrega', 'acta_recepcion', 'foto_entrega', 'foto_devolucion', 'firma_responsable', 'documento_identidad')),
    nombre_archivo VARCHAR(200) NOT NULL,
    ruta_archivo TEXT NOT NULL,
    tamaño_archivo INTEGER,
    tipo_mime VARCHAR(100),
    descripcion TEXT,
    subido_por UUID REFERENCES usuarios(id),
    fecha_subida TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. TABLA: alertas_prestamos (Sistema de alertas)
-- =====================================================
CREATE TABLE alertas_prestamos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prestamo_id UUID REFERENCES prestamos_materiales(id),
    tipo_alerta VARCHAR(30) NOT NULL CHECK (tipo_alerta IN ('vencimiento_proximo', 'prestamo_vencido', 'devolucion_parcial_pendiente', 'garantia_por_vencer', 'inspeccion_pendiente')),
    nivel_prioridad VARCHAR(20) DEFAULT 'media' CHECK (nivel_prioridad IN ('baja', 'media', 'alta', 'critica')),
    mensaje TEXT NOT NULL,
    fecha_alerta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_vencimiento TIMESTAMP WITH TIME ZONE,
    estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'notificada', 'resuelta', 'ignorada')),
    notificado_a UUID REFERENCES usuarios(id),
    fecha_notificacion TIMESTAMP WITH TIME ZONE,
    fecha_resolucion TIMESTAMP WITH TIME ZONE,
    observaciones_resolucion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para terceros
CREATE INDEX idx_terceros_codigo ON terceros(codigo);
CREATE INDEX idx_terceros_tipo ON terceros(tipo_tercero);
CREATE INDEX idx_terceros_estado ON terceros(estado);
CREATE INDEX idx_terceros_ruc ON terceros(ruc);

-- Índices para acuerdos
CREATE INDEX idx_acuerdos_numero ON acuerdos_prestamo(numero_acuerdo);
CREATE INDEX idx_acuerdos_tercero ON acuerdos_prestamo(tercero_id);
CREATE INDEX idx_acuerdos_obra ON acuerdos_prestamo(obra_id);
CREATE INDEX idx_acuerdos_estado ON acuerdos_prestamo(estado);
CREATE INDEX idx_acuerdos_fechas ON acuerdos_prestamo(fecha_inicio, fecha_vencimiento);

-- Índices para préstamos
CREATE INDEX idx_prestamos_numero ON prestamos_materiales(numero_prestamo);
CREATE INDEX idx_prestamos_tercero ON prestamos_materiales(tercero_id);
CREATE INDEX idx_prestamos_obra ON prestamos_materiales(obra_id);
CREATE INDEX idx_prestamos_estado ON prestamos_materiales(estado);
CREATE INDEX idx_prestamos_tipo ON prestamos_materiales(tipo_prestamo);
CREATE INDEX idx_prestamos_fechas ON prestamos_materiales(fecha_entrega, fecha_devolucion_programada);
CREATE INDEX idx_prestamos_vencidos ON prestamos_materiales(fecha_devolucion_programada) WHERE estado IN ('entregado', 'parcialmente_devuelto');

-- Índices para detalles
CREATE INDEX idx_detalle_prestamos_prestamo ON detalle_prestamos(prestamo_id);
CREATE INDEX idx_detalle_prestamos_material ON detalle_prestamos(material_id);
CREATE INDEX idx_detalle_prestamos_ubicacion ON detalle_prestamos(ubicacion_origen);

-- Índices para devoluciones
CREATE INDEX idx_devoluciones_prestamos_numero ON devoluciones_prestamos(numero_devolucion);
CREATE INDEX idx_devoluciones_prestamos_prestamo ON devoluciones_prestamos(prestamo_id);
CREATE INDEX idx_devoluciones_prestamos_estado ON devoluciones_prestamos(estado);
CREATE INDEX idx_devoluciones_prestamos_fecha ON devoluciones_prestamos(fecha_devolucion);

-- Índices para alertas
CREATE INDEX idx_alertas_prestamos_prestamo ON alertas_prestamos(prestamo_id);
CREATE INDEX idx_alertas_prestamos_tipo ON alertas_prestamos(tipo_alerta);
CREATE INDEX idx_alertas_prestamos_estado ON alertas_prestamos(estado);
CREATE INDEX idx_alertas_prestamos_prioridad ON alertas_prestamos(nivel_prioridad);
CREATE INDEX idx_alertas_prestamos_vencimiento ON alertas_prestamos(fecha_vencimiento) WHERE estado = 'activa';

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Función para actualizar updated_at (reutilizar la existente si está disponible)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para todas las tablas
CREATE TRIGGER trigger_terceros_updated_at
    BEFORE UPDATE ON terceros
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_acuerdos_prestamo_updated_at
    BEFORE UPDATE ON acuerdos_prestamo
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_prestamos_materiales_updated_at
    BEFORE UPDATE ON prestamos_materiales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_detalle_prestamos_updated_at
    BEFORE UPDATE ON detalle_prestamos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_devoluciones_prestamos_updated_at
    BEFORE UPDATE ON devoluciones_prestamos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_detalle_devoluciones_prestamos_updated_at
    BEFORE UPDATE ON detalle_devoluciones_prestamos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_garantias_prestamos_updated_at
    BEFORE UPDATE ON garantias_prestamos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para generar número de préstamo automático
CREATE OR REPLACE FUNCTION generar_numero_prestamo(tipo_prestamo VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    prefijo VARCHAR(10);
    contador INTEGER;
    numero_final VARCHAR(30);
BEGIN
    -- Determinar prefijo según tipo
    CASE tipo_prestamo
        WHEN 'prestamo_saliente' THEN prefijo := 'PS';
        WHEN 'prestamo_entrante' THEN prefijo := 'PE';
        WHEN 'intercambio' THEN prefijo := 'INT';
        ELSE prefijo := 'PREST';
    END CASE;
    
    -- Obtener contador del año actual
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_prestamo FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO contador
    FROM prestamos_materiales
    WHERE numero_prestamo LIKE prefijo || '-' || EXTRACT(YEAR FROM NOW()) || '-%';
    
    -- Generar número final
    numero_final := prefijo || '-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(contador::TEXT, 4, '0');
    
    RETURN numero_final;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular días de retraso
CREATE OR REPLACE FUNCTION calcular_dias_retraso(prestamo_id UUID)
RETURNS INTEGER AS $$
DECLARE
    fecha_programada DATE;
    fecha_actual DATE := CURRENT_DATE;
    dias_retraso INTEGER := 0;
BEGIN
    SELECT fecha_devolucion_programada
    INTO fecha_programada
    FROM prestamos_materiales
    WHERE id = prestamo_id;
    
    IF fecha_programada IS NOT NULL AND fecha_actual > fecha_programada THEN
        dias_retraso := fecha_actual - fecha_programada;
    END IF;
    
    RETURN dias_retraso;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE terceros IS 'Registro de contratistas, subcontratistas y otros terceros';
COMMENT ON TABLE acuerdos_prestamo IS 'Contratos y acuerdos marco para préstamos de materiales';
COMMENT ON TABLE prestamos_materiales IS 'Registro de préstamos específicos de materiales';
COMMENT ON TABLE detalle_prestamos IS 'Detalle de materiales incluidos en cada préstamo';
COMMENT ON TABLE devoluciones_prestamos IS 'Registro de devoluciones de materiales prestados';
COMMENT ON TABLE detalle_devoluciones_prestamos IS 'Detalle de materiales devueltos';
COMMENT ON TABLE garantias_prestamos IS 'Garantías asociadas a los préstamos';
COMMENT ON TABLE documentos_prestamos IS 'Documentos y evidencias de préstamos y devoluciones';
COMMENT ON TABLE alertas_prestamos IS 'Sistema de alertas para seguimiento de préstamos';

-- Mensaje de finalización
SELECT 'Sistema de préstamos y terceros creado exitosamente' as resultado;