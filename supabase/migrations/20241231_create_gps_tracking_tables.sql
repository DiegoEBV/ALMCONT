-- GPS Tracking System Database Schema
-- Created: 2024-12-31

-- Create vehicles table first (if not exists)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    model VARCHAR(100),
    vehicle_type VARCHAR(50) DEFAULT 'truck',
    fuel_capacity DECIMAL(8,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create GPS devices table
CREATE TABLE gps_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imei VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    report_interval INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create GPS locations table
CREATE TABLE gps_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES gps_devices(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(5, 2) DEFAULT 0,
    heading DECIMAL(5, 2) DEFAULT 0,
    satellites INTEGER DEFAULT 0,
    battery_level DECIMAL(5, 2) DEFAULT 100,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create geofences table
CREATE TABLE geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    coordinates JSON NOT NULL,
    alert_type VARCHAR(20) CHECK (alert_type IN ('entry', 'exit', 'both')),
    active_hours JSONB DEFAULT '{"start": "00:00", "end": "23:59"}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create geofence_vehicles junction table
CREATE TABLE geofence_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create GPS alerts table
CREATE TABLE gps_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES gps_devices(id) ON DELETE CASCADE,
    geofence_id UUID REFERENCES geofences(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    alert_data JSON,
    is_resolved BOOLEAN DEFAULT false,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create vehicle assignments table
CREATE TABLE vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
    assigned_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_gps_devices_vehicle_id ON gps_devices(vehicle_id);
CREATE INDEX idx_gps_devices_imei ON gps_devices(imei);
CREATE INDEX idx_gps_devices_active ON gps_devices(is_active);

CREATE INDEX idx_gps_locations_device_id ON gps_locations(device_id);
CREATE INDEX idx_gps_locations_recorded_at ON gps_locations(recorded_at DESC);
CREATE INDEX idx_gps_locations_coordinates ON gps_locations(latitude, longitude);

CREATE INDEX idx_geofences_active ON geofences(is_active);
CREATE INDEX idx_geofences_name ON geofences(name);

CREATE INDEX idx_gps_alerts_device_id ON gps_alerts(device_id);
CREATE INDEX idx_gps_alerts_triggered_at ON gps_alerts(triggered_at DESC);
CREATE INDEX idx_gps_alerts_resolved ON gps_alerts(is_resolved);

CREATE INDEX idx_geofence_vehicles_geofence_id ON geofence_vehicles(geofence_id);
CREATE INDEX idx_geofence_vehicles_vehicle_id ON geofence_vehicles(vehicle_id);

CREATE INDEX idx_vehicle_assignments_vehicle_id ON vehicle_assignments(vehicle_id);
CREATE INDEX idx_vehicle_assignments_obra_id ON vehicle_assignments(obra_id);
CREATE INDEX idx_vehicle_assignments_active ON vehicle_assignments(is_active);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gps_devices_updated_at BEFORE UPDATE ON gps_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_geofences_updated_at BEFORE UPDATE ON geofences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_assignments_updated_at BEFORE UPDATE ON vehicle_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE gps_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to view GPS devices" ON gps_devices
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage GPS devices" ON gps_devices
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow anon users to view GPS devices" ON gps_devices
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated users to view GPS locations" ON gps_locations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage GPS locations" ON gps_locations
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow anon users to view GPS locations" ON gps_locations
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated users to view vehicles" ON vehicles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage vehicles" ON vehicles
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow anon users to view vehicles" ON vehicles
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated users to view geofences" ON geofences
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage geofences" ON geofences
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to view geofence_vehicles" ON geofence_vehicles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage geofence_vehicles" ON geofence_vehicles
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to view GPS alerts" ON gps_alerts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage GPS alerts" ON gps_alerts
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to view vehicle assignments" ON vehicle_assignments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage vehicle assignments" ON vehicle_assignments
    FOR ALL TO authenticated USING (true);

-- Grant permissions to roles
GRANT SELECT ON gps_devices TO anon;
GRANT ALL PRIVILEGES ON gps_devices TO authenticated;

GRANT SELECT ON gps_locations TO anon;
GRANT ALL PRIVILEGES ON gps_locations TO authenticated;

GRANT SELECT ON vehicles TO anon;
GRANT ALL PRIVILEGES ON vehicles TO authenticated;

GRANT SELECT ON geofences TO anon;
GRANT ALL PRIVILEGES ON geofences TO authenticated;

GRANT SELECT ON geofence_vehicles TO anon;
GRANT ALL PRIVILEGES ON geofence_vehicles TO authenticated;

GRANT SELECT ON gps_alerts TO anon;
GRANT ALL PRIVILEGES ON gps_alerts TO authenticated;

GRANT SELECT ON vehicle_assignments TO anon;
GRANT ALL PRIVILEGES ON vehicle_assignments TO authenticated;

-- Insert sample data
INSERT INTO vehicles (plate_number, model, vehicle_type, fuel_capacity) VALUES
    ('ABC-123', 'Ford F-150', 'pickup', 80.0),
    ('DEF-456', 'Volvo FH16', 'truck', 400.0),
    ('GHI-789', 'Toyota Hilux', 'pickup', 65.0)
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO gps_devices (imei, name, vehicle_id, report_interval) VALUES
    ('123456789012345', 'GPS Camión Principal', (SELECT id FROM vehicles WHERE plate_number = 'DEF-456'), 30),
    ('123456789012346', 'GPS Camioneta Supervisión', (SELECT id FROM vehicles WHERE plate_number = 'ABC-123'), 60),
    ('123456789012347', 'GPS Toyota Hilux', (SELECT id FROM vehicles WHERE plate_number = 'GHI-789'), 45)
ON CONFLICT (imei) DO NOTHING;

-- Insert sample geofence
INSERT INTO geofences (name, coordinates, alert_type) VALUES
    ('Zona Obra Principal', '[{"lat": -12.0464, "lng": -77.0428}, {"lat": -12.0464, "lng": -77.0400}, {"lat": -12.0440, "lng": -77.0400}, {"lat": -12.0440, "lng": -77.0428}]', 'both')
ON CONFLICT DO NOTHING;