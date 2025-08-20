-- =====================================================
-- SISTEMA DE ALMACÉN - MIGRACIÓN INICIAL
-- Creación de todas las tablas y configuraciones
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: usuarios
-- =====================================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('COORDINACION', 'LOGISTICA', 'ALMACENERO')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: obras
-- =====================================================
CREATE TABLE obras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    ubicacion VARCHAR(300),
    fecha_inicio DATE,
    fecha_fin_estimada DATE,
    estado VARCHAR(20) DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'PAUSADA', 'FINALIZADA', 'CANCELADA')),
    presupuesto DECIMAL(15,2),
    responsable_id UUID REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: materiales
-- =====================================================
CREATE TABLE materiales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100) NOT NULL,
    subcategoria VARCHAR(100),
    unidad_medida VARCHAR(20) NOT NULL,
    precio_referencial DECIMAL(10,2),
    stock_minimo INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: requerimientos (RQ)
-- =====================================================
CREATE TABLE requerimientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_rq VARCHAR(20) UNIQUE NOT NULL,
    obra_id UUID NOT NULL REFERENCES obras(id),
    fecha_requerimiento DATE NOT NULL,
    fecha_necesidad DATE NOT NULL,
    solicitante VARCHAR(100) NOT NULL,
    area_solicitante VARCHAR(100) NOT NULL,
    justificacion TEXT,
    prioridad VARCHAR(20) DEFAULT 'MEDIA' CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'URGENTE')),
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_PROCESO', 'COMPLETADO')),
    observaciones TEXT,
    aprobado_por UUID REFERENCES usuarios(id),
    fecha_aprobacion TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: requerimiento_items (Detalles del RQ)
-- =====================================================
CREATE TABLE requerimiento_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requerimiento_id UUID NOT NULL REFERENCES requerimientos(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materiales(id),
    cantidad_solicitada DECIMAL(10,3) NOT NULL,
    cantidad_aprobada DECIMAL(10,3),
    precio_estimado DECIMAL(10,2),
    especificaciones TEXT,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: solicitudes_compra (SC)
-- =====================================================
CREATE TABLE solicitudes_compra (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_sc VARCHAR(20) UNIQUE NOT NULL,
    requerimiento_id UUID REFERENCES requerimientos(id),
    obra_id UUID NOT NULL REFERENCES obras(id),
    fecha_solicitud DATE NOT NULL,
    fecha_necesidad DATE NOT NULL,
    proveedor_sugerido VARCHAR(200),
    justificacion TEXT,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'ENVIADO', 'RECIBIDO')),
    total_estimado DECIMAL(15,2),
    observaciones TEXT,
    created_by UUID NOT NULL REFERENCES usuarios(id),
    aprobado_por UUID REFERENCES usuarios(id),
    fecha_aprobacion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: solicitud_compra_items
-- =====================================================
CREATE TABLE solicitud_compra_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitud_compra_id UUID NOT NULL REFERENCES solicitudes_compra(id) ON DELETE CASCADE,
    requerimiento_item_id UUID REFERENCES requerimiento_items(id),
    material_id UUID NOT NULL REFERENCES materiales(id),
    cantidad DECIMAL(10,3) NOT NULL,
    precio_unitario DECIMAL(10,2),
    precio_total DECIMAL(12,2),
    especificaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: ordenes_compra (OC)
-- =====================================================
CREATE TABLE ordenes_compra (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_oc VARCHAR(20) UNIQUE NOT NULL,
    solicitud_compra_id UUID REFERENCES solicitudes_compra(id),
    obra_id UUID NOT NULL REFERENCES obras(id),
    proveedor VARCHAR(200) NOT NULL,
    ruc_proveedor VARCHAR(20),
    fecha_orden DATE NOT NULL,
    fecha_entrega_estimada DATE,
    fecha_entrega_real DATE,
    condiciones_pago VARCHAR(100),
    lugar_entrega TEXT,
    estado VARCHAR(20) DEFAULT 'EMITIDA' CHECK (estado IN ('EMITIDA', 'CONFIRMADA', 'EN_TRANSITO', 'ENTREGADA', 'CANCELADA')),
    subtotal DECIMAL(15,2),
    igv DECIMAL(15,2),
    total DECIMAL(15,2),
    observaciones TEXT,
    created_by UUID NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: orden_compra_items
-- =====================================================
CREATE TABLE orden_compra_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orden_compra_id UUID NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
    solicitud_item_id UUID REFERENCES solicitud_compra_items(id),
    material_id UUID NOT NULL REFERENCES materiales(id),
    cantidad DECIMAL(10,3) NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    precio_total DECIMAL(12,2) NOT NULL,
    especificaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: entradas (Ingresos al almacén)
-- =====================================================
CREATE TABLE entradas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_entrada VARCHAR(20) UNIQUE NOT NULL,
    orden_compra_id UUID REFERENCES ordenes_compra(id),
    obra_id UUID NOT NULL REFERENCES obras(id),
    fecha_entrada DATE NOT NULL,
    hora_entrada TIME DEFAULT CURRENT_TIME,
    proveedor VARCHAR(200),
    documento_referencia VARCHAR(50),
    transportista VARCHAR(200),
    placa_vehiculo VARCHAR(20),
    guia_remision VARCHAR(50),
    factura VARCHAR(50),
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'VERIFICADO', 'ALMACENADO', 'RECHAZADO')),
    recibido_por UUID NOT NULL REFERENCES usuarios(id),
    verificado_por UUID REFERENCES usuarios(id),
    fecha_verificacion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: entrada_items
