# Credenciales de Usuario Almacén Central

## Información de Acceso

**Email**: `almacen.central@eqpnp.com`  
**Contraseña**: `AlmacenCentral2024!`  
**Rol**: ALMACEN_CENTRAL

## Pasos para Crear el Usuario

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. Ir a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navegar a **Authentication** → **Users**
3. Click en **Add User** → **Create new user**
4. Ingresar:
   - Email: `almacen.central@eqpnp.com`
   - Password: `AlmacenCentral2024!`
   - ✅ Auto Confirm User
5. Click **Create user**
6. **Copiar el UUID** del usuario creado
7. Ejecutar en SQL Editor:

```sql
INSERT INTO usuarios (
    id,
    email,
    nombre,
    apellido,
    rol,
    obra_id,
    activo
) VALUES (
    '52832077-f824-4cdc-89d1-12645750b013',
    'almacen.central@eqpnp.com',
    'Almacén',
    'Central',
    'ALMACEN_CENTRAL',
    NULL,
    true
) ON CONFLICT (id) DO UPDATE SET
    rol = 'ALMACEN_CENTRAL',
    nombre = 'Almacén',
    apellido = 'Central',
    activo = true;
```

### Opción 2: Desde la Aplicación

1. Asegurarse de que la migración `007_add_central_warehouse_role.sql` esté aplicada:
   ```bash
   npx supabase db push
   ```

2. Crear el usuario desde la interfaz de registro de la aplicación
3. Luego actualizar su rol en la base de datos:
   ```sql
   UPDATE usuarios 
   SET rol = 'ALMACEN_CENTRAL', 
       nombre = 'Almacén Central'
   WHERE email = 'almacen.central@eqpnp.com';
   ```

## Verificación

Para verificar que el usuario fue creado correctamente:

```sql
-- Ver usuario en auth
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'almacen.central@eqpnp.com';

-- Ver usuario en tabla usuarios
SELECT id, email, nombre, rol, activo 
FROM usuarios 
WHERE rol = 'ALMACEN_CENTRAL';
```

## Permisos del Usuario

El usuario ALMACEN_CENTRAL tiene acceso a:

✅ Crear y editar materiales  
✅ Registrar entradas de material  
✅ Registrar salidas/transferencias a obras  
✅ Ver inventario completo del almacén central  
✅ Ver historial de movimientos  
✅ Gestionar transferencias pendientes  
✅ Ver reportes y estadísticas  

## Notas Importantes

- Este usuario NO está asociado a una obra específica (`obra_id = NULL`)
- Gestiona el inventario centralizado independiente de las obras
- Puede crear pre-registros de transferencias que los almaceneros de obra deben confirmar
- Tiene permisos para crear y editar materiales (similar a COORDINACION)
