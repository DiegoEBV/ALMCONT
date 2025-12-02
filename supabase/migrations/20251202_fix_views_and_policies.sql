-- Fix funciones que consultan usuarios para evitar recursión RLS
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r user_role;
BEGIN
  SELECT rol INTO r FROM usuarios WHERE id = auth.uid();
  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION current_user_obra_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE o UUID;
BEGIN
  SELECT obra_id INTO o FROM usuarios WHERE id = auth.uid();
  RETURN o;
END;
$$;

GRANT EXECUTE ON FUNCTION current_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION current_user_obra_id() TO anon, authenticated;

-- Re-crear vistas si faltan
CREATE OR REPLACE VIEW materiales_requieren_reorden AS
SELECT 
    m.id,
    m.codigo,
    m.nombre,
    COALESCE(som.stock_actual, 0) as stock_actual,
    cr.stock_minimo,
    cr.punto_reorden,
    cr.cantidad_reorden,
    cr.lead_time_dias,
    p.nombre as proveedor_preferido
FROM materiales m
JOIN configuracion_reorden cr ON m.id = cr.material_id
LEFT JOIN proveedores p ON cr.proveedor_preferido = p.id
LEFT JOIN (
    SELECT material_id, SUM(stock_actual) as stock_actual
    FROM stock_obra_material
    GROUP BY material_id
) som ON m.id = som.material_id
WHERE cr.activo = true 
  AND COALESCE(som.stock_actual, 0) <= cr.punto_reorden;

CREATE OR REPLACE VIEW resumen_ubicaciones AS
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

CREATE OR REPLACE VIEW conteos_pendientes AS
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

COMMIT;

