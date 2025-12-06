-- Create Central Warehouse User
-- This script creates a test user for the ALMACEN_CENTRAL role

-- First, apply the migration to add the role if not already done
-- Run: npx supabase db push

-- Then create the user in Supabase Auth Dashboard or via SQL:
-- Email: almacen.central@eqpnp.com
-- Password: AlmacenCentral2024!

-- After creating the user in Auth, update the usuarios table:
-- Replace 'USER_UUID_HERE' with the actual UUID from auth.users

-- Example SQL to insert into usuarios table:
INSERT INTO usuarios (
    id,
    email,
    nombre,
    apellido,
    rol,
    obra_id,
    activo,
    created_at
) VALUES (
    'USER_UUID_FROM_AUTH',  -- Replace with actual UUID from auth.users
    'almacen.central@eqpnp.com',
    'Almacén',
    'Central',
    'ALMACEN_CENTRAL',
    NULL,  -- No specific obra, manages central warehouse
    true,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    rol = 'ALMACEN_CENTRAL',
    nombre = 'Almacén',
    apellido = 'Central',
    activo = true;

-- To find the user UUID after creating in Auth:
-- SELECT id, email FROM auth.users WHERE email = 'almacen.central@eqpnp.com';

-- Verify the user was created:
-- SELECT * FROM usuarios WHERE rol = 'ALMACEN_CENTRAL';
