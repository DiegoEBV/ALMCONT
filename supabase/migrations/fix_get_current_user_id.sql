-- Corregir función get_current_user_id para manejar valores vacíos
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
  
  -- Intentar convertir a UUID
  BEGIN
    RETURN user_id_text::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      -- Si no es un UUID válido, retornar null
      RETURN NULL;
  END;
END;
$$;

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION get_current_user_id() TO anon;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;