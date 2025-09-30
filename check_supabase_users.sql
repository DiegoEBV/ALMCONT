-- Consultar todos los usuarios registrados en Supabase Auth
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Buscar específicamente los usuarios de coordinación y logística
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email IN ('coordinador@obra.com', 'logistica@obra.com');