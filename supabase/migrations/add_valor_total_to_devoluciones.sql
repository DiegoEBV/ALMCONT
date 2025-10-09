-- Agregar columna valor_total a la tabla devoluciones
ALTER TABLE devoluciones 
ADD COLUMN valor_total DECIMAL(10,2) DEFAULT 0.00;

-- Actualizar valores existentes calculando el total desde detalle_devoluciones
UPDATE devoluciones 
SET valor_total = (
    SELECT COALESCE(SUM(dd.cantidad * m.precio_unitario), 0)
    FROM detalle_devoluciones dd
    JOIN materiales m ON dd.material_id = m.id
    WHERE dd.devolucion_id = devoluciones.id
);

-- Crear función para actualizar automáticamente el valor_total
CREATE OR REPLACE FUNCTION update_devolucion_valor_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE devoluciones 
    SET valor_total = (
        SELECT COALESCE(SUM(dd.cantidad * m.precio_unitario), 0)
        FROM detalle_devoluciones dd
        JOIN materiales m ON dd.material_id = m.id
        WHERE dd.devolucion_id = NEW.devolucion_id
    )
    WHERE id = NEW.devolucion_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar valor_total automáticamente
DROP TRIGGER IF EXISTS trigger_update_devolucion_valor_total ON detalle_devoluciones;
CREATE TRIGGER trigger_update_devolucion_valor_total
    AFTER INSERT OR UPDATE OR DELETE ON detalle_devoluciones
    FOR EACH ROW
    EXECUTE FUNCTION update_