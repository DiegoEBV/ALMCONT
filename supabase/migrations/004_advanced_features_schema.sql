-- Migración para Funcionalidades Avanzadas del Sistema de Almacén
-- Fecha: 2024-01-20
-- Descripción: Agrega tablas y modificaciones para flujos de aprobación, reorden automático, 
--              ubicaciones físicas, inventario cíclico y gestión de devoluciones

-- =====================================================
-- 1. TABLA: reglas_aprobacion
-- =====================================================
CREATE TABLE reglas_aprobacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    tipo_regla VARCHAR(20) NOT NULL CHECK (tipo_regla IN ('monto', 'material', 'usuario', 'obra')),
    condicion JSONB NOT NULL,
    accion VARCHAR(20) NOT NULL CHECK (accion IN ('aprobar', 'rechazar', 'escalar')),
    aprobador_requerido UUID REFERENCES usuarios(id),
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABLA: aprobaciones
-- =====================================================
CREATE TABLE aprobaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id UUID NOT NULL,
    tipo_solicitud VARCHAR(20) NOT NULL CHECK (tipo_solicitud IN ('sc', 'entrada', 'salida')),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado_automaticamente', 'aprobado_manualmente', 'rechazado', 'en_escalamiento')),
    regla_aplicada UUID REFERENCES reglas_aprobacion(id),
    aprobador UUID REFERENCES usuarios(id),
    comentarios TEXT,
    fecha_aprobacion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABLA: configuracion_reorden
-- =====================================================
CREATE TABLE configuracion_reorden (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materiales(id) UNIQUE,
    stock_minimo INTEGER NOT NULL CHECK (stock_minimo >= 0),
    punto_reorden INTEGER NOT NULL CHECK (punto_reorden >= stock_minimo),
    cantidad_reorden INTEGER NOT NULL CHECK (cantidad_reorden > 0),
    lead_time_dias INTEGER DEFAULT 7 CHECK (lead_time_dias > 0),
    proveedor_preferido UUID REFERENCES proveedores(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TABLA: ubicaciones
-- =====================================================
CREATE TABLE ubicaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    almacen VARCHAR(10) NOT NULL,
    zona VARCHAR(10) NOT NULL,
    pasillo VARCHAR(10) NOT NULL,
    estante VARCHAR(10) NOT NULL,
    nivel VARCHAR(10) NOT NULL,
    posicion VARCHAR(10) NOT NULL,
    tipo_ubicacion VARCHAR(20) DEFAULT 'flotante' CHECK (tipo_ubicacion IN ('fija', 'flotante', 'picking', 'reserva', 'cuarentena')),
    capacidad_maxima INTEGER CHECK (capacidad_maxima > 0),
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. TABLA: stock_ubicaciones
-- =====================================================
CREATE TABLE stock_ubicaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materiales(id),
    ubicacion_id UUID REFERENCES ubicaciones(id),
    cantidad INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(material_id, ubicacion_id)
);

-- =====================================================
-- 6. TABLA: conteos_ciclicos
-- =====================================================
CREATE TABLE conteos_ciclicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_conteo VARCHAR(20) UNIQUE NOT NULL,
    tipo_conteo VARCHAR(20) NOT NULL CHECK (tipo_conteo IN ('abc', 'rotacion', 'aleatorio', 'ubicacion', 'excepcion')),
    estado VARCHAR(20) DEFAULT 'programado' CHECK (estado IN ('programado', 'en_proceso', 'completado', 'cancelado')),
    fecha_programada DATE NOT NULL,
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    contador_asignado UUID REFERENCES usuarios(id),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. TABLA: detalle_conteos
-- =====================================================
CREATE TABLE detalle_conteos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conteo_id UUID REFERENCES conteos_ciclicos(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materiales(id),
    ubicacion_id UUID REFERENCES ubicaciones(id),
    stock_teorico INTEGER NOT NULL CHECK (stock_teorico >= 0),
    stock_contado INTEGER CHECK (stock_contado >= 0),
    diferencia INTEGER,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'contado', 'ajustado', 'aprobado')),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. TABLA: devoluciones