-- =====================================================
CREATE TABLE entrada_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entrada_id UUID NOT NULL REFERENCES entradas(id) ON DELETE CASCADE,
    orden_item_id UUID REFERENCES orden_compra_items(id),
    material_id UUID NOT NULL REFERENCES materiales(id),
    cantidad_esperada DECIMAL(10,3),
    cantidad_recibida DECIMAL(10,3) NOT NULL,
    cantidad_aceptada DECIMAL(10,3),
    cantidad_rechazada DECIMAL(10,3) DEFAULT 0,
    precio_unitario DECIMAL(10,2),
    lote VARCHAR(50),
    fecha_vencimiento DATE,
    ubicacion_almacen VARCHAR(100),
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'RECIBIDO' CHECK (estado IN ('RECIBIDO', 'VERIFICADO', 'RECHAZADO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: salidas (Egresos del almacén)
-- =====================================================
CREATE TABLE salidas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_salida VARCHAR(20) UNIQUE NOT NULL,
    obra_id UUID NOT NULL REFERENCES obras(id),
    fecha_salida DATE NOT NULL,
    hora_salida TIME DEFAULT CURRENT_TIME,
    tipo_salida VARCHAR(20) DEFAULT 'CONSUMO' CHECK (tipo_salida IN ('CONSUMO', 'TRANSFERENCIA', 'DEVOLUCION', 'AJUSTE')),
    area_destino VARCHAR(100),
    responsable_recepcion VARCHAR(100),
    documento_referencia VARCHAR(50),
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'AUTORIZADO', 'ENTREGADO', 'CANCELADO')),
    solicitado_por UUID NOT NULL REFERENCES usuarios(id),
    autorizado_por UUID REFERENCES usuarios(id),
    entregado_por UUID REFERENCES usuarios(id),
    fecha_autorizacion TIMESTAMP WITH TIME ZONE,
    fecha_entrega TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: salida_items
