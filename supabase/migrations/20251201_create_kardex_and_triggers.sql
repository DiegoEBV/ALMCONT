-- Kardex y triggers de atomicidad para inventario

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla explícita de movimientos de kardex
CREATE TABLE IF NOT EXISTS kardex_movimiento (
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

CREATE INDEX IF NOT EXISTS idx_kardex_material_obra_fecha ON kardex_movimiento(material_id, obra_id, fecha_movimiento);

-- Función: inserta movimiento en kardex y actualiza stock (ENTRADA)
CREATE OR REPLACE FUNCTION fn_kardex_on_entrada_item_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_obra_id UUID;
  v_numero_entrada VARCHAR(50);
  v_usuario UUID;
  v_precio DECIMAL(10,2);
  v_qty DECIMAL(10,3);
  v_stock_actual DECIMAL(10,3);
  v_saldo_final DECIMAL(10,3);
BEGIN
  -- Obtener datos de cabecera de entrada
  SELECT e.obra_id, e.numero_entrada, e.recibido_por
    INTO v_obra_id, v_numero_entrada, v_usuario
  FROM entradas e
  WHERE e.id = NEW.entrada_id;

  v_precio := COALESCE(NEW.precio_unitario, 0);
  v_qty := COALESCE(NEW.cantidad_aceptada, NEW.cantidad_recibida, 0);

  -- Upsert de stock con costo promedio
  INSERT INTO stock_obra_material(obra_id, material_id, stock_actual, costo_promedio, ultima_entrada)
  VALUES (v_obra_id, NEW.material_id, v_qty, v_precio, NOW())
  ON CONFLICT (obra_id, material_id)
  DO UPDATE SET
    stock_actual = stock_obra_material.stock_actual + v_qty,
    costo_promedio = CASE 
      WHEN stock_obra_material.stock_actual + v_qty > 0 THEN 
        ((stock_obra_material.stock_actual * stock_obra_material.costo_promedio) + (v_qty * v_precio)) / (stock_obra_material.stock_actual + v_qty)
      ELSE v_precio
    END,
    ultima_entrada = NOW(),
    updated_at = NOW()
  RETURNING stock_obra_material.stock_actual INTO v_saldo_final;

  -- Insertar movimiento en kardex
  INSERT INTO kardex_movimiento(obra_id, material_id, tipo_movimiento, cantidad, fecha_movimiento, documento_referencia, observaciones, usuario_id, saldo_final)
  VALUES (v_obra_id, NEW.material_id, 'ENTRADA', v_qty, NOW(), v_numero_entrada, NEW.observaciones, v_usuario, v_saldo_final);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger AFTER INSERT en entrada_items
DROP TRIGGER IF EXISTS trg_kardex_on_entrada_item_insert ON entrada_items;
CREATE TRIGGER trg_kardex_on_entrada_item_insert
AFTER INSERT ON entrada_items
FOR EACH ROW EXECUTE FUNCTION fn_kardex_on_entrada_item_insert();

-- Función: inserta movimiento en kardex y actualiza stock (SALIDA)
CREATE OR REPLACE FUNCTION fn_kardex_on_salida_item_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_obra_id UUID;
  v_numero_salida VARCHAR(50);
  v_usuario UUID;
  v_qty DECIMAL(10,3);
  v_stock_actual DECIMAL(10,3);
  v_saldo_final DECIMAL(10,3);
BEGIN
  -- Obtener datos de cabecera de salida
  SELECT s.obra_id, s.numero_salida, s.solicitado_por
    INTO v_obra_id, v_numero_salida, v_usuario
  FROM salidas s
  WHERE s.id = NEW.salida_id;

  v_qty := COALESCE(NEW.cantidad_entregada, NEW.cantidad_autorizada, NEW.cantidad_solicitada, 0);

  -- Actualizar stock (no permitir negativo)
  UPDATE stock_obra_material AS som
  SET stock_actual = GREATEST(0, som.stock_actual - v_qty),
      ultima_salida = NOW(),
      updated_at = NOW()
  WHERE som.obra_id = v_obra_id AND som.material_id = NEW.material_id
  RETURNING som.stock_actual INTO v_saldo_final;

  -- Si no existía registro previo, crearlo con 0 y restar (queda 0)
  IF NOT FOUND THEN
    INSERT INTO stock_obra_material(obra_id, material_id, stock_actual, stock_minimo, ultima_salida)
    VALUES (v_obra_id, NEW.material_id, 0, 0, NOW())
    RETURNING stock_actual INTO v_saldo_final;
  END IF;

  -- Insertar movimiento en kardex
  INSERT INTO kardex_movimiento(obra_id, material_id, tipo_movimiento, cantidad, fecha_movimiento, documento_referencia, observaciones, usuario_id, saldo_final)
  VALUES (v_obra_id, NEW.material_id, 'SALIDA', -v_qty, NOW(), v_numero_salida, NEW.observaciones, v_usuario, v_saldo_final);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger AFTER INSERT en salida_items
DROP TRIGGER IF EXISTS trg_kardex_on_salida_item_insert ON salida_items;
CREATE TRIGGER trg_kardex_on_salida_item_insert
AFTER INSERT ON salida_items
FOR EACH ROW EXECUTE FUNCTION fn_kardex_on_salida_item_insert();

