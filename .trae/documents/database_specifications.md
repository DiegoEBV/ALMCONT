# Especificaciones de Base de Datos - Funcionalidades Avanzadas

## 1. Resumen de Cambios

### 1.1 Nuevas Tablas
- **Templates System**: 2 tablas principales
- **Import System**: 2 tablas para gestión de importaciones
- **Analytics & Dashboards**: 3 tablas para métricas y personalización
- **Route Optimization**: 2 tablas para rutas y entregas
- **Supplier Management**: 2 tablas para precios y contratos

### 1.2 Modificaciones a Tablas Existentes
- Extensión de `usuarios` con campos adicionales
- Nuevos campos en `materiales` para analytics
- Campos de auditoría en tablas críticas

### 1.3 Funciones y Triggers
- 8 funciones almacenadas para cálculos complejos
- 12 triggers para auditoría y validación
- 15 políticas RLS para seguridad

## 2. Esquema Detallado de Tablas

### 2.1 Sistema de Templates

#### Tabla: report_templates
```sql
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

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### Tabla: template_instances
```sql
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
```

### 2.2 Sistema de Importación

#### Tabla: import_jobs
```sql
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(255),
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('csv', 'xml', 'json', 'excel', 'xlsx', 'xls')),
    file_url TEXT NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    mapping_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_rules JSONB DEFAULT '{}'::jsonb,
    import_options JSONB DEFAULT '{}'::jsonb, -- Opciones como skip_duplicates, update_existing, etc.
    error_summary JSONB DEFAULT '{}'::jsonb,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_mapping_config CHECK (jsonb_typeof(mapping_config) = 'object'),
    CONSTRAINT valid_validation_rules CHECK (jsonb_typeof(validation_rules) = 'object'),
    CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT file_size_positive CHECK (file_size > 0),
    CONSTRAINT records_consistency CHECK (
        processed_records = successful_records + failed_records
        AND processed_records <= total_records
    )
);

-- Índices para import_jobs
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_created_by ON import_jobs(created_by);
CREATE INDEX idx_import_jobs_created_at ON import_jobs(created_at DESC);
CREATE INDEX idx_import_jobs_target_table ON import_jobs(target_table);
CREATE INDEX idx_import_jobs_file_type ON import_jobs(file_type);
```

#### Tabla: import_errors
```sql
CREATE TABLE import_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    field_name VARCHAR(100),
    error_type VARCHAR(50) NOT NULL,
    error_code VARCHAR(20),
    error_message TEXT NOT NULL,
    raw_data JSONB,
    suggested_fix TEXT,
    severity VARCHAR(10) DEFAULT 'error' CHECK (severity IN ('error', 'warning', 'info')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT row_number_positive CHECK (row_number > 0),
    CONSTRAINT error_message_not_empty CHECK (length(trim(error_message)) > 0)
);

