-- Create the requerimientos table with the exact structure provided
CREATE TABLE requerimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloque TEXT,
  empresa TEXT,
  tipo TEXT,
  material TEXT,
  descripcion TEXT,
  numero_requerimiento TEXT,
  fecha_solicitud TIMESTAMP,
  fecha_atencion TIMESTAMP,
  unidad TEXT,
  cantidad INTEGER,
  cantidad_atendida FLOAT,
  solicitante TEXT,
  numero_solicitud_compra TEXT,
  orden_compra TEXT,
  proveedor TEXT,
  estado TEXT,
  observaciones TEXT,
  precio_unitario FLOAT,
  subtotal FLOAT
);

-- Enable RLS
ALTER TABLE requerimientos ENABLE ROW LEVEL SECURITY;

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON requerimientos TO anon;
GRANT ALL PRIVILEGES ON requerimientos TO authenticated;