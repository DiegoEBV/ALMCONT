CREATE OR REPLACE FUNCTION assign_user_role(
  p_email TEXT,
  p_nombre TEXT,
  p_apellido TEXT,
  p_rol user_role,
  p_obra_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User % not found in auth.users', p_email;
  END IF;
  INSERT INTO usuarios (id,email,nombre,apellido,rol,activo,obra_id,created_at,updated_at)
  VALUES (v_user_id,p_email,p_nombre,p_apellido,p_rol,TRUE,p_obra_id,NOW(),NOW())
  ON CONFLICT (id) DO UPDATE
  SET nombre = EXCLUDED.nombre,
      apellido = EXCLUDED.apellido,
      rol = EXCLUDED.rol,
      activo = TRUE,
      obra_id = COALESCE(EXCLUDED.obra_id, usuarios.obra_id),
      updated_at = NOW();
  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION assign_user_role_by_obra_code(
  p_email TEXT,
  p_nombre TEXT,
  p_apellido TEXT,
  p_rol user_role,
  p_obra_codigo TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_obra_id UUID;
BEGIN
  SELECT id INTO v_obra_id FROM obras WHERE codigo = p_obra_codigo;
  RETURN assign_user_role(p_email, p_nombre, p_apellido, p_rol, v_obra_id);
END;
$$;

SELECT assign_user_role('admin@obra.com','Admin','Obra','ADMIN'::user_role,NULL::uuid);
SELECT assign_user_role('coordinador@obra.com','Coordinador','Obra','COORDINACION'::user_role,NULL::uuid);
SELECT assign_user_role('logistica@obra.com','Logistica','Obra','LOGISTICA'::user_role,NULL::uuid);
SELECT assign_user_role('almacenero@obra.com','Almacenero','Obra','ALMACENERO'::user_role,NULL::uuid);
SELECT assign_user_role('produccion@obra.com','Produccion','Obra','PRODUCCION'::user_role,NULL::uuid);
SELECT assign_user_role('residente@obra.com','Residente','Obra','RESIDENTE'::user_role,NULL::uuid);
