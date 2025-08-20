-- Create job_queue table for asynchronous job processing
CREATE TABLE IF NOT EXISTS job_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('import', 'export', 'validation')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    data JSONB NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create validation_results table for storing validation results
CREATE TABLE IF NOT EXISTS validation_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES job_queue(id) ON DELETE CASCADE,
    result JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_priority ON job_queue(priority);
CREATE INDEX IF NOT EXISTS idx_job_queue_user_id ON job_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_job_queue_created_at ON job_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_job_queue_type ON job_queue(type);
CREATE INDEX IF NOT EXISTS idx_job_queue_status_priority_created ON job_queue(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_validation_results_job_id ON validation_results(job_id);

-- Add updated_at trigger for job_queue
CREATE OR REPLACE FUNCTION update_job_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_queue_updated_at
    BEFORE UPDATE ON job_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_job_queue_updated_at();

-- Enable Row Level Security
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_queue
CREATE POLICY "Users can view their own jobs" ON job_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON job_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON job_queue
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" ON job_queue
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for validation_results
CREATE POLICY "Users can view validation results for their jobs" ON validation_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM job_queue 
            WHERE job_queue.id = validation_results.job_id 
            AND job_queue.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert validation results" ON validation_results
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update validation results" ON validation_results
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete validation results for their jobs" ON validation_results
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM job_queue 
            WHERE job_queue.id = validation_results.job_id 
            AND job_queue.user_id = auth.uid()
        )
    );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON job_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON validation_results TO authenticated;

-- Grant permissions to anon users (for public access if needed)
GRANT SELECT ON job_queue TO anon;
GRANT SELECT ON validation_results TO anon;

-- Create function to clean up old completed jobs
CREATE OR REPLACE FUNCTION cleanup_old_jobs(days_old INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM job_queue 
    WHERE status IN ('completed', 'failed') 
    AND completed_at < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get queue statistics
CREATE OR REPLACE FUNCTION get_queue_stats(user_uuid UUID DEFAULT NULL)
RETURNS TABLE(
    pending BIGINT,
    processing BIGINT,
    completed BIGINT,
    failed BIGINT,
    total BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'processing') AS processing,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed,
        COUNT(*) AS total
    FROM job_queue
    WHERE (user_uuid IS NULL OR user_id = user_uuid)
    AND created_at >= NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to tables
COMMENT ON TABLE job_queue IS 'Queue for asynchronous job processing including imports, exports, and validations';
COMMENT ON TABLE validation_results IS 'Stores validation results for jobs processed through the queue';

-- Add comments to important columns
COMMENT ON COLUMN job_queue.type IS 'Type of job: import, export, or validation';
COMMENT ON COLUMN job_queue.status IS 'Current status of the job';
COMMENT ON COLUMN job_queue.priority IS 'Job priority: low, medium, or high';
COMMENT ON COLUMN job_queue.data IS 'Job-specific data and parameters stored as JSON';
COMMENT ON COLUMN job_queue.progress IS 'Job completion percentage (0-100)';
COMMENT ON COLUMN validation_results.result IS 'Validation results stored as JSON';