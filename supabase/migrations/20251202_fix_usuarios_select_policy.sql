ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usuarios_self_read ON usuarios;
CREATE POLICY usuarios_self_read ON usuarios
  FOR SELECT
  USING (id = auth.uid());

-- Opcional: permitir que el service role gestione usuarios (RLS se ignora con service key)
-- No se necesita política adicional para service role; la service key bypassa RLS.

COMMIT;
