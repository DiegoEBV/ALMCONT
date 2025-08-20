-- Migración para funcionalidades específicas por rol
-- Fecha: 2024-12-18
-- Descripción: Crear tablas para templates, analytics, rutas, precios y contratos

-- =============================================
-- 1. SISTEMA DE TEMPLATES
-- =============================================

-- Skip report_templates table (already exists)
-- CREATE TABLE report_templates - ALREADY EXISTS

-- Skip template_instances table (already exists)
-- CREATE TABLE template_instances - ALREADY EXISTS

-- =============================================
-- 2. ANALYTICS Y DASHBOARDS
-- =============================================

-- Tabla de dashboards personalizados por usuario
CREATE TABLE user_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_shared BOOLEAN DEFAULT false,
    shared_with UUID[],
    dashboard_type VARCHAR(50) DEFAULT 'custom' CHECK (dashboard_type IN ('custom', 'template', 'system')),
    refresh_interval INTEGER DEFAULT 300,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    
    CONSTRAINT valid_layout CHECK (jsonb_typeof(layout) = 'object'),
    CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT refresh_interval_positive CHECK (refresh_interval > 0)
);

-- Tabla de métricas calculadas
CREATE TABLE calculated_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    period_start DATE,
    period_end DATE,
    metric_value DECIMAL(15,4),
    metadata JSONB DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

-- Tabla de preferencias de usuario
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'es' CHECK (language IN ('es', 'en', 'pt')),
    timezone VARCHAR(50) DEFAULT 'America/Lima',
    dashboard_config JSONB DEFAULT '{}'::jsonb,
    notification_settings JSONB DEFAULT '{}'::jsonb,
    accessibility_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_dashboard_config CHECK (jsonb_typeof(dashboard_config) = 'object'),
    CONSTRAINT valid_notification_settings CHECK (jsonb_typeof(notification_settings) = 'object'),
    CONSTRAINT valid_accessibility_settings CHECK (jsonb_typeof(accessibility_settings) = 'object')
);

-- =============================================
-- 3. OPTIMIZACIÓN DE RUTAS
-- =============================================

-- Tabla de rutas de entrega
CREATE TABLE delivery_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    route_date DATE,
    vehicle_type VARCHAR(50),
    max_capacity DECIMAL(10,2),
    start_location JSONB,
    waypoints JSONB,
    optimized_order JSONB,
    total_distance DECIMAL(10,2),
    estimated_time INTEGER,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_start_location CHECK (jsonb_typeof(start_location) = 'object'),
    CONSTRAINT valid_waypoints CHECK (jsonb_typeof(waypoints) = 'array'),
    CONSTRAINT positive_capacity CHECK (max_capacity IS NULL OR max_capacity > 0),
    CONSTRAINT positive_distance CHECK (total_distance IS NULL OR total_distance >= 0),
    CONSTRAINT positive_time CHECK (estimated_time IS NULL OR estimated_time > 0)
);

-- Tabla de entregas en ruta
CREATE TABLE route_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES delivery_routes(id) ON DELETE CASCADE,
    delivery_order INTEGER,
    obra_id UUID REFERENCES obras(id),
    materials JSONB,
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    actual_arrival TIMESTAMP WITH TIME ZONE,
    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'in_transit', 'delivered', 'failed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_materials CHECK (jsonb_typeof(materials) = 'array'),
    CONSTRAINT positive_order CHECK (delivery_order > 0)
);

-- =============================================
-- 4. GESTIÓN DE PROVEEDORES
-- =============================================

-- Tabla de historial de precios de proveedores
CREATE TABLE supplier_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID,
    material_id UUID REFERENCES materiales(id),
    price DECIMAL(12,4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PEN',
    valid_from DATE NOT NULL,
    valid_until DATE,
    minimum_quantity DECIMAL(10,2),
    lead_time_days INTEGER,
    terms_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_price CHECK (price > 0),
    CONSTRAINT valid_date_range CHECK (valid_until IS NULL OR valid_until >= valid_from),
    CONSTRAINT positive_quantity CHECK (minimum_quantity IS NULL OR minimum_quantity > 0),
    CONSTRAINT positive_lead_time CHECK (lead_time_days IS NULL OR lead_time_days >= 0)
);

