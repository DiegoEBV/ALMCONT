-- Actualizar la estructura de la tabla requerimientos según los requerimientos del usuario
-- Agregar los campos faltantes y modificar los existentes

-- Agregar campos faltantes
ALTER TABLE requerimientos 
ADD COLUMN IF NOT EXISTS bloque TEXT,
ADD COLUMN IF NOT EXISTS empresa TEXT,
ADD COLUMN IF NOT EXISTS tipo TEXT,
ADD COLUMN IF NOT EXISTS material TEXT,
ADD COLUMN IF NOT EXISTS descripcion TEXT,
ADD COLUMN IF NOT EXISTS numero_requerimiento TEXT,
ADD COLUMN IF NOT EXISTS fecha_solicitud TIMESTAMP,
ADD COLUMN IF NOT EXISTS fecha_atencion TIMESTAMP,
ADD COLUMN IF NOT EXISTS unidad TEXT,
ADD COLUMN IF NOT EXISTS cantidad INTEGER,
ADD COLUMN IF NOT EXISTS cantidad_atendida FLOAT,
ADD COLUMN IF NOT EXISTS numero_solicitud_compra TEXT,
ADD COLUMN IF NOT EXISTS orden_compra TEXT,
ADD COLUMN IF NOT EXISTS proveedor TEXT,
ADD COLUMN IF NOT EXISTS precio_unitario FLOAT,
ADD COLUMN IF NOT EXISTS subtotal FLOAT;

-- Actualizar el campo solicitante para que sea opcional
ALTER TABLE requerimientos ALTER COLUMN solicitante DROP NOT NULL;

-- Actualizar el campo area_solicitante para que sea opcional
ALTER TABLE requerimientos ALTER COLUMN area_solicitante DROP NOT NULL;

-- Actualizar el campo fecha_requerimiento para que sea opcional
ALTER TABLE requerimientos ALTER COLUMN fecha_requerimiento DROP NOT NULL;

-- Actualizar el campo fecha_necesidad para que sea opcional
ALTER TABLE requerimientos ALTER COLUMN fecha_necesidad DROP NOT NULL;

-- Actualizar el campo obra_id para que sea opcional
ALTER TABLE requerimientos ALTER COLUMN obra_id DROP NOT NULL;

-- Actualizar el campo created_by para que sea opcional
ALTER TABLE requerimientos ALTER COLUMN created_by DROP NOT NULL;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_requerimientos_numero_requerimiento ON requerimientos(numero_requerimiento);
CREATE INDEX IF NOT EXISTS idx_requerimientos_bloque ON requerimientos(bloque);
CREATE INDEX IF NOT EXISTS idx_requerimientos_empresa ON requerimientos(empresa);
CREATE INDEX IF NOT EXISTS idx_requerimientos_estado ON requerimientos(estado);
CREATE INDEX IF NOT EXISTS idx_requerimientos_fecha_solicitud ON requerimientos(fecha_solicitud);

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN requerimientos.bloque IS 'Bloque o área del proyecto';
COMMENT ON COLUMN requerimientos.empresa IS 'Empresa solicitante';
COMMENT ON COLUMN requerimientos.tipo IS 'Tipo de requerimiento';
COMMENT ON COLUMN requerimientos.material IS 'Descripción del material';
COMMENT ON COLUMN requerimientos.descripcion IS 'Descripción detallada del requerimiento';
COMMENT ON COLUMN requerimientos.numero_requerimiento IS 'Número único del requerimiento';
COMMENT ON COLUMN requerimientos.fecha_solicitud IS 'Fecha de solicitud del requerimiento';
COMMENT ON COLUMN requerimientos.fecha_atencion IS 'Fecha de atención del requerimiento';
COMMENT ON COLUMN requerimientos.unidad IS 'Unidad de medida';
COMMENT ON COLUMN requerimientos.cantidad IS 'Cantidad solicitada';
COMMENT ON COLUMN requerimientos.cantidad_atendida IS 'Cantidad atendida';
COMMENT ON COLUMN requerimientos.numero_solicitud_compra IS 'Número de solicitud de compra';
COMMENT ON COLUMN requerimientos.orden_compra IS 'Número de orden de compra';
COMMENT ON COLUMN requerimientos.proveedor IS 'Proveedor del material';
COMMENT ON COLUMN requerimientos.precio_unitario IS 'Precio unitario del material';
COMMENT ON COLUMN requerimientos.subtotal IS 'Subtotal del requerimiento';