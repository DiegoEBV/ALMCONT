-- Configurar permisos para todas las tablas del sistema de almacén
-- Otorgar permisos básicos a los roles anon y authenticated

-- Tabla: usuarios
GRANT SELECT ON usuarios TO anon;
GRANT ALL PRIVILEGES ON usuarios TO authenticated;

-- Tabla: obras
GRANT SELECT ON obras TO anon;
GRANT ALL PRIVILEGES ON obras TO authenticated;

-- Tabla: materiales
GRANT SELECT ON materiales TO anon;
GRANT ALL PRIVILEGES ON materiales TO authenticated;

-- Tabla: requerimientos
GRANT SELECT ON requerimientos TO anon;
GRANT ALL PRIVILEGES ON requerimientos TO authenticated;

-- Tabla: requerimiento_items
GRANT SELECT ON requerimiento_items TO anon;
GRANT ALL PRIVILEGES ON requerimiento_items TO authenticated;

-- Tabla: solicitudes_compra
GRANT SELECT ON solicitudes_compra TO anon;
GRANT ALL PRIVILEGES ON solicitudes_compra TO authenticated;

-- Tabla: solicitud_compra_items
GRANT SELECT ON solicitud_compra_items TO anon;
GRANT ALL PRIVILEGES ON solicitud_compra_items TO authenticated;

-- Tabla: ordenes_compra
GRANT SELECT ON ordenes_compra TO anon;
GRANT ALL PRIVILEGES ON ordenes_compra TO authenticated;

-- Tabla: orden_compra_items
GRANT SELECT ON orden_compra_items TO anon;
GRANT ALL PRIVILEGES ON orden_compra_items TO authenticated;

-- Tabla: entradas
GRANT SELECT ON entradas TO anon;
GRANT ALL PRIVILEGES ON entradas TO authenticated;

-- Tabla: entrada_items
GRANT SELECT ON entrada_items TO anon;
GRANT ALL PRIVILEGES ON entrada_items TO authenticated;

-- Tabla: salidas
GRANT SELECT ON salidas TO anon;
GRANT ALL PRIVILEGES ON salidas TO authenticated;

-- Tabla: salida_items
GRANT SELECT ON salida_items TO anon;
GRANT ALL PRIVILEGES ON salida_items TO authenticated;

-- Tabla: stock_obra_material
GRANT SELECT ON stock_obra_material TO anon;
GRANT ALL PRIVILEGES ON stock_obra_material TO authenticated;

-- Tabla: report_templates
GRANT SELECT ON report_templates TO anon;
GRANT ALL PRIVILEGES ON report_templates TO authenticated;

-- Tabla: template_instances
GRANT SELECT ON template_instances TO anon;
GRANT ALL PRIVILEGES ON template_instances TO authenticated;

-- Tabla: import_jobs
GRANT SELECT ON import_jobs TO anon;
GRANT ALL PRIVILEGES ON import_jobs TO authenticated;

-- Tabla: import_errors
GRANT SELECT ON import_errors TO anon;
GRANT ALL PRIVILEGES ON import_errors TO authenticated;

-- Tabla: import_templates
GRANT SELECT ON import_templates TO anon;
GRANT ALL PRIVILEGES ON import_templates TO authenticated;

-- Tabla: job_queue
GRANT SELECT ON job_queue TO anon;
GRANT ALL PRIVILEGES ON job_queue TO authenticated;

-- Tabla: validation_results
GRANT SELECT ON validation_results TO anon;
GRANT ALL PRIVILEGES ON validation_results TO authenticated;

-- Tabla: user_dashboards
GRANT SELECT ON user_dashboards TO anon;
GRANT ALL PRIVILEGES ON user_dashboards TO authenticated;

-- Tabla: user_preferences
GRANT SELECT ON user_preferences TO anon;
GRANT ALL PRIVILEGES ON user_preferences TO authenticated;

-- Tabla: delivery_routes
GRANT SELECT ON delivery_routes TO anon;
GRANT ALL PRIVILEGES ON delivery_routes TO authenticated;

-- Tabla: route_deliveries
GRANT SELECT ON route_deliveries TO anon;
GRANT ALL PRIVILEGES ON route_deliveries TO authenticated;

-- Tabla: supplier_price_history
GRANT SELECT ON supplier_price_history TO anon;
GRANT ALL PRIVILEGES ON supplier_price_history TO authenticated;

-- Tabla: framework_contracts
GRANT SELECT ON framework_contracts TO anon;
GRANT ALL PRIVILEGES ON framework_contracts TO authenticated;

-- Tabla: calculated_metrics
GRANT SELECT ON calculated_metrics TO anon;
GRANT ALL PRIVILEGES ON calculated_metrics TO authenticated;

-- Verificar permisos otorgados
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;