CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('COORDINACION','LOGISTICA','ALMACENERO','PRODUCCION','RESIDENTE','ADMIN');

CREATE TABLE obras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  ubicacion VARCHAR(300),
  fecha_inicio DATE,
  fecha_fin_estimada DATE,
  estado VARCHAR(20) DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA','PAUSADA','FINALIZADA','CANCELADA')),
  presupuesto DECIMAL(15,2),
  responsable_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE materiales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(100) NOT NULL,
  subcategoria VARCHAR(100),
  unidad_medida VARCHAR(20) NOT NULL,
  precio_unitario DECIMAL(10,2),
  stock_minimo DECIMAL(10,3) DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  rol user_role NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  obra_id UUID REFERENCES obras(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE requerimientos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_requerimiento VARCHAR(20) UNIQUE NOT NULL,
  obra_id UUID NOT NULL REFERENCES obras(id),
  fecha_solicitud DATE NOT NULL,
  fecha_necesidad DATE,
  solicitante VARCHAR(100),
  area_solicitante VARCHAR(100),
  prioridad VARCHAR(20) DEFAULT 'MEDIA' CHECK (prioridad IN ('BAJA','MEDIA','ALTA','URGENTE')),
  estado VARCHAR(30) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','ASIGNADO','EN_PROCESO','ATENDIDO','CANCELADO','ATENDER_STOCK_INTERNO')),
  observaciones TEXT,
  aprobado_por UUID REFERENCES usuarios(id),
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE solicitudes_compra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_sc VARCHAR(20) UNIQUE NOT NULL,
  requerimiento_id UUID REFERENCES requerimientos(id),
  obra_id UUID NOT NULL REFERENCES obras(id),
  fecha_solicitud DATE NOT NULL,
  fecha_necesidad DATE,
  proveedor VARCHAR(200),
  justificacion TEXT,
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','ASIGNADA','ATENDIDA','CANCELADA')),
  total_estimado DECIMAL(15,2),
  observaciones TEXT,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  aprobado_por UUID REFERENCES usuarios(id),
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE ordenes_compra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oc_numero VARCHAR(20) UNIQUE NOT NULL,
  sc_id UUID REFERENCES solicitudes_compra(id),
  obra_id UUID NOT NULL REFERENCES obras(id),
  proveedor VARCHAR(200) NOT NULL,
  fecha_orden DATE NOT NULL,
  fecha_entrega_estimada DATE,
  fecha_entrega_real DATE,
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','APROBADA','ENVIADA','RECIBIDA','CANCELADA')),
  subtotal DECIMAL(15,2),
  igv DECIMAL(15,2),
  total DECIMAL(15,2),
  moneda VARCHAR(3) DEFAULT 'PEN',
  condiciones_pago VARCHAR(100),
  observaciones TEXT,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE orden_compra_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oc_id UUID NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  solicitud_item_id UUID REFERENCES solicitud_compra_items(id),
  material_id UUID NOT NULL REFERENCES materiales(id),
  cantidad DECIMAL(10,3) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  precio_total DECIMAL(12,2) NOT NULL,
  especificaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE entradas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_entrada VARCHAR(20) UNIQUE NOT NULL,
  oc_id UUID REFERENCES ordenes_compra(id),
  obra_id UUID NOT NULL REFERENCES obras(id),
  fecha_entrada DATE NOT NULL,
  hora_entrada TIME DEFAULT CURRENT_TIME,
  proveedor VARCHAR(200),
  documento_referencia VARCHAR(50),
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','VERIFICADO','ALMACENADO','RECHAZADO')),
  recibido_por UUID NOT NULL REFERENCES usuarios(id),
  verificado_por UUID REFERENCES usuarios(id),
  fecha_verificacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE entrada_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entrada_id UUID NOT NULL REFERENCES entradas(id) ON DELETE CASCADE,
  oc_item_id UUID REFERENCES orden_compra_items(id),
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
  estado VARCHAR(20) DEFAULT 'RECIBIDO' CHECK (estado IN ('RECIBIDO','VERIFICADO','RECHAZADO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE salidas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_salida VARCHAR(20) UNIQUE NOT NULL,
  obra_id UUID NOT NULL REFERENCES obras(id),
  fecha_salida DATE NOT NULL,
  hora_salida TIME DEFAULT CURRENT_TIME,
  tipo_salida VARCHAR(20) DEFAULT 'CONSUMO' CHECK (tipo_salida IN ('CONSUMO','TRANSFERENCIA','DEVOLUCION','AJUSTE')),
  area_destino VARCHAR(100),
  responsable_recepcion VARCHAR(100),
  documento_referencia VARCHAR(50),
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','AUTORIZADO','ENTREGADO','CANCELADO')),
  solicitado_por UUID NOT NULL REFERENCES usuarios(id),
  autorizado_por UUID REFERENCES usuarios(id),
  entregado_por UUID REFERENCES usuarios(id),
  fecha_autorizacion TIMESTAMP WITH TIME ZONE,
  fecha_entrega TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
  UNIQUE (obra_id, material_id)
);

CREATE TABLE aprobaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(50) NOT NULL,
  referencia_id UUID NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado')),
  solicitante_id UUID NOT NULL REFERENCES usuarios(id),
  aprobador_id UUID REFERENCES usuarios(id),
  fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_respuesta TIMESTAMP WITH TIME ZONE,
  comentarios TEXT,
  datos_solicitud JSONB,
  nivel_aprobacion INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE kardex_movimiento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id UUID NOT NULL,
  material_id UUID NOT NULL,
  tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('ENTRADA','SALIDA','TRANSFERENCIA','AJUSTE')),
  cantidad DECIMAL(10,3) NOT NULL,
  fecha_movimiento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  documento_referencia VARCHAR(50),
  observaciones TEXT,
  usuario_id UUID,
  saldo_final DECIMAL(10,3) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE rq_sc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rq_id UUID NOT NULL REFERENCES requerimientos(id) ON DELETE CASCADE,
  sc_id UUID NOT NULL REFERENCES solicitudes_compra(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sc_oc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sc_id UUID NOT NULL REFERENCES solicitudes_compra(id) ON DELETE CASCADE,
  oc_id UUID NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_obras_codigo ON obras(codigo);
CREATE INDEX idx_materiales_codigo ON materiales(codigo);
CREATE INDEX idx_requerimientos_numero ON requerimientos(numero_requerimiento);
CREATE INDEX idx_solicitudes_numero ON solicitudes_compra(numero_sc);
CREATE INDEX idx_ordenes_numero ON ordenes_compra(oc_numero);
CREATE INDEX idx_kardex_material_obra_fecha ON kardex_movimiento(material_id, obra_id, fecha_movimiento);
CREATE INDEX idx_stock_obra_material ON stock_obra_material(obra_id, material_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON obras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_materiales_updated_at BEFORE UPDATE ON materiales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requerimientos_updated_at BEFORE UPDATE ON requerimientos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requerimiento_items_updated_at BEFORE UPDATE ON requerimiento_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_solicitudes_updated_at BEFORE UPDATE ON solicitudes_compra FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_solicitud_items_updated_at BEFORE UPDATE ON solicitud_compra_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ordenes_updated_at BEFORE UPDATE ON ordenes_compra FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orden_items_updated_at BEFORE UPDATE ON orden_compra_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entradas_updated_at BEFORE UPDATE ON entradas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entrada_items_updated_at BEFORE UPDATE ON entrada_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salidas_updated_at BEFORE UPDATE ON salidas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salida_items_updated_at BEFORE UPDATE ON salida_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_updated_at BEFORE UPDATE ON stock_obra_material FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION fn_kardex_on_entrada_item_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_obra_id UUID;
  v_numero_entrada VARCHAR(50);
  v_usuario UUID;
  v_precio DECIMAL(10,2);
  v_qty DECIMAL(10,3);
  v_saldo_final DECIMAL(10,3);
BEGIN
  SELECT e.obra_id, e.numero_entrada, e.recibido_por INTO v_obra_id, v_numero_entrada, v_usuario FROM entradas e WHERE e.id = NEW.entrada_id;
  v_precio := COALESCE(NEW.precio_unitario, 0);
  v_qty := COALESCE(NEW.cantidad_aceptada, NEW.cantidad_recibida, 0);
  INSERT INTO stock_obra_material(obra_id, material_id, stock_actual, costo_promedio, ultima_entrada)
  VALUES (v_obra_id, NEW.material_id, v_qty, v_precio, NOW())
  ON CONFLICT (obra_id, material_id)
  DO UPDATE SET stock_actual = stock_obra_material.stock_actual + v_qty,
                costo_promedio = CASE WHEN stock_obra_material.stock_actual + v_qty > 0 THEN ((stock_obra_material.stock_actual * stock_obra_material.costo_promedio) + (v_qty * v_precio)) / (stock_obra_material.stock_actual + v_qty) ELSE v_precio END,
                ultima_entrada = NOW(),
                updated_at = NOW()
  RETURNING stock_obra_material.stock_actual INTO v_saldo_final;
  INSERT INTO kardex_movimiento(obra_id, material_id, tipo_movimiento, cantidad, fecha_movimiento, documento_referencia, observaciones, usuario_id, saldo_final)
  VALUES (v_obra_id, NEW.material_id, 'ENTRADA', v_qty, NOW(), v_numero_entrada, NEW.observaciones, v_usuario, v_saldo_final);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kardex_on_entrada_item_insert ON entrada_items;
CREATE TRIGGER trg_kardex_on_entrada_item_insert AFTER INSERT ON entrada_items FOR EACH ROW EXECUTE FUNCTION fn_kardex_on_entrada_item_insert();

CREATE OR REPLACE FUNCTION fn_kardex_on_salida_item_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_obra_id UUID;
  v_numero_salida VARCHAR(50);
  v_usuario UUID;
  v_qty DECIMAL(10,3);
  v_saldo_final DECIMAL(10,3);
BEGIN
  SELECT s.obra_id, s.numero_salida, s.solicitado_por INTO v_obra_id, v_numero_salida, v_usuario FROM salidas s WHERE s.id = NEW.salida_id;
  v_qty := COALESCE(NEW.cantidad_entregada, NEW.cantidad_autorizada, NEW.cantidad_solicitada, 0);
  UPDATE stock_obra_material AS som SET stock_actual = GREATEST(0, som.stock_actual - v_qty), ultima_salida = NOW(), updated_at = NOW()
  WHERE som.obra_id = v_obra_id AND som.material_id = NEW.material_id RETURNING som.stock_actual INTO v_saldo_final;
  IF NOT FOUND THEN
    INSERT INTO stock_obra_material(obra_id, material_id, stock_actual, stock_minimo, ultima_salida) VALUES (v_obra_id, NEW.material_id, 0, 0, NOW()) RETURNING stock_actual INTO v_saldo_final;
  END IF;
  INSERT INTO kardex_movimiento(obra_id, material_id, tipo_movimiento, cantidad, fecha_movimiento, documento_referencia, observaciones, usuario_id, saldo_final)
  VALUES (v_obra_id, NEW.material_id, 'SALIDA', -v_qty, NOW(), v_numero_salida, NEW.observaciones, v_usuario, v_saldo_final);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kardex_on_salida_item_insert ON salida_items;
CREATE TRIGGER trg_kardex_on_salida_item_insert AFTER INSERT ON salida_items FOR EACH ROW EXECUTE FUNCTION fn_kardex_on_salida_item_insert();

CREATE OR REPLACE FUNCTION current_user_role() RETURNS user_role AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_user_obra_id() RETURNS UUID AS $$
  SELECT obra_id FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

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
ALTER TABLE aprobaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE kardex_movimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE rq_sc ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_oc ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuarios_self_read ON usuarios FOR SELECT USING (id = auth.uid() OR (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','COORDINACION','LOGISTICA'));
CREATE POLICY usuarios_admin_write ON usuarios FOR ALL USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'ADMIN') WITH CHECK ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY obras_read_by_role ON obras FOR SELECT USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','COORDINACION','LOGISTICA','ALMACENERO','PRODUCCION','RESIDENTE'));

CREATE POLICY materiales_read_by_role ON materiales FOR SELECT USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','COORDINACION','LOGISTICA','ALMACENERO','PRODUCCION','RESIDENTE'));

CREATE POLICY req_select_role_or_obra ON requerimientos FOR SELECT USING (((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','COORDINACION','LOGISTICA')) OR obra_id = current_user_obra_id());
CREATE POLICY req_insert_produccion ON requerimientos FOR INSERT WITH CHECK ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('PRODUCCION','COORDINACION'));
CREATE POLICY req_update_coord ON requerimientos FOR UPDATE USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('COORDINACION','ADMIN'));

CREATE POLICY rq_items_select ON requerimiento_items FOR SELECT USING (requerimiento_id IN (SELECT id FROM requerimientos WHERE ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','COORDINACION','LOGISTICA')) OR obra_id = current_user_obra_id()));
CREATE POLICY rq_items_write_coord ON requerimiento_items FOR ALL USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('COORDINACION','ADMIN')) WITH CHECK ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('COORDINACION','ADMIN'));

CREATE POLICY sc_select_role_or_obra ON solicitudes_compra FOR SELECT USING (((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','COORDINACION','LOGISTICA')) OR obra_id = current_user_obra_id());
CREATE POLICY sc_insert_coord ON solicitudes_compra FOR INSERT WITH CHECK ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'COORDINACION');
CREATE POLICY sc_update_coord ON solicitudes_compra FOR UPDATE USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'COORDINACION');

CREATE POLICY oc_select_role_or_obra ON ordenes_compra FOR SELECT USING (((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','COORDINACION','LOGISTICA')) OR obra_id = current_user_obra_id());
CREATE POLICY oc_insert_log ON ordenes_compra FOR INSERT WITH CHECK ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'LOGISTICA');
CREATE POLICY oc_update_log ON ordenes_compra FOR UPDATE USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'LOGISTICA');

CREATE POLICY entradas_select_role_or_obra ON entradas FOR SELECT USING (((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA')) OR obra_id = current_user_obra_id());
CREATE POLICY entradas_insert_alm ON entradas FOR INSERT WITH CHECK ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'ALMACENERO');
CREATE POLICY entradas_update_alm ON entradas FOR UPDATE USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'ALMACENERO');

CREATE POLICY entrada_items_select ON entrada_items FOR SELECT USING (entrada_id IN (SELECT id FROM entradas WHERE ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA')) OR obra_id = current_user_obra_id()));
CREATE POLICY entrada_items_insert_alm ON entrada_items FOR INSERT WITH CHECK ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'ALMACENERO');

CREATE POLICY salidas_select_role_or_obra ON salidas FOR SELECT USING (((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA')) OR obra_id = current_user_obra_id());
CREATE POLICY salidas_insert_alm ON salidas FOR INSERT WITH CHECK ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'ALMACENERO');
CREATE POLICY salidas_update_alm ON salidas FOR UPDATE USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'ALMACENERO');

CREATE POLICY salida_items_select ON salida_items FOR SELECT USING (salida_id IN (SELECT id FROM salidas WHERE ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA')) OR obra_id = current_user_obra_id()));
CREATE POLICY salida_items_insert_alm ON salida_items FOR INSERT WITH CHECK ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'ALMACENERO');

CREATE POLICY stock_select_role_or_obra ON stock_obra_material FOR SELECT USING (((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA')) OR obra_id = current_user_obra_id());
CREATE POLICY stock_update_system ON stock_obra_material FOR UPDATE USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA'));

CREATE POLICY kardex_select_role_or_obra ON kardex_movimiento FOR SELECT USING (((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA')) OR obra_id = current_user_obra_id());

