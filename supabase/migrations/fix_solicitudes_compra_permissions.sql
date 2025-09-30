-- Verificar permisos actuales para solicitudes_compra
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'solicitudes_compra'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Otorgar permisos de lectura a anon para solicitudes_compra
GRANT SELECT ON solicitudes_compra TO anon;

-- Otorgar todos los permisos a authenticated para solicitudes_compra
GRANT ALL PRIVILEGES ON solicitudes_compra TO authenticated;

-- Verificar permisos después de otorgarlos
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'solicitudes_compra'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;