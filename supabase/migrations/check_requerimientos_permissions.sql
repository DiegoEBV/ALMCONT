-- Verificar permisos actuales para la tabla requerimientos
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'requerimientos' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Otorgar permisos básicos de lectura al rol anon
GRANT SELECT ON requerimientos TO anon;

-- Otorgar permisos completos al rol authenticated
GRANT ALL PRIVILEGES ON requerimientos TO authenticated;

-- Verificar permisos después de otorgarlos
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'requerimientos' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;