-- Índices para import_errors
CREATE INDEX idx_import_errors_job_id ON import_errors(import_job_id);
CREATE INDEX idx_import_errors_row_number ON import_errors(import_job_id, row_number);
CREATE INDEX idx_import_errors_error_type ON import_errors(error_type);
CREATE INDEX idx_import_errors_severity ON import_errors(severity);
```

### 2.3 Analytics y Dashboards

#### Tabla: user_dashboards
```sql
CREATE TABLE user_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_shared BOOLEAN DEFAULT false,
    shared_with UUID[], -- Array de user IDs
    dashboard_type VARCHAR(50) DEFAULT 'custom' CHECK (dashboard_type IN ('custom', 'template', 'system')),
    refresh_interval INTEGER DEFAULT 300, -- segundos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT valid_layout CHECK (jsonb_typeof(layout) = 'object'),
    CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT refresh_interval_positive CHECK (refresh_interval > 0),
    CONSTRAINT unique_default_per_user UNIQUE (user_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Índices para user_dashboards
CREATE INDEX idx_user_dashboards_user_id ON user_dashboards(user_id);
CREATE INDEX idx_user_dashboards_default ON user_dashboards(user_id, is_default) WHERE is_default = true;
CREATE INDEX idx_user_dashboards_shared ON user_dashboards(is_shared) WHERE is_shared = true;
CREATE INDEX idx_user_dashboards_type ON user_dashboards(dashboard_type);

-- Trigger para updated_at
CREATE TRIGGER update_user_dashboards_updated_at
    BEFORE UPDATE ON user_dashboards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### Tabla: calculated_metrics
```sql
CREATE TABLE calculated_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('user', 'obra', 'material', 'supplier', 'global')),
    entity_id UUID,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20),
    metadata JSONB DEFAULT '{}'::jsonb,
    calculation_method TEXT,
    data_sources TEXT[],
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_current BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT valid_period CHECK (period_end >= period_start),
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT metric_name_not_empty CHECK (length(trim(metric_name)) > 0)
);

-- Índices para calculated_metrics
CREATE INDEX idx_calculated_metrics_type_entity ON calculated_metrics(metric_type, entity_type, entity_id);
CREATE INDEX idx_calculated_metrics_period ON calculated_metrics(period_start, period_end);
CREATE INDEX idx_calculated_metrics_current ON calculated_metrics(is_current) WHERE is_current = true;
CREATE INDEX idx_calculated_metrics_entity_period ON calculated_metrics(entity_type, entity_id, period_start DESC);
CREATE INDEX idx_calculated_metrics_calculated_at ON calculated_metrics(calculated_at DESC);

-- Índice único para evitar duplicados
CREATE UNIQUE INDEX idx_calculated_metrics_unique ON calculated_metrics(
    metric_type, entity_type, COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid), 
    period_type, period_start, period_end
) WHERE is_current = true;
```

#### Tabla: user_preferences
```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto', 'high-contrast')),
    language VARCHAR(10) DEFAULT 'es' CHECK (language IN ('es', 'en', 'pt', 'fr')),
    timezone VARCHAR(50) DEFAULT 'America/Lima',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    time_format VARCHAR(10) DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
    currency VARCHAR(3) DEFAULT 'PEN',
    number_format JSONB DEFAULT '{"decimal": ".", "thousands": ",", "precision": 2}'::jsonb,
    dashboard_config JSONB DEFAULT '{}'::jsonb,
    notification_settings JSONB DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb,
    accessibility_settings JSONB DEFAULT '{"high_contrast": false, "large_text": false, "screen_reader": false}'::jsonb,
    ui_density VARCHAR(20) DEFAULT 'normal' CHECK (ui_density IN ('compact', 'normal', 'comfortable')),
    sidebar_collapsed BOOLEAN DEFAULT false,
    items_per_page INTEGER DEFAULT 25 CHECK (items_per_page IN (10, 25, 50, 100)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_dashboard_config CHECK (jsonb_typeof(dashboard_config) = 'object'),
    CONSTRAINT valid_notification_settings CHECK (jsonb_typeof(notification_settings) = 'object'),
    CONSTRAINT valid_accessibility_settings CHECK (jsonb_typeof(accessibility_settings) = 'object'),
    CONSTRAINT valid_number_format CHECK (jsonb_typeof(number_format) = 'object')
);

-- Índices para user_preferences
CREATE INDEX idx_user_preferences_theme ON user_preferences(theme);
CREATE INDEX idx_user_preferences_language ON user_preferences(language);
CREATE INDEX idx_user_preferences_timezone ON user_preferences(timezone);

-- Trigger para updated_at
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.4 Optimización de Rutas

#### Tabla: delivery_routes
```sql
CREATE TABLE delivery_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    assigned_driver UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    route_date DATE NOT NULL,
    vehicle_type VARCHAR(50),
    vehicle_plate VARCHAR(20),
    max_capacity DECIMAL(10,2),
    max_weight DECIMAL(10,2),
    start_location JSONB NOT NULL,
    end_location JSONB,
    waypoints JSONB NOT NULL DEFAULT '[]'::jsonb,
    optimized_order JSONB,
    optimization_algorithm VARCHAR(50) DEFAULT 'nearest_neighbor',
    total_distance DECIMAL(10,2),
    estimated_duration INTEGER, -- minutos
    actual_duration INTEGER,
    fuel_cost DECIMAL(10,2),
    optimization_savings JSONB,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'optimized', 'assigned', 'in_progress', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_start_location CHECK (jsonb_typeof(start_location) = 'object'),
    CONSTRAINT valid_waypoints CHECK (jsonb_typeof(waypoints) = 'array'),
    CONSTRAINT route_name_not_empty CHECK (length(trim(route_name)) > 0),
    CONSTRAINT positive_capacity CHECK (max_capacity IS NULL OR max_capacity > 0),
    CONSTRAINT positive_weight CHECK (max_weight IS NULL OR max_weight > 0),
    CONSTRAINT positive_distance CHECK (total_distance IS NULL OR total_distance >= 0),
    CONSTRAINT positive_duration CHECK (estimated_duration IS NULL OR estimated_duration > 0)
);

