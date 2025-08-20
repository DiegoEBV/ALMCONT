-- Verificar permisos actuales
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('materiales', 'requerimientos') 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Otorgar permisos para la tabla materiales
GRANT SELECT ON materiales TO anon;
GRANT ALL PRIVILEGES ON materiales TO authenticated;

-- Otorgar permisos para la tabla requerimientos
GRANT SELECT ON requerimientos TO anon;
GRANT ALL PRIVILEGES ON requerimientos TO authenticated;

-- Verificar permisos después de otorgarlos
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('materiales', 'requerimientos') 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;