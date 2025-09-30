-- Fix permissions for tables causing 406 errors
-- Grant permissions to anon and authenticated roles

-- Grant permissions for obras table
GRANT SELECT ON obras TO anon;
GRANT ALL PRIVILEGES ON obras TO authenticated;

-- Grant permissions for materiales table
GRANT SELECT ON materiales TO anon;
GRANT ALL PRIVILEGES ON materiales TO authenticated;

-- Grant permissions for solicitudes_compra table
GRANT SELECT ON solicitudes_compra TO anon;
GRANT ALL PRIVILEGES ON solicitudes_compra TO authenticated;

-- Check current permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND grantee IN ('anon', 'authenticated') 
  AND table_name IN ('obras', 'materiales', 'solicitudes_compra') 
ORDER BY table_name, grantee;