-- Crear función para establecer el contexto de usuario
CREATE OR REPLACE FUNCTION set_user_context(user_id uuid, user_role text)
RETURNS void AS $$
BEGIN
  -- Establecer el contexto de usuario en la sesión actual
  PERFORM set_config('app.current_user_id', user_id::text, true);
  PERFORM set_config('app.current_user_role', user_role, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el ID del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_user_id', true)::uuid, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text AS $$
BEGIN
  RETURN current_setting('app.current_user_role', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION set_user_context(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_role() TO anon, authenticated;