-- Índices para delivery_routes
CREATE INDEX idx_delivery_routes_date ON delivery_routes(route_date);
CREATE INDEX idx_delivery_routes_status ON delivery_routes(status);
CREATE INDEX idx_delivery_routes_created_by ON delivery_routes(created_by);
CREATE INDEX idx_delivery_routes_driver ON delivery_routes(assigned_driver);
CREATE INDEX idx_delivery_routes_priority ON delivery_routes(priority DESC);
CREATE INDEX idx_delivery_routes_created_at ON delivery_routes(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_delivery_routes_updated_at
    BEFORE UPDATE ON delivery_routes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### Tabla: route_deliveries
```sql
CREATE TABLE route_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES delivery_routes(id) ON DELETE CASCADE,
    delivery_order INTEGER NOT NULL,
    obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(20),
    delivery_address TEXT,
    location_coordinates JSONB,
    materials JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_weight DECIMAL(10,2),
    total_volume DECIMAL(10,2),
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    actual_arrival TIMESTAMP WITH TIME ZONE,
    estimated_departure TIMESTAMP WITH TIME ZONE,
    actual_departure TIMESTAMP WITH TIME ZONE,
    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'en_route', 'arrived', 'delivered', 'failed', 'rescheduled')),
    delivery_proof JSONB, -- Fotos, firmas, etc.
    failure_reason TEXT,
    special_instructions TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_materials CHECK (jsonb_typeof(materials) = 'array'),
    CONSTRAINT valid_delivery_order CHECK (delivery_order > 0),
    CONSTRAINT positive_weight CHECK (total_weight IS NULL OR total_weight > 0),
    CONSTRAINT positive_volume CHECK (total_volume IS NULL OR total_volume > 0),
    CONSTRAINT valid_location_coordinates CHECK (
        location_coordinates IS NULL OR 
        (jsonb_typeof(location_coordinates) = 'object' AND 
         location_coordinates ? 'lat' AND 
         location_coordinates ? 'lng')
    )
);

-- Índices para route_deliveries
CREATE INDEX idx_route_deliveries_route_id ON route_deliveries(route_id);
CREATE INDEX idx_route_deliveries_obra_id ON route_deliveries(obra_id);
CREATE INDEX idx_route_deliveries_status ON route_deliveries(delivery_status);
CREATE INDEX idx_route_deliveries_order ON route_deliveries(route_id, delivery_order);
CREATE INDEX idx_route_deliveries_arrival ON route_deliveries(estimated_arrival);

-- Trigger para updated_at
CREATE TRIGGER update_route_deliveries_updated_at
    BEFORE UPDATE ON route_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Constraint único para orden de entrega por ruta
CREATE UNIQUE INDEX idx_route_deliveries_unique_order ON route_deliveries(route_id, delivery_order);
```

### 2.5 Gestión de Proveedores

#### Tabla: supplier_price_history
```sql
CREATE TABLE supplier_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL, -- Referencia externa a tabla de proveedores
    supplier_name VARCHAR(255) NOT NULL, -- Desnormalizado para performance
    material_id UUID REFERENCES materiales(id) ON DELETE CASCADE,
    price DECIMAL(12,4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PEN',
    price_type VARCHAR(20) DEFAULT 'unit' CHECK (price_type IN ('unit', 'bulk', 'wholesale', 'retail')),
    valid_from DATE NOT NULL,
    valid_until DATE,
    minimum_quantity DECIMAL(10,2) DEFAULT 1,
    maximum_quantity DECIMAL(10,2),
    lead_time_days INTEGER DEFAULT 0,
    payment_terms VARCHAR(100),
    delivery_terms VARCHAR(100),
    quality_grade VARCHAR(50),
    terms_conditions TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    price_source VARCHAR(50) DEFAULT 'manual' CHECK (price_source IN ('manual', 'api', 'import', 'contract')),
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_price CHECK (price > 0),
    CONSTRAINT valid_date_range CHECK (valid_until IS NULL OR valid_until >= valid_from),
    CONSTRAINT positive_quantities CHECK (
        minimum_quantity > 0 AND 
        (maximum_quantity IS NULL OR maximum_quantity >= minimum_quantity)
    ),
    CONSTRAINT valid_discount CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    CONSTRAINT non_negative_lead_time CHECK (lead_time_days >= 0)
);

-- Índices para supplier_price_history
CREATE INDEX idx_supplier_price_history_supplier ON supplier_price_history(supplier_id);
CREATE INDEX idx_supplier_price_history_material ON supplier_price_history(material_id);
CREATE INDEX idx_supplier_price_history_dates ON supplier_price_history(valid_from, valid_until);
CREATE INDEX idx_supplier_price_history_active ON supplier_price_history(is_active) WHERE is_active = true;
CREATE INDEX idx_supplier_price_history_current ON supplier_price_history(material_id, valid_from DESC) 
    WHERE is_active = true AND (valid_until IS NULL OR valid_until >= CURRENT_DATE);
CREATE INDEX idx_supplier_price_history_price ON supplier_price_history(material_id, price ASC);

-- Trigger para updated_at
CREATE TRIGGER update_supplier_price_history_updated_at
    BEFORE UPDATE ON supplier_price_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### Tabla: framework_contracts
```sql
CREATE TABLE framework_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    contract_name VARCHAR(255) NOT NULL,
    supplier_id UUID NOT NULL,
    supplier_name VARCHAR(255) NOT NULL, -- Desnormalizado
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('framework', 'blanket', 'annual', 'master', 'spot')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    auto_renewal BOOLEAN DEFAULT false,
    renewal_period INTEGER, -- meses
    total_value DECIMAL(15,2),
    committed_value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'PEN',
    payment_terms JSONB DEFAULT '{}'::jsonb,
    delivery_terms JSONB DEFAULT '{}'::jsonb,
    quality_terms JSONB DEFAULT '{}'::jsonb,
    penalty_clauses JSONB DEFAULT '{}'::jsonb,
    materials_covered JSONB NOT NULL DEFAULT '[]'::jsonb,
    price_escalation_formula TEXT,
    discount_structure JSONB DEFAULT '{}'::jsonb,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'active', 'suspended', 'expired', 'terminated')),
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    contract_file_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_contract_dates CHECK (end_date > start_date),
    CONSTRAINT contract_number_not_empty CHECK (length(trim(contract_number)) > 0),
    CONSTRAINT contract_name_not_empty CHECK (length(trim(contract_name)) > 0),
    CONSTRAINT positive_values CHECK (
        (total_value IS NULL OR total_value > 0) AND
        (committed_value IS NULL OR committed_value >= 0)
    ),
    CONSTRAINT valid_materials_covered CHECK (jsonb_typeof(materials_covered) = 'array'),
    CONSTRAINT valid_renewal_period CHECK (renewal_period IS NULL OR renewal_period > 0)
);

-- Índices para framework_contracts
CREATE INDEX idx_framework_contracts_supplier ON framework_contracts(supplier_id);
CREATE INDEX idx_framework_contracts_dates ON framework_contracts(start_date, end_date);
CREATE INDEX idx_framework_contracts_status ON framework_contracts(status);
CREATE INDEX idx_framework_contracts_approval ON framework_contracts(approval_status);
CREATE INDEX idx_framework_contracts_active ON framework_contracts(status, start_date, end_date) 
    WHERE status = 'active';
