-- Check current permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Grant SELECT permissions to anon role for all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant full permissions to authenticated role for all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant usage on sequences to authenticated role
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Specific table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON materiales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON obras TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stock_obra_material TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON entradas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON entrada_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON salidas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON salida_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON requerimientos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON requerimiento_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ordenes_compra TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON orden_compra_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON solicitudes_compra TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON solicitud_compra_items TO authenticated;

-- Grant SELECT permissions to anon role for public data
GRANT SELECT ON materiales TO anon;
GRANT SELECT ON obras TO anon;
GRANT SELECT ON stock_obra_material TO anon;
GRANT SELECT ON entradas TO anon;
GRANT SELECT ON entrada_items TO anon;
GRANT SELECT ON salidas TO anon;
GRANT SELECT ON salida_items TO anon;
GRANT SELECT ON requerimientos TO anon;
GRANT SELECT ON requerimiento_items TO anon;
GRANT SELECT ON ordenes_compra TO anon;
GRANT SELECT ON orden_compra_items TO anon;
GRANT SELECT ON solicitudes_compra TO anon;
GRANT SELECT ON solicitud_compra_items TO anon;

-- Verify permissions after granting
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;