-- Tabla de contratos marco
CREATE TABLE framework_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID,
    contract_type VARCHAR(50) CHECK (contract_type IN ('framework', 'blanket', 'annual', 'spot')),
    start_date DATE NOT NULL,
    end_date DATE,
    total_value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'PEN',
    terms JSONB DEFAULT '{}'::jsonb,
    materials_covered JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'cancelled', 'renewed')),
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_contract_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT positive_value CHECK (total_value IS NULL OR total_value > 0),
    CONSTRAINT valid_terms CHECK (jsonb_typeof(terms) = 'object'),
    CONSTRAINT valid_materials_covered CHECK (jsonb_typeof(materials_covered) = 'array')
);

-- =============================================
-- 5. ÍNDICES PARA OPTIMIZACIÓN
-- =============================================

-- Índices para report_templates
CREATE INDEX idx_report_templates_category ON report_templates(category);
CREATE INDEX idx_report_templates_created_by ON report_templates(created_by);
CREATE INDEX idx_report_templates_active ON report_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_report_templates_public ON report_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_report_templates_tags ON report_templates USING GIN(tags);

-- Índices para template_instances
CREATE INDEX idx_template_instances_template_id ON template_instances(template_id);
CREATE INDEX idx_template_instances_generated_by ON template_instances(generated_by);
CREATE INDEX idx_template_instances_status ON template_instances(generation_status);
CREATE INDEX idx_template_instances_generated_at ON template_instances(generated_at DESC);

-- Índices para user_dashboards
CREATE INDEX idx_user_dashboards_user_id ON user_dashboards(user_id);
CREATE INDEX idx_user_dashboards_type ON user_dashboards(dashboard_type);
CREATE INDEX idx_user_dashboards_default ON user_dashboards(user_id, is_default) WHERE is_default = true;

-- Índices para calculated_metrics
CREATE INDEX idx_calculated_metrics_type_entity ON calculated_metrics(metric_type, entity_type, entity_id);
CREATE INDEX idx_calculated_metrics_period ON calculated_metrics(period_start, period_end);
CREATE INDEX idx_calculated_metrics_calculated_at ON calculated_metrics(calculated_at DESC);

-- Índices para delivery_routes
CREATE INDEX idx_delivery_routes_date ON delivery_routes(route_date);
CREATE INDEX idx_delivery_routes_status ON delivery_routes(status);
CREATE INDEX idx_delivery_routes_created_by ON delivery_routes(created_by);

-- Índices para route_deliveries
CREATE INDEX idx_route_deliveries_route_id ON route_deliveries(route_id);
CREATE INDEX idx_route_deliveries_obra_id ON route_deliveries(obra_id);
CREATE INDEX idx_route_deliveries_status ON route_deliveries(delivery_status);

-- Índices para supplier_price_history
CREATE INDEX idx_price_history_material_date ON supplier_price_history(material_id, valid_from DESC);
CREATE INDEX idx_price_history_supplier ON supplier_price_history(supplier_id);
CREATE INDEX idx_price_history_valid_period ON supplier_price_history(valid_from, valid_until);

-- Índices para framework_contracts
CREATE INDEX idx_framework_contracts_supplier ON framework_contracts(supplier_id);
CREATE INDEX idx_framework_contracts_dates ON framework_contracts(start_date, end_date);
CREATE INDEX idx_framework_contracts_status ON framework_contracts(status);
CREATE INDEX idx_framework_contracts_number ON framework_contracts(contract_number);

