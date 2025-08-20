-- Crear tablas para sistema de importación masiva

-- Tabla para trabajos de importación
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('csv', 'xml', 'json', 'excel')),
    file_size BIGINT NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    field_mapping JSONB,
    validation_rules JSONB,
    error_summary JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para errores de importación
CREATE TABLE import_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    field_name VARCHAR(100),
    error_type VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    raw_value TEXT,
    suggested_fix TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para plantillas de importación
CREATE TABLE import_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_table VARCHAR(100) NOT NULL,
    field_mapping JSONB NOT NULL,
    validation_rules JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX idx_import_jobs_user_id ON import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_created_at ON import_jobs(created_at DESC);
CREATE INDEX idx_import_errors_job_id ON import_errors(import_job_id);
CREATE INDEX idx_import_templates_user_id ON import_templates(user_id);
CREATE INDEX idx_import_templates_target_table ON import_templates(target_table);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_import_jobs_updated_at BEFORE UPDATE ON import_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_import_templates_updated_at BEFORE UPDATE ON import_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para import_jobs
CREATE POLICY "Users can view their own import jobs" ON import_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own import jobs" ON import_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import jobs" ON import_jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own import jobs" ON import_jobs
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para import_errors
CREATE POLICY "Users can view errors from their import jobs" ON import_errors
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM import_jobs 
            WHERE import_jobs.id = import_errors.import_job_id 
            AND import_jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "System can create import errors" ON import_errors
    FOR INSERT WITH CHECK (true);

-- Políticas RLS para import_templates
CREATE POLICY "Users can view their own templates and public templates" ON import_templates
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own templates" ON import_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON import_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON import_templates
    FOR DELETE USING (auth.uid() = user_id);

-- Conceder permisos a los roles
GRANT ALL PRIVILEGES ON import_jobs TO authenticated;
GRANT ALL PRIVILEGES ON import_errors TO authenticated;
GRANT ALL PRIVILEGES ON import_templates TO authenticated;

GRANT SELECT ON import_jobs TO anon;
GRANT SELECT ON import_errors TO anon;
GRANT SELECT ON import_templates TO anon;