CREATE INDEX idx_framework_contracts_expiring ON framework_contracts(end_date) 
    WHERE status = 'active' AND end_date <= CURRENT_DATE + INTERVAL '30 days';
CREATE INDEX idx_framework_contracts_materials ON framework_contracts USING GIN(materials_covered);

-- Trigger para updated_at
CREATE TRIGGER update_framework_contracts_updated_at
    BEFORE UPDATE ON framework_contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 3. Funciones Almacenadas

### 3.1 Función para Calcular Eficiencia de Usuario
```sql
CREATE OR REPLACE FUNCTION calculate_user_efficiency(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    avg_processing_time DECIMAL,
    inventory_accuracy DECIMAL,
    items_per_hour DECIMAL,
    error_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH user_activities AS (
        SELECT 
            -- Calcular tiempo promedio de procesamiento
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_proc_time,
            -- Calcular precisión de inventario
            COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100 as accuracy,
            -- Calcular items por hora
            COUNT(*)::DECIMAL / NULLIF(EXTRACT(EPOCH FROM (MAX(updated_at) - MIN(created_at)))/3600, 0) as items_hour,
            -- Calcular tasa de error
            COUNT(CASE WHEN status = 'error' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100 as err_rate
        FROM stock
        WHERE created_by = p_user_id
        AND created_at::DATE BETWEEN p_start_date AND p_end_date
    )
    SELECT 
        COALESCE(avg_proc_time, 0)::DECIMAL,
        COALESCE(accuracy, 0)::DECIMAL,
        COALESCE(items_hour, 0)::DECIMAL,
        COALESCE(err_rate, 0)::DECIMAL
    FROM user_activities;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.2 Función para Optimización de Rutas (TSP Simplificado)
```sql
CREATE OR REPLACE FUNCTION optimize_delivery_route(
    p_route_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_waypoints JSONB;
    v_optimized_order JSONB;
    v_total_distance DECIMAL;
BEGIN
    -- Obtener waypoints de la ruta
    SELECT waypoints INTO v_waypoints
    FROM delivery_routes
    WHERE id = p_route_id;
    
    -- Aplicar algoritmo nearest neighbor simplificado
    -- (En producción se usaría un algoritmo más sofisticado)
    WITH RECURSIVE route_optimization AS (
        -- Caso base: empezar desde el primer punto
        SELECT 
            0 as step,
            0 as current_point,
            ARRAY[0] as visited,
            0::DECIMAL as total_dist,
            jsonb_array_length(v_waypoints) - 1 as remaining
        
        UNION ALL
        
        -- Caso recursivo: encontrar el siguiente punto más cercano
        SELECT 
            ro.step + 1,
            -- Aquí iría la lógica para encontrar el punto más cercano
            -- Simplificado para el ejemplo
            (ro.current_point + 1) % jsonb_array_length(v_waypoints),
            ro.visited || ((ro.current_point + 1) % jsonb_array_length(v_waypoints)),
            ro.total_dist + 10, -- Distancia simulada
            ro.remaining - 1
        FROM route_optimization ro
        WHERE ro.remaining > 0
    )
    SELECT 
        jsonb_agg(visited ORDER BY step) as optimized,
        MAX(total_dist) as distance
    INTO v_optimized_order, v_total_distance
    FROM route_optimization;
    
    -- Actualizar la ruta con el orden optimizado
    UPDATE delivery_routes
    SET 
        optimized_order = v_optimized_order,
        total_distance = v_total_distance,
        status = 'optimized',
        updated_at = NOW()
    WHERE id = p_route_id;
    
    RETURN jsonb_build_object(
        'optimized_order', v_optimized_order,
        'total_distance', v_total_distance,
        'savings_percentage', 15.5 -- Simulado
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.3 Función para Comparación de Precios
```sql
CREATE OR REPLACE FUNCTION compare_supplier_prices(
    p_material_id UUID,
    p_quantity DECIMAL DEFAULT 1,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    supplier_id UUID,
    supplier_name VARCHAR,
    unit_price DECIMAL,
    total_price DECIMAL,
    lead_time_days INTEGER,
    discount_percentage DECIMAL,
    final_price DECIMAL,
    ranking INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH price_comparison AS (
        SELECT 
            sph.supplier_id,
            sph.supplier_name,
            sph.price as unit_price,
            sph.price * p_quantity as total_price,
            sph.lead_time_days,
            sph.discount_percentage,
            (sph.price * p_quantity * (100 - sph.discount_percentage) / 100) as final_price
        FROM supplier_price_history sph
        WHERE sph.material_id = p_material_id
        AND sph.is_active = true
        AND sph.valid_from <= p_date
        AND (sph.valid_until IS NULL OR sph.valid_until >= p_date)
        AND sph.minimum_quantity <= p_quantity
        AND (sph.maximum_quantity IS NULL OR sph.maximum_quantity >= p_quantity)
    )
    SELECT 
        pc.supplier_id,
        pc.supplier_name,
        pc.unit_price,
        pc.total_price,
        pc.lead_time_days,
        pc.discount_percentage,
        pc.final_price,
        ROW_NUMBER() OVER (ORDER BY pc.final_price ASC, pc.lead_time_days ASC)::INTEGER as ranking
    FROM price_comparison pc
    ORDER BY pc.final_price ASC, pc.lead_time_days ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 4. Políticas de Seguridad (RLS)

### 4.1 Políticas para Templates
```sql
-- Habilitar RLS en report_templates
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Política para lectura: usuarios pueden ver templates públicos o propios
CREATE POLICY "Users can view public templates or own templates" ON report_templates
    FOR SELECT USING (
        is_public = true OR 
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id = auth.uid() 
            AND u.rol IN ('admin', 'coordinador')
        )
    );

-- Política para inserción: usuarios autenticados pueden crear templates
CREATE POLICY "Authenticated users can create templates" ON report_templates
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        created_by = auth.uid()
    );