-- =====================================================
CREATE TABLE devoluciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_devolucion VARCHAR(20) UNIQUE NOT NULL,
    tipo_devolucion VARCHAR(30) NOT NULL CHECK (tipo_devolucion IN ('devolucion_obra', 'material_defectuoso', 'devolucion_proveedor', 'material_reparacion', 'exceso_inventario')),
    estado VARCHAR(20) DEFAULT 'solicitada' CHECK (estado IN ('solicitada', 'en_transito', 'recibida', 'en_inspeccion', 'aprobada', 'rechazada', 'procesada')),
    obra_origen UUID REFERENCES obras(id),
    solicitante UUID REFERENCES usuarios(id),
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_recepcion TIMESTAMP WITH TIME ZONE,
    motivo TEXT NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. TABLA: detalle_devoluciones
-- =====================================================
CREATE TABLE detalle_devoluciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devolucion_id UUID REFERENCES devoluciones(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materiales(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    estado_material VARCHAR(20) NOT NULL CHECK (estado_material IN ('bueno', 'defectuoso', 'reparable')),
    accion_tomada VARCHAR(30) CHECK (accion_tomada IN ('reintegrar', 'reparar', 'descartar', 'devolver_proveedor', 'vender_usado')),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. MODIFICACIONES A TABLAS EXISTENTES
-- =====================================================

-- Agregar campos a la tabla materiales
ALTER TABLE materiales 
ADD COLUMN IF NOT EXISTS clasificacion_abc VARCHAR(1) DEFAULT 'C' CHECK (clasificacion_abc IN ('A', 'B', 'C')),
ADD COLUMN IF NOT EXISTS frecuencia_conteo INTEGER DEFAULT 180 CHECK (frecuencia_conteo > 0),
ADD COLUMN IF NOT EXISTS ultimo_conteo DATE,
ADD COLUMN IF NOT EXISTS material_critico BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requiere_aprobacion BOOLEAN DEFAULT false;

-- Agregar campos a la tabla solicitudes_compra
ALTER TABLE solicitudes_compra 
ADD COLUMN IF NOT EXISTS estado_aprobacion VARCHAR(20) DEFAULT 'pendiente' CHECK (estado_aprobacion IN ('pendiente', 'aprobado', 'rechazado')),
ADD COLUMN IF NOT EXISTS generada_automaticamente BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS configuracion_reorden_id UUID REFERENCES configuracion_reorden(id);

-- Agregar campos a la tabla entradas
ALTER TABLE entradas 
ADD COLUMN IF NOT EXISTS devolucion_id UUID REFERENCES devoluciones(id),
ADD COLUMN IF NOT EXISTS requiere_inspeccion BOOLEAN DEFAULT false;

-- Agregar campos a la tabla salidas
ALTER TABLE salidas 
ADD COLUMN IF NOT EXISTS ruta_picking JSONB;

-- =====================================================
-- 11. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para reglas_aprobacion
CREATE INDEX idx_reglas_aprobacion_tipo ON reglas_aprobacion(tipo_regla);
CREATE INDEX idx_reglas_aprobacion_activa ON reglas_aprobacion(activa);

-- Índices para aprobaciones
CREATE INDEX idx_aprobaciones_solicitud ON aprobaciones(solicitud_id, tipo_solicitud);
CREATE INDEX idx_aprobaciones_estado ON aprobaciones(estado);
CREATE INDEX idx_aprobaciones_aprobador ON aprobaciones(aprobador);

-- Índices para configuracion_reorden
CREATE INDEX idx_configuracion_reorden_material ON configuracion_reorden(material_id);
CREATE INDEX idx_configuracion_reorden_activo ON configuracion_reorden(activo);

-- Índices para ubicaciones
CREATE INDEX idx_ubicaciones_codigo ON ubicaciones(codigo);
CREATE INDEX idx_ubicaciones_zona ON ubicaciones(zona);
CREATE INDEX idx_ubicaciones_tipo ON ubicaciones(tipo_ubicacion);
CREATE INDEX idx_ubicaciones_activa ON ubicaciones(activa);

-- Índices para stock_ubicaciones
CREATE INDEX idx_stock_ubicaciones_material ON stock_ubicaciones(material_id);
CREATE INDEX idx_stock_ubicaciones_ubicacion ON stock_ubicaciones(ubicacion_id);

-- Índices para conteos_ciclicos
CREATE INDEX idx_conteos_ciclicos_estado ON conteos_ciclicos(estado);
CREATE INDEX idx_conteos_ciclicos_fecha ON conteos_ciclicos(fecha_programada);
CREATE INDEX idx_conteos_ciclicos_contador ON conteos_ciclicos(contador_asignado);

-- Índices para detalle_conteos
CREATE INDEX idx_detalle_conteos_conteo ON detalle_conteos(conteo_id);
CREATE INDEX idx_detalle_conteos_material ON detalle_conteos(material_id);
CREATE INDEX idx_detalle_conteos_estado ON detalle_conteos(estado);

-- Índices para devoluciones
CREATE INDEX idx_devoluciones_estado ON devoluciones(estado);
CREATE INDEX idx_devoluciones_obra ON devoluciones(obra_origen);
CREATE INDEX idx_devoluciones_solicitante ON devoluciones(solicitante);
CREATE INDEX idx_devoluciones_fecha ON devoluciones(fecha_solicitud);

-- Índices para detalle_devoluciones
CREATE INDEX idx_detalle_devoluciones_devolucion ON detalle_devoluciones(devolucion_id);
CREATE INDEX idx_detalle_devoluciones_material ON detalle_devoluciones(material_id);

-- =====================================================
-- 12. TRIGGERS PARA AUDITORÍA
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_reglas_aprobacion_updated_at BEFORE UPDATE ON reglas_aprobacion FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_configuracion_reorden_updated_at BEFORE UPDATE ON configuracion_reorden FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ubicaciones_updated_at BEFORE UPDATE ON ubicaciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_ubicaciones_updated_at BEFORE UPDATE ON stock_ubicaciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conteos_ciclicos_updated_at BEFORE UPDATE ON conteos_ciclicos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_detalle_conteos_updated_at BEFORE UPDATE ON detalle_conteos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devoluciones_updated_at BEFORE UPDATE ON devoluciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_detalle_devoluciones_updated_at BEFORE UPDATE ON detalle_devoluciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 13. FUNCIONES AUXILIARES
-- =====================================================

-- Función para generar código de ubicación
CREATE OR REPLACE FUNCTION generar_codigo_ubicacion(
    p_almacen VARCHAR(10),
    p_zona VARCHAR(10),
    p_pasillo VARCHAR(10),
    p_estante VARCHAR(10),
    p_nivel VARCHAR(10),
    p_posicion VARCHAR(10)
)
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN CONCAT(p_almacen, '-', p_zona, '-', p_pasillo, '-', p_estante, '-', p_nivel, '-', p_posicion);
END;
$$ LANGUAGE plpgsql;

-- Función para calcular diferencia en conteos
CREATE OR REPLACE FUNCTION calcular_diferencia_conteo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock_contado IS NOT NULL THEN
        NEW.diferencia = NEW.stock_contado - NEW.stock_teorico;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular diferencia automáticamente
CREATE TRIGGER trigger_calcular_diferencia_conteo 
    BEFORE INSERT OR UPDATE ON detalle_conteos 
    FOR EACH ROW EXECUTE FUNCTION calcular_diferencia_conteo();

-- =====================================================
-- 14. VISTAS ÚTILES
-- =====================================================

-- Vista para materiales que requieren reorden
CREATE VIEW materiales_requieren_reorden AS
SELECT 
    m.id,
    m.codigo,
    m.nombre,
    m.stock_actual,
    cr.stock_minimo,
    cr.punto_reorden,
    cr.cantidad_reorden,
    cr.lead_time_dias,
    p.nombre as proveedor_preferido
FROM materiales m
JOIN configuracion_reorden cr ON m.id = cr.material_id
LEFT JOIN proveedores p ON cr.proveedor_preferido = p.id
WHERE cr.activo = true 
  AND m.stock_actual <= cr.punto_reorden;

-- Vista para resumen de ubicaciones
CREATE VIEW resumen_ubicaciones AS
SELECT 
    u.id,
    u.codigo,
    u.almacen,
    u.zona,
    u.tipo_ubicacion,
    COUNT(su.material_id) as materiales_asignados,
    SUM(su.cantidad) as cantidad_total,
    u.capacidad_maxima,
    CASE 
        WHEN u.capacidad_maxima IS NOT NULL THEN 
            ROUND((SUM(su.cantidad)::DECIMAL / u.capacidad_maxima) * 100, 2)
        ELSE NULL 
    END as porcentaje_ocupacion
FROM ubicaciones u
LEFT JOIN stock_ubicaciones su ON u.id = su.ubicacion_id
WHERE u.activa = true
GROUP BY u.id, u.codigo, u.almacen, u.zona, u.tipo_ubicacion, u.capacidad_maxima;

-- Vista para conteos pendientes
CREATE VIEW conteos_pendientes AS
SELECT 
    cc.id,
    cc.numero_conteo,
    cc.tipo_conteo,
    cc.fecha_programada,
    u.nombre as contador_asignado,
    COUNT(dc.id) as total_items,
    COUNT(CASE WHEN dc.estado = 'contado' THEN 1 END) as items_contados,
    ROUND(
        (COUNT(CASE WHEN dc.estado = 'contado' THEN 1 END)::DECIMAL / COUNT(dc.id)) * 100, 2
    ) as porcentaje_completado
FROM conteos_ciclicos cc
LEFT JOIN usuarios u ON cc.contador_asignado = u.id
LEFT JOIN detalle_conteos dc ON cc.id = dc.conteo_id
WHERE cc.estado IN ('programado', 'en_proceso')
GROUP BY cc.id, cc.numero_conteo, cc.tipo_conteo, cc.fecha_programada, u.nombre;

-- =====================================================
-- 15. DATOS INICIALES
-- =====================================================

-- Reglas de aprobación por defecto
INSERT INTO reglas_aprobacion (nombre, tipo_regla, condicion, accion) VALUES
('Aprobación Automática Montos Menores', 'monto', '{"monto_maximo": 1000}', 'aprobar'),
('Escalamiento Montos Medios', 'monto', '{"monto_minimo": 1000, "monto_maximo": 5000}', 'escalar'),
('Escalamiento Montos Altos', 'monto', '{"monto_minimo": 5000}', 'escalar'),
('Aprobación Manual Materiales Críticos', 'material', '{"material_critico": true}', 'escalar');

-- Ubicaciones de ejemplo
INSERT INTO ubicaciones (codigo, almacen, zona, pasillo, estante, nivel, posicion, tipo_ubicacion, capacidad_maxima) VALUES
('A01-A-01-E1-N1-P1', 'A01', 'A', '01', 'E1', 'N1', 'P1', 'picking', 100),
('A01-A-01-E1-N1-P2', 'A01', 'A', '01', 'E1', 'N1', 'P2', 'picking', 100),
('A01-A-01-E1-N2-P1', 'A01', 'A', '01', 'E1', 'N2', 'P1', 'flotante', 200),
('A01-A-01-E1-N2-P2', 'A01', 'A', '01', 'E1', 'N2', 'P2', 'flotante', 200),
('A01-B-01-E1-N1-P1', 'A01', 'B', '01', 'E1', 'N1', 'P1', 'reserva', 500),
('A01-C-01-E1-N1-P1', 'A01', 'C', '01', 'E1', 'N1', 'P1', 'cuarentena', 50);

COMMIT;