-- =============================================
-- 6. TRIGGERS Y FUNCIONES
-- =============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_dashboards_updated_at
    BEFORE UPDATE ON user_dashboards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_routes_updated_at
    BEFORE UPDATE ON delivery_routes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_framework_contracts_updated_at
    BEFORE UPDATE ON framework_contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 7. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculated_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_contracts ENABLE ROW LEVEL SECURITY;

-- Políticas para report_templates
CREATE POLICY "Users can view public templates" ON report_templates
    FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create templates" ON report_templates
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own templates" ON report_templates
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own templates" ON report_templates
    FOR DELETE USING (created_by = auth.uid());

-- Políticas para template_instances
CREATE POLICY "Users can view own template instances" ON template_instances
    FOR SELECT USING (generated_by = auth.uid());

CREATE POLICY "Users can create template instances" ON template_instances
    FOR INSERT WITH CHECK (generated_by = auth.uid());

-- Políticas para user_dashboards
CREATE POLICY "Users can manage own dashboards" ON user_dashboards
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view shared dashboards" ON user_dashboards
    FOR SELECT USING (is_shared = true AND auth.uid() = ANY(shared_with));

-- Políticas para user_preferences
CREATE POLICY "Users can manage own preferences" ON user_preferences
    FOR ALL USING (user_id = auth.uid());

-- Políticas para delivery_routes
CREATE POLICY "Logistics users can manage routes" ON delivery_routes
    FOR ALL USING (created_by = auth.uid());

-- Políticas para route_deliveries
CREATE POLICY "Users can view route deliveries" ON route_deliveries
    FOR SELECT USING (true);

CREATE POLICY "Logistics users can manage deliveries" ON route_deliveries
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM delivery_routes 
        WHERE id = route_id AND created_by = auth.uid()
    ));

-- Políticas para supplier_price_history
CREATE POLICY "All users can view price history" ON supplier_price_history
    FOR SELECT USING (true);

CREATE POLICY "Logistics users can manage prices" ON supplier_price_history
    FOR INSERT WITH CHECK (true);

-- Políticas para framework_contracts
CREATE POLICY "All users can view active contracts" ON framework_contracts
    FOR SELECT USING (status = 'active');

CREATE POLICY "Authorized users can manage contracts" ON framework_contracts
    FOR ALL USING (created_by = auth.uid());

-- =============================================
-- 8. PERMISOS PARA ROLES
-- =============================================

-- Otorgar permisos básicos a roles anon y authenticated
GRANT SELECT ON report_templates TO anon, authenticated;
GRANT SELECT ON template_instances TO anon, authenticated;
GRANT ALL ON user_dashboards TO authenticated;
GRANT SELECT ON calculated_metrics TO authenticated;
GRANT ALL ON user_preferences TO authenticated;
GRANT SELECT ON delivery_routes TO authenticated;
GRANT SELECT ON route_deliveries TO authenticated;
GRANT SELECT ON supplier_price_history TO authenticated;
GRANT SELECT ON framework_contracts TO authenticated;

-- Permisos de inserción para usuarios autenticados
GRANT INSERT ON report_templates TO authenticated;
GRANT INSERT ON template_instances TO authenticated;
GRANT INSERT ON delivery_routes TO authenticated;
GRANT INSERT ON route_deliveries TO authenticated;
GRANT INSERT ON supplier_price_history TO authenticated;
GRANT INSERT ON framework_contracts TO authenticated;

-- Permisos de actualización para usuarios autenticados
GRANT UPDATE ON report_templates TO authenticated;
GRANT UPDATE ON delivery_routes TO authenticated;
GRANT UPDATE ON route_deliveries TO authenticated;
GRANT UPDATE ON framework_contracts TO authenticated;

-- Permisos de eliminación para usuarios autenticados
GRANT DELETE ON report_templates TO authenticated;
GRANT DELETE ON template_instances TO authenticated;
GRANT DELETE ON delivery_routes TO authenticated;
GRANT DELETE ON framework_contracts TO authenticated;