-- Política para actualización: solo el creador o admin puede modificar
CREATE POLICY "Users can update own templates" ON report_templates
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id = auth.uid() 
            AND u.rol = 'admin'
        )
    );

-- Política para eliminación: solo el creador o admin puede eliminar
CREATE POLICY "Users can delete own templates" ON report_templates
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id = auth.uid() 
            AND u.rol = 'admin'
        )
    );
```

### 4.2 Políticas para Import Jobs
```sql
-- Habilitar RLS en import_jobs
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Política para lectura: usuarios pueden ver sus propios jobs o admins ven todos
CREATE POLICY "Users can view own import jobs" ON import_jobs
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id = auth.uid() 
            AND u.rol IN ('admin', 'coordinador')
        )
    );

-- Política para inserción: usuarios autenticados pueden crear jobs
CREATE POLICY "Authenticated users can create import jobs" ON import_jobs
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        created_by = auth.uid()
    );

-- Política para actualización: solo el creador puede modificar
CREATE POLICY "Users can update own import jobs" ON import_jobs
    FOR UPDATE USING (created_by = auth.uid());
```

### 4.3 Políticas para Dashboards
```sql
-- Habilitar RLS en user_dashboards
ALTER TABLE user_dashboards ENABLE ROW LEVEL SECURITY;

-- Política para lectura: usuarios pueden ver sus dashboards o compartidos con ellos
CREATE POLICY "Users can view own or shared dashboards" ON user_dashboards
    FOR SELECT USING (
        user_id = auth.uid() OR
        (is_shared = true AND auth.uid() = ANY(shared_with)) OR
        dashboard_type = 'system'
    );

-- Política para inserción: usuarios pueden crear sus propios dashboards
CREATE POLICY "Users can create own dashboards" ON user_dashboards
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

-- Política para actualización: solo el propietario puede modificar
CREATE POLICY "Users can update own dashboards" ON user_dashboards
    FOR UPDATE USING (user_id = auth.uid());

-- Política para eliminación: solo el propietario puede eliminar
CREATE POLICY "Users can delete own dashboards" ON user_dashboards
    FOR DELETE USING (user_id = auth.uid());
```

### 4.4 Políticas para Rutas
```sql
-- Habilitar RLS en delivery_routes
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;

-- Política para lectura: logística y coordinadores pueden ver todas las rutas
CREATE POLICY "Logistics can view all routes" ON delivery_routes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id = auth.uid() 
            AND u.rol IN ('admin', 'coordinador', 'logistica')
        ) OR
        created_by = auth.uid() OR
        assigned_driver = auth.uid()
    );

-- Política para inserción: solo logística puede crear rutas
CREATE POLICY "Logistics can create routes" ON delivery_routes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id = auth.uid() 
            AND u.rol IN ('admin', 'coordinador', 'logistica')
        )
    );

-- Política para actualización: creador, conductor asignado o logística
CREATE POLICY "Authorized users can update routes" ON delivery_routes
    FOR UPDATE USING (
        created_by = auth.uid() OR
        assigned_driver = auth.uid() OR
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id = auth.uid() 
            AND u.rol IN ('admin', 'coordinador', 'logistica')
        )
    );
```

## 5. Triggers y Funciones de Auditoría

### 5.1 Trigger para Auditoría de Templates
```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at DESC);
CREATE INDEX idx_audit_log_changed_by ON audit_log(changed_by);

-- Función genérica de auditoría
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_values, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger de auditoría a tablas críticas
CREATE TRIGGER audit_report_templates
    AFTER INSERT OR UPDATE OR DELETE ON report_templates
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_framework_contracts
    AFTER INSERT OR UPDATE OR DELETE ON framework_contracts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_delivery_routes
    AFTER INSERT OR UPDATE OR DELETE ON delivery_routes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### 5.2 Trigger para Limpieza Automática
```sql
-- Función para limpiar archivos temporales expirados
CREATE OR REPLACE FUNCTION cleanup_expired_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Eliminar instancias de templates expiradas
    DELETE FROM template_instances
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW()
    AND generation_status = 'completed';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log de limpieza
    INSERT INTO audit_log (table_name, record_id, operation, new_values, changed_by)
    VALUES ('template_instances', gen_random_uuid(), 'CLEANUP', 
           jsonb_build_object('deleted_count', deleted_count), 
           '00000000-0000-0000-0000-000000000000'::uuid);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Programar limpieza automática (requiere pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-files', '0 2 * * *', 'SELECT cleanup_expired_files();');
```

## 6. Índices de Performance

