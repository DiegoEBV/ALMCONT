-- Corregir función set_user_context para que persista durante toda la sesión
CREATE OR REPLACE FUNCTION set_user_context(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Establecer el contexto del usuario actual para toda la sesión (false en lugar de true)
  PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$;

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION set_user_context(uuid) TO anon;
GRANT EXECUTE ON FUNCTION set_user_context(uuid) TO authenticated;

-- Corregir función get_current_user_id para manejar mejor los valores vacíos
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_id_text text;
BEGIN
  -- Obtener el valor del contexto
  user_id_text := current_setting('app.current_user_id', true);
  
  -- Si está vacío o es null, retornar null
  IF user_id_text IS NULL OR user_id_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Intentar convertir a UUID, si falla retornar null
  BEGIN
    RETURN user_id_text::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN NULL;
  END;
END;
$$;

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION get_current_user_id() TO anon;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;