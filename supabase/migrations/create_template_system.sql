-- Migration: Create Template System Tables
-- Description: Creates tables for customizable templates system
-- Author: System
-- Date: 2025-01-18

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Table: report_templates
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL CHECK (category IN ('report', 'document', 'label', 'invoice', 'certificate')),
    template_data JSONB NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    preview_image TEXT, -- URL de imagen de preview
    is_public BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    parent_template_id UUID REFERENCES report_templates(id), -- Para versionado
    
    -- Constraints
    CONSTRAINT valid_template_data CHECK (jsonb_typeof(template_data) = 'object'),
    CONSTRAINT valid_variables CHECK (jsonb_typeof(variables) = 'array'),
    CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0)
);

-- Índices para report_templates
CREATE INDEX idx_report_templates_category ON report_templates(category);
CREATE INDEX idx_report_templates_created_by ON report_templates(created_by);
CREATE INDEX idx_report_templates_active ON report_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_report_templates_public ON report_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_report_templates_tags ON report_templates USING GIN(tags);
CREATE INDEX idx_report_templates_search ON report_templates USING GIN(to_tsvector('spanish', name || ' ' || COALESCE(description, '')));

-- Trigger para updated_at en report_templates
CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Table: template_instances
CREATE TABLE template_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    generated_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    data_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_format VARCHAR(20) NOT NULL CHECK (output_format IN ('pdf', 'excel', 'html', 'docx', 'csv')),
    file_url TEXT,
    file_size BIGINT,
    generation_status VARCHAR(20) DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Para limpieza automática
    download_count INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT valid_data_context CHECK (jsonb_typeof(data_context) = 'object'),
    CONSTRAINT file_size_positive CHECK (file_size IS NULL OR file_size > 0)
);

-- Índices para template_instances
CREATE INDEX idx_template_instances_template_id ON template_instances(template_id);
CREATE INDEX idx_template_instances_generated_by ON template_instances(generated_by);
CREATE INDEX idx_template_instances_status ON template_instances(generation_status);
CREATE INDEX idx_template_instances_generated_at ON template_instances(generated_at DESC);
CREATE INDEX idx_template_instances_expires_at ON template_instances(expires_at) WHERE expires_at IS NOT NULL;

-- RLS (Row Level Security) Policies

-- Enable RLS on both tables
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_instances ENABLE ROW LEVEL SECURITY;

-- Policies for report_templates
-- Users can view public templates or their own templates
CREATE POLICY "Users can view accessible templates" ON report_templates
    FOR SELECT USING (
        is_public = true 
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol IN ('admin', 'coordinacion')
        )
    );

-- Users can create templates
CREATE POLICY "Users can create templates" ON report_templates
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol IN ('admin', 'coordinacion', 'logistica')
        )
    );

-- Users can update their own templates or admins can update any
CREATE POLICY "Users can update own templates" ON report_templates
    FOR UPDATE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol = 'admin'
        )
    );

-- Users can delete their own templates or admins can delete any
CREATE POLICY "Users can delete own templates" ON report_templates
    FOR DELETE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol = 'admin'
        )
    );

-- Policies for template_instances
-- Users can view their own generated instances or admins can view all
CREATE POLICY "Users can view own template instances" ON template_instances
    FOR SELECT USING (
        generated_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol IN ('admin', 'coordinacion')
        )
    );

-- Users can create template instances
CREATE POLICY "Users can create template instances" ON template_instances
    FOR INSERT WITH CHECK (
        generated_by = auth.uid()
    );

-- Users can update their own instances
CREATE POLICY "Users can update own instances" ON template_instances
    FOR UPDATE USING (
        generated_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol = 'admin'
        )
    );

-- Users can delete their own instances
CREATE POLICY "Users can delete own instances" ON template_instances
    FOR DELETE USING (
        generated_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol = 'admin'
        )
    );

-- Grant permissions to roles
GRANT ALL PRIVILEGES ON report_templates TO authenticated;
GRANT ALL PRIVILEGES ON template_instances TO authenticated;
GRANT SELECT ON report_templates TO anon;
GRANT SELECT ON template_instances TO anon;

-- Insert some default templates
INSERT INTO report_templates (name, description, category, template_data, variables, is_public, created_by) VALUES
(
    'Reporte de Inventario Básico',
    'Template básico para reportes de inventario con tabla de materiales',
    'report',
    '{
        "components": [
            {
                "type": "text",
                "content": "<h1>Reporte de Inventario</h1>",
                "style": {"textAlign": "center", "marginBottom": "20px"}
            },
            {
                "type": "text",
                "content": "<p>Fecha: {{fecha_actual}}</p><p>Obra: {{obra_nombre}}</p>",
                "style": {"marginBottom": "20px"}
            },
            {
                "type": "table",
                "dataSource": "materiales",
                "columns": [
                    {"field": "codigo", "title": "Código"},
                    {"field": "nombre", "title": "Material"},
                    {"field": "stock_actual", "title": "Stock"},
                    {"field": "unidad", "title": "Unidad"}
                ]
            }
        ]
    }',
    '[
        {"name": "fecha_actual", "type": "date", "description": "Fecha actual del reporte"},
        {"name": "obra_nombre", "type": "text", "description": "Nombre de la obra"},
        {"name": "materiales", "type": "array", "description": "Lista de materiales"}
    ]',
    true,
    NULL
),
(
    'Etiqueta de Material',
    'Template para etiquetas de identificación de materiales',
    'label',
    '{
        "components": [
            {
                "type": "text",
                "content": "<h2>{{material_nombre}}</h2>",
                "style": {"textAlign": "center", "fontSize": "18px"}
            },
            {
                "type": "text",
                "content": "<p>Código: {{material_codigo}}</p><p>Ubicación: {{ubicacion}}</p><p>Stock: {{stock_actual}} {{unidad}}</p>",
                "style": {"fontSize": "14px"}
            },
            {
                "type": "qr",
                "content": "{{material_codigo}}",
                "style": {"width": "100px", "height": "100px"}
            }
        ]
    }',
    '[
        {"name": "material_nombre", "type": "text", "description": "Nombre del material"},
        {"name": "material_codigo", "type": "text", "description": "Código del material"},
        {"name": "ubicacion", "type": "text", "description": "Ubicación del material"},
        {"name": "stock_actual", "type": "number", "description": "Stock actual"},
        {"name": "unidad", "type": "text", "description": "Unidad de medida"}
    ]',
    true,
    NULL
);

-- Comments
COMMENT ON TABLE report_templates IS 'Tabla para almacenar plantillas de reportes personalizables';
COMMENT ON TABLE template_instances IS 'Tabla para almacenar instancias generadas de plantillas';
COMMENT ON COLUMN report_templates.template_data IS 'Estructura JSON del template con componentes y estilos';
COMMENT ON COLUMN report_templates.variables IS 'Array JSON de variables disponibles en el template';
COMMENT ON COLUMN template_instances.data_context IS 'Datos utilizados para generar la instancia del template';