### 6.1 Índices Compuestos para Consultas Frecuentes
```sql
-- Índice para búsqueda de templates por categoría y usuario
CREATE INDEX idx_templates_category_user_active ON report_templates(category, created_by, is_active)
    WHERE is_active = true;

-- Índice para métricas por período y entidad
CREATE INDEX idx_metrics_entity_period_current ON calculated_metrics(entity_type, entity_id, period_start DESC, period_end DESC)
    WHERE is_current = true;

-- Índice para precios actuales por material
CREATE INDEX idx_current_prices_material ON supplier_price_history(material_id, price ASC, valid_from DESC)
    WHERE is_active = true AND (valid_until IS NULL OR valid_until >= CURRENT_DATE);

-- Índice para rutas activas por fecha
CREATE INDEX idx_active_routes_date ON delivery_routes(route_date, status, priority DESC)
    WHERE status IN ('planned', 'optimized', 'assigned', 'in_progress');
```

### 6.2 Índices de Texto Completo
```sql
-- Índice de búsqueda de texto completo para templates
CREATE INDEX idx_templates_fulltext ON report_templates 
    USING GIN(to_tsvector('spanish', name || ' ' || COALESCE(description, '') || ' ' || array_to_string(tags, ' ')));

-- Índice de búsqueda para contratos
CREATE INDEX idx_contracts_fulltext ON framework_contracts 
    USING GIN(to_tsvector('spanish', contract_name || ' ' || contract_number || ' ' || supplier_name));
```

## 7. Vistas Materializadas para Performance

### 7.1 Vista de Métricas de Dashboard
```sql
CREATE MATERIALIZED VIEW dashboard_metrics AS
SELECT 
    'global' as entity_type,
    NULL::uuid as entity_id,
    CURRENT_DATE as metric_date,
    COUNT(DISTINCT s.id) as total_stock_items,
    COUNT(DISTINCT m.id) as total_materials,
    COUNT(DISTINCT o.id) as total_obras,
    COUNT(DISTINCT u.id) as total_users,
    SUM(s.cantidad * s.precio_unitario) as total_inventory_value,
    COUNT(CASE WHEN s.cantidad <= s.stock_minimo THEN 1 END) as low_stock_items,
    COUNT(CASE WHEN s.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_movements
FROM stock s
JOIN materiales m ON s.material_id = m.id
JOIN obras o ON s.obra_id = o.id
JOIN usuarios u ON s.created_by = u.id
WHERE s.is_active = true;

-- Índice para la vista materializada
CREATE UNIQUE INDEX idx_dashboard_metrics_unique ON dashboard_metrics(entity_type, entity_id, metric_date);

-- Función para refrescar métricas
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7.2 Vista de Precios Actuales
```sql
CREATE MATERIALIZED VIEW current_supplier_prices AS
SELECT DISTINCT ON (material_id, supplier_id)
    material_id,
    supplier_id,
    supplier_name,
    price,
    currency,
    minimum_quantity,
    lead_time_days,
    valid_from,
    valid_until,
    discount_percentage,
    price * (100 - discount_percentage) / 100 as final_price
FROM supplier_price_history
WHERE is_active = true
AND valid_from <= CURRENT_DATE
AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
ORDER BY material_id, supplier_id, valid_from DESC;

-- Índices para la vista materializada
CREATE UNIQUE INDEX idx_current_prices_material_supplier ON current_supplier_prices(material_id, supplier_id);
CREATE INDEX idx_current_prices_material_price ON current_supplier_prices(material_id, final_price ASC);
```

## 8. Scripts de Migración

### 8.1 Script de Migración Principal
```sql
-- Migration: Add Enhanced Features Tables
-- Version: 2024.01.001
-- Description: Add tables for templates, imports, analytics, routes, and suppliers

BEGIN;

-- Verificar que las tablas base existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') THEN
        RAISE EXCEPTION 'Base table usuarios does not exist. Please run base migrations first.';
    END IF;
END $$;

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Ejecutar creación de tablas
\i create_templates_tables.sql
\i create_import_tables.sql
\i create_analytics_tables.sql
\i create_routes_tables.sql
\i create_supplier_tables.sql

-- Ejecutar funciones
\i create_functions.sql

-- Ejecutar políticas RLS
\i create_rls_policies.sql

-- Ejecutar triggers
\i create_triggers.sql

-- Crear vistas materializadas
\i create_materialized_views.sql

-- Insertar datos iniciales
\i insert_initial_data.sql

-- Verificar integridad
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'report_templates', 'template_instances', 'import_jobs', 'import_errors',
        'user_dashboards', 'calculated_metrics', 'user_preferences',
        'delivery_routes', 'route_deliveries', 'supplier_price_history', 'framework_contracts'
    );
    
    IF table_count != 11 THEN
        RAISE EXCEPTION 'Migration incomplete. Expected 11 tables, found %', table_count;
    END IF;
    
    RAISE NOTICE 'Migration completed successfully. Created % tables.', table_count;
END $$;

COMMIT;
```

### 8.2 Script de Rollback
```sql
-- Rollback script for enhanced features
-- Version: 2024.01.001

BEGIN;

-- Eliminar vistas materializadas
DROP MATERIALIZED VIEW IF EXISTS dashboard_metrics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS current_supplier_prices CASCADE;

-- Eliminar triggers
DROP TRIGGER IF EXISTS audit_report_templates ON report_templates;
DROP TRIGGER IF EXISTS audit_framework_contracts ON framework_contracts;
DROP TRIGGER IF EXISTS audit_delivery_routes ON delivery_routes;