-- =====================================================
CREATE TABLE salida_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salida_id UUID NOT NULL REFERENCES salidas(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materiales(id),
    cantidad_solicitada DECIMAL(10,3) NOT NULL,
    cantidad_autorizada DECIMAL(10,3),
    cantidad_entregada DECIMAL(10,3),
    precio_unitario DECIMAL(10,2),
    lote VARCHAR(50),
    ubicacion_almacen VARCHAR(100),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: stock_obra_material (Control de inventario)
-- =====================================================
CREATE TABLE stock_obra_material (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obra_id UUID NOT NULL REFERENCES obras(id),
    material_id UUID NOT NULL REFERENCES materiales(id),
    stock_actual DECIMAL(10,3) DEFAULT 0,
    stock_reservado DECIMAL(10,3) DEFAULT 0,
    stock_disponible DECIMAL(10,3) GENERATED ALWAYS AS (stock_actual - stock_reservado) STORED,
    costo_promedio DECIMAL(10,2) DEFAULT 0,
    valor_total DECIMAL(15,2) GENERATED ALWAYS AS (stock_actual * costo_promedio) STORED,
    ubicacion_principal VARCHAR(100),
    stock_minimo DECIMAL(10,3) DEFAULT 0,
    stock_maximo DECIMAL(10,3),
    ultima_entrada TIMESTAMP WITH TIME ZONE,
    ultima_salida TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(obra_id, material_id)
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para usuarios
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);

-- Índices para obras
CREATE INDEX idx_obras_codigo ON obras(codigo);
CREATE INDEX idx_obras_estado ON obras(estado);

-- Índices para materiales
CREATE INDEX idx_materiales_codigo ON materiales(codigo);
CREATE INDEX idx_materiales_categoria ON materiales(categoria);
CREATE INDEX idx_materiales_activo ON materiales(activo);

-- Índices para requerimientos
CREATE INDEX idx_requerimientos_numero ON requerimientos(numero_rq);
CREATE INDEX idx_requerimientos_obra ON requerimientos(obra_id);
CREATE INDEX idx_requerimientos_estado ON requerimientos(estado);
CREATE INDEX idx_requerimientos_fecha ON requerimientos(fecha_requerimiento);

-- Índices para solicitudes de compra
CREATE INDEX idx_solicitudes_numero ON solicitudes_compra(numero_sc);
CREATE INDEX idx_solicitudes_obra ON solicitudes_compra(obra_id);
CREATE INDEX idx_solicitudes_estado ON solicitudes_compra(estado);

-- Índices para órdenes de compra
CREATE INDEX idx_ordenes_numero ON ordenes_compra(numero_oc);
CREATE INDEX idx_ordenes_obra ON ordenes_compra(obra_id);
CREATE INDEX idx_ordenes_estado ON ordenes_compra(estado);

-- Índices para entradas
CREATE INDEX idx_entradas_numero ON entradas(numero_entrada);
CREATE INDEX idx_entradas_obra ON entradas(obra_id);
CREATE INDEX idx_entradas_fecha ON entradas(fecha_entrada);
CREATE INDEX idx_entradas_estado ON entradas(estado);

-- Índices para salidas
CREATE INDEX idx_salidas_numero ON salidas(numero_salida);
CREATE INDEX idx_salidas_obra ON salidas(obra_id);
CREATE INDEX idx_salidas_fecha ON salidas(fecha_salida);
CREATE INDEX idx_salidas_estado ON salidas(estado);

-- Índices para stock
CREATE INDEX idx_stock_obra_material ON stock_obra_material(obra_id, material_id);
CREATE INDEX idx_stock_material ON stock_obra_material(material_id);
CREATE INDEX idx_stock_bajo ON stock_obra_material(obra_id) WHERE stock_actual <= stock_minimo;

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas principales
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON obras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_materiales_updated_at BEFORE UPDATE ON materiales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requerimientos_updated_at BEFORE UPDATE ON requerimientos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requerimiento_items_updated_at BEFORE UPDATE ON requerimiento_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_solicitudes_compra_updated_at BEFORE UPDATE ON solicitudes_compra FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_solicitud_compra_items_updated_at BEFORE UPDATE ON solicitud_compra_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ordenes_compra_updated_at BEFORE UPDATE ON ordenes_compra FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orden_compra_items_updated_at BEFORE UPDATE ON orden_compra_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entradas_updated_at BEFORE UPDATE ON entradas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entrada_items_updated_at BEFORE UPDATE ON entrada_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salidas_updated_at BEFORE UPDATE ON salidas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salida_items_updated_at BEFORE UPDATE ON salida_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_updated_at BEFORE UPDATE ON stock_obra_material FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCIÓN PARA ACTUALIZAR STOCK AUTOMÁTICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_stock_entrada()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar stock cuando se confirma una entrada
    IF NEW.estado = 'VERIFICADO' AND OLD.estado != 'VERIFICADO' THEN
        -- Actualizar stock por cada item de la entrada
        UPDATE stock_obra_material 
        SET 
            stock_actual = stock_actual + ei.cantidad_aceptada,
            costo_promedio = CASE 
                WHEN stock_actual + ei.cantidad_aceptada > 0 THEN
                    ((stock_actual * costo_promedio) + (ei.cantidad_aceptada * ei.precio_unitario)) / (stock_actual + ei.cantidad_aceptada)
                ELSE ei.precio_unitario
            END,
            ultima_entrada = NOW()
        FROM entrada_items ei
        WHERE ei.entrada_id = NEW.id 
            AND stock_obra_material.obra_id = NEW.obra_id 
            AND stock_obra_material.material_id = ei.material_id;
        
        -- Crear registros de stock si no existen
        INSERT INTO stock_obra_material (obra_id, material_id, stock_actual, costo_promedio, ultima_entrada)
        SELECT NEW.obra_id, ei.material_id, ei.cantidad_aceptada, ei.precio_unitario, NOW()
        FROM entrada_items ei
        WHERE ei.entrada_id = NEW.id
            AND NOT EXISTS (
                SELECT 1 FROM stock_obra_material som 
                WHERE som.obra_id = NEW.obra_id AND som.material_id = ei.material_id
            );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_stock_entrada
    AFTER UPDATE ON entradas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_stock_entrada();

-- =====================================================
-- FUNCIÓN PARA ACTUALIZAR STOCK EN SALIDAS
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_stock_salida()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar stock cuando se confirma una salida
    IF NEW.estado = 'ENTREGADO' AND OLD.estado != 'ENTREGADO' THEN
        -- Reducir stock por cada item de la salida
        UPDATE stock_obra_material 
        SET 
            stock_actual = stock_actual - si.cantidad_entregada,
            ultima_salida = NOW()
        FROM salida_items si
        WHERE si.salida_id = NEW.id 
            AND stock_obra_material.obra_id = NEW.obra_id 
            AND stock_obra_material.material_id = si.material_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_stock_salida
    AFTER UPDATE ON salidas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_stock_salida();