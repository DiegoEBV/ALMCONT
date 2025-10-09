-- =====================================================
-- TABLA: proveedores
-- Creación de la tabla de proveedores necesaria para el sistema de reorden automático
-- =====================================================

CREATE TABLE proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    razon_social VARCHAR(200),
    ruc VARCHAR(11) UNIQUE,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    contacto_principal VARCHAR(100),
    telefono_contacto VARCHAR(20),
    email_contacto VARCHAR(100),
    tipo_proveedor VARCHAR(50) DEFAULT 'MATERIALES' CHECK (tipo_proveedor IN ('MATERIALES', 'SERVICIOS', 'EQUIPOS', 'MIXTO')),
    categoria VARCHAR(100),
    calificacion INTEGER CHECK (calificacion BETWEEN 1 AND 5),
    condiciones_pago VARCHAR(100),
    tiempo_entrega_dias INTEGER DEFAULT 7,
    moneda_preferida VARCHAR(3) DEFAULT 'PEN',
    activo BOOLEAN DEFAULT true,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX idx_proveedores_codigo ON proveedores(codigo);
CREATE INDEX idx_proveedores_nombre ON proveedores(nombre);
CREATE INDEX idx_proveedores_ruc ON proveedores(ruc);
CREATE INDEX idx_proveedores_activo ON proveedores(activo);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_proveedores_updated_at 
    BEFORE UPDATE ON proveedores 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar algunos proveedores de ejemplo
INSERT INTO proveedores (codigo, nombre, razon_social, ruc, direccion, telefono, email, tipo_proveedor, categoria, calificacion, condiciones_pago, tiempo_entrega_dias) VALUES
('PROV001', 'Ferretería Central', 'Ferretería Central S.A.C.', '20123456789', 'Av. Industrial 123, Lima', '01-234-5678', 'ventas@ferreteriacentral.com', 'MATERIALES', 'FERRETERIA', 4, '30 días', 5),
('PROV002', 'Distribuidora Construcción', 'Distribuidora Construcción E.I.R.L.', '20987654321', 'Jr. Los Constructores 456, Lima', '01-876-5432', 'pedidos@distconstruccion.com', 'MATERIALES', 'CONSTRUCCION', 5, '15 días', 3),
('PROV003', 'Suministros Industriales', 'Suministros Industriales S.R.L.', '20456789123', 'Av. Faucett 789, Callao', '01-555-1234', 'contacto@sumindustriales.com', 'MATERIALES', 'INDUSTRIAL', 4, '45 días', 7),
('PROV004', 'Materiales Express', 'Materiales Express S.A.', '20321654987', 'Calle Comercio 321, San Isidro', '01-999-8888', 'info@materialesexpress.com', 'MATERIALES', 'GENERAL', 3, '30 días', 2),
('PROV005', 'Equipos y Herramientas', 'Equipos y Herramientas del Perú S.A.C.', '20147258369', 'Av. Argentina 147, Lima', '01-777-6666', 'ventas@equiposherramientas.com', 'EQUIPOS', 'HERRAMIENTAS', 5, '60 días', 10);

-- Configurar RLS (Row Level Security)
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a todos los usuarios autenticados
CREATE POLICY "Usuarios pueden ver proveedores" ON proveedores
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para permitir inserción/actualización solo a LOGISTICA y COORDINACION
CREATE POLICY "Solo LOGISTICA y COORDINACION pueden modificar proveedores" ON proveedores
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.rol IN ('LOGISTICA', 'COORDINACION')
            AND usuarios.activo = true
        )
    );