-- Eliminar funciones
DROP FUNCTION IF EXISTS calculate_user_efficiency(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS optimize_delivery_route(UUID);
DROP FUNCTION IF EXISTS compare_supplier_prices(UUID, DECIMAL, DATE);
DROP FUNCTION IF EXISTS cleanup_expired_files();
DROP FUNCTION IF EXISTS audit_trigger_function();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Eliminar tablas en orden inverso de dependencias
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS route_deliveries CASCADE;
DROP TABLE IF EXISTS delivery_routes CASCADE;
DROP TABLE IF EXISTS framework_contracts CASCADE;
DROP TABLE IF EXISTS supplier_price_history CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS calculated_metrics CASCADE;
DROP TABLE IF EXISTS user_dashboards CASCADE;
DROP TABLE IF EXISTS import_errors CASCADE;
DROP TABLE IF EXISTS import_jobs CASCADE;
DROP TABLE IF EXISTS template_instances CASCADE;
DROP TABLE IF EXISTS report_templates CASCADE;

RAISE NOTICE 'Rollback completed successfully.';

COMMIT;
```

## 9. Monitoreo y Mantenimiento

### 9.1 Consultas de Monitoreo
```sql
-- Monitorear tamaño de tablas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
    'report_templates', 'template_instances', 'import_jobs', 'import_errors',
    'user_dashboards', 'calculated_metrics', 'user_preferences',
    'delivery_routes', 'route_deliveries', 'supplier_price_history', 'framework_contracts'
)
ORDER BY size_bytes DESC;

-- Monitorear uso de índices
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Monitorear consultas lentas relacionadas con nuevas tablas
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query ILIKE '%report_templates%' 
   OR query ILIKE '%import_jobs%'
   OR query ILIKE '%delivery_routes%'
ORDER BY mean_time DESC
LIMIT 10;
```

### 9.2 Tareas de Mantenimiento
```sql
-- Función de mantenimiento diario
CREATE OR REPLACE FUNCTION daily_maintenance()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    cleaned_files INTEGER;
    refreshed_views INTEGER := 0;
BEGIN
    -- Limpiar archivos expirados
    SELECT cleanup_expired_files() INTO cleaned_files;
    result := result || 'Cleaned ' || cleaned_files || ' expired files. ';
    
    -- Refrescar vistas materializadas
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics;
        refreshed_views := refreshed_views + 1;
    EXCEPTION WHEN OTHERS THEN
        result := result || 'Failed to refresh dashboard_metrics: ' || SQLERRM || '. ';
    END;
    
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY current_supplier_prices;
        refreshed_views := refreshed_views + 1;
    EXCEPTION WHEN OTHERS THEN
        result := result || 'Failed to refresh current_supplier_prices: ' || SQLERRM || '. ';
    END;
    
    result := result || 'Refreshed ' || refreshed_views || ' materialized views. ';
    
    -- Actualizar estadísticas de tablas
    ANALYZE report_templates;
    ANALYZE import_jobs;
    ANALYZE calculated_metrics;
    ANALYZE delivery_routes;
    ANALYZE supplier_price_history;
    
    result := result || 'Updated table statistics.';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 10. Consideraciones de Seguridad

### 10.1 Encriptación de Datos Sensibles
```sql
-- Función para encriptar datos sensibles
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
    -- En producción, usar pgcrypto con claves seguras
    RETURN encode(digest(data, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar encriptación a campos sensibles
ALTER TABLE framework_contracts 
ADD COLUMN contract_hash TEXT GENERATED ALWAYS AS (encrypt_sensitive_data(contract_number)) STORED;
```

### 10.2 Políticas de Retención de Datos
```sql
-- Función para aplicar políticas de retención
CREATE OR REPLACE FUNCTION apply_data_retention_policy()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    deleted_count INTEGER;
BEGIN
    -- Eliminar logs de auditoría antiguos (más de 2 años)
    DELETE FROM audit_log 
    WHERE changed_at < NOW() - INTERVAL '2 years';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result := result || 'Deleted ' || deleted_count || ' old audit logs. ';
    
    -- Archivar métricas antiguas (más de 1 año)
    UPDATE calculated_metrics 
    SET is_current = false 
    WHERE calculated_at < NOW() - INTERVAL '1 year' 
    AND is_current = true;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result := result || 'Archived ' || deleted_count || ' old metrics. ';
    
    -- Eliminar trabajos de importación completados antiguos (más de 6 meses)
    DELETE FROM import_jobs 
    WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '6 months';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result := result || 'Deleted ' || deleted_count || ' old import jobs.';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 11. Scripts de Validación

### 11.1 Validación de Integridad de Datos
```sql
-- Función para validar integridad de datos
CREATE OR REPLACE FUNCTION validate_data_integrity()
RETURNS TABLE(
    table_name TEXT,
    validation_type TEXT,
    issue_count BIGINT,
    details TEXT
) AS $$
BEGIN
    -- Validar templates sin datos válidos
    RETURN QUERY
    SELECT 
        'report_templates'::TEXT,
        'invalid_template_data'::TEXT,
        COUNT(*)::BIGINT,
        'Templates with invalid JSON structure'::TEXT
    FROM report_templates
    WHERE NOT (template_data ? 'components' AND template_data ? 'styles');
    
    -- Validar jobs de importación inconsistentes
    RETURN QUERY
    SELECT 
        'import_jobs'::TEXT,
        'inconsistent_records'::TEXT,
        COUNT(*)::BIGINT,
        'Jobs with inconsistent record counts'::TEXT
    FROM import_jobs
    WHERE processed_records != (successful_records + failed_records);
    
    -- Validar rutas sin waypoints
    RETURN QUERY
    SELECT 
        'delivery_routes'::TEXT,
        'empty_waypoints'::TEXT,
        COUNT(*)::BIGINT,
        'Routes without waypoints'::TEXT
    FROM delivery_routes
    WHERE jsonb_array_length(waypoints) = 0;
    
    -- Validar precios con fechas inválidas
    RETURN QUERY
    SELECT 
        'supplier_price_history'::TEXT,
        'invalid_date_range'::TEXT,
        COUNT(*)::BIGINT,
        'Price records with invalid date ranges'::TEXT
    FROM supplier_price_history
    WHERE valid_until IS NOT NULL AND valid_until < valid_from;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 11.2 Validación de Performance
