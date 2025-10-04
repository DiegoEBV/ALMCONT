-- Fix geofences table schema to match TypeScript interface
-- Add missing columns and update existing ones

-- Add missing columns to geofences table
ALTER TABLE geofences 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS geometry_type VARCHAR(20) DEFAULT 'circle' CHECK (geometry_type IN ('circle', 'polygon')),
ADD COLUMN IF NOT EXISTS radius DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS center_lat DECIMAL(10,6),
ADD COLUMN IF NOT EXISTS center_lng DECIMAL(10,6),
ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(20) CHECK (trigger_type IN ('entry', 'exit', 'both'));

-- Update trigger_type to match alert_type if null
UPDATE geofences 
SET trigger_type = alert_type 
WHERE trigger_type IS NULL AND alert_type IS NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_geofences_geometry_type ON geofences(geometry_type);
CREATE INDEX IF NOT EXISTS idx_geofences_is_active ON geofences(is_active);
CREATE INDEX IF NOT EXISTS idx_geofences_trigger_type ON geofences(trigger_type);

-- Update RLS policies to ensure proper access
DROP POLICY IF EXISTS "Enable read access for all users" ON geofences;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON geofences;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON geofences;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON geofences;

-- Create comprehensive RLS policies
CREATE POLICY "Enable all operations for authenticated users" ON geofences
    FOR ALL USING (true) WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;