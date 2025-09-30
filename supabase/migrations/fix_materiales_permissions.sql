-- Verificar y otorgar permisos para la tabla materiales
-- Fecha: 2024-01-15

-- Otorgar permisos de lectura a rol anon (usuarios no autenticados)
GRANT SELECT ON materiales TO anon;

-- Otorgar todos los permisos a rol authenticated (usuarios autenticados)
GRANT ALL PRIVILEGES ON materiales TO authenticated;

-- Verificar permisos actuales
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'materiales' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Verificar que hay datos en la tabla
SELECT COUNT(*) as total_materiales FROM materiales WHERE activo = true;

-- Mostrar algunos materiales de ejemplo
SELECT codigo, nombre, categoria, activo 
FROM materiales 
WHERE activo = true 
LIMIT 5;