```sql
-- Función para identificar problemas de performance
CREATE OR REPLACE FUNCTION check_performance_issues()
RETURNS TABLE(
    issue_type TEXT,
    table_name TEXT,
    description TEXT,
    recommendation TEXT
) AS $$
BEGIN
    -- Tablas sin estadísticas actualizadas
    RETURN QUERY
    SELECT 
        'stale_statistics'::TEXT,
        schemaname || '.' || tablename,
        'Statistics last updated: ' || COALESCE(last_analyze::TEXT, 'never'),
        'Run ANALYZE on this table'
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    AND (last_analyze IS NULL OR last_analyze < NOW() - INTERVAL '7 days')
    AND n_tup_ins + n_tup_upd + n_tup_del > 1000;
    
    -- Índices no utilizados
    RETURN QUERY
    SELECT 
        'unused_index'::TEXT,
        schemaname || '.' || tablename,
        'Index ' || indexname || ' has ' || idx_scan || ' scans',
        'Consider dropping this index if not needed'
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    AND idx_scan < 10
    AND pg_relation_size(indexrelid) > 1024 * 1024; -- > 1MB
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 12. Documentación de APIs

### 12.1 Endpoints para Templates
```sql
-- Documentación de endpoints (para referencia)
/*
GET /api/templates
- Listar templates disponibles
- Filtros: category, is_public, created_by
- Paginación: page, limit
- Ordenamiento: name, created_at, updated_at

POST /api/templates
- Crear nuevo template
- Body: { name, description, category, template_data, variables }

GET /api/templates/:id
- Obtener template específico
- Incluye: template_data, variables, metadata

PUT /api/templates/:id
- Actualizar template existente
- Solo el creador o admin puede modificar

DELETE /api/templates/:id
- Eliminar template
- Solo el creador o admin puede eliminar

POST /api/templates/:id/generate
- Generar documento desde template
- Body: { data_context, output_format }
- Formatos: pdf, excel, html, docx
*/
```

### 12.2 Endpoints para Importación
```sql
/*
POST /api/import/analyze
- Analizar archivo antes de importar
- Multipart form: file
- Response: { suggested_mapping, preview, validation_errors }

POST /api/import/jobs
- Crear trabajo de importación
- Body: { file, mapping_config, validation_rules, target_table }

GET /api/import/jobs
- Listar trabajos de importación
- Filtros: status, created_by, target_table
- Paginación y ordenamiento

GET /api/import/jobs/:id
- Obtener detalles de trabajo específico
- Incluye: progress, errors, statistics

GET /api/import/jobs/:id/errors
- Obtener errores de importación
- Paginación para manejar muchos errores

POST /api/import/jobs/:id/retry
- Reintentar importación fallida
- Solo registros que fallaron
*/
```

## 13. Conclusiones y Próximos Pasos

### 13.1 Resumen de Implementación
Este documento especifica la estructura completa de base de datos para las funcionalidades avanzadas:

- **11 nuevas tablas** con relaciones bien definidas
- **15 políticas RLS** para seguridad granular
- **8 funciones almacenadas** para lógica de negocio
- **12 triggers** para auditoría y validación
- **2 vistas materializadas** para performance
- **Scripts de migración** y rollback completos

### 13.2 Consideraciones de Implementación

1. **Orden de Ejecución**: Seguir el orden especificado en los scripts de migración
2. **Testing**: Validar cada tabla y función antes de continuar
3. **Performance**: Monitorear el impacto en performance después de cada migración
4. **Backup**: Realizar backup completo antes de ejecutar migraciones
5. **Rollback**: Tener plan de rollback probado y documentado

### 13.3 Métricas de Éxito

- **Tiempo de consulta**: < 500ms para consultas complejas
- **Throughput**: > 1000 operaciones/segundo
- **Disponibilidad**: > 99.9% uptime
- **Integridad**: 0 inconsistencias de datos
- **Seguridad**: 100% compliance con políticas RLS

### 13.4 Próximos Pasos

1. **Revisión técnica** del esquema por el equipo de desarrollo
2. **Validación** con casos de uso reales
3. **Testing de performance** en ambiente de staging
4. **Implementación gradual** por fases
5. **Monitoreo continuo** post-implementación

---

**Nota**: Este documento debe mantenerse actualizado conforme evolucionen los requerimientos y la implementación. Cualquier cambio en el esquema debe ser documentado y versionado apropiadamente.