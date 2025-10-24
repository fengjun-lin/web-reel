-- Web Reel Sessions Table
-- Stores uploaded replay session files and metadata

-- Drop existing tables and triggers if they exist
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS sessions;

-- Create sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    blob_url TEXT NOT NULL,                     -- Vercel Blob public URL
    file_size INTEGER NOT NULL,                 -- File size in bytes
    jira_id VARCHAR(255),                       -- Optional Jira ticket ID
    platform VARCHAR(100),                       -- Optional platform identifier
    device_id VARCHAR(255),                      -- Optional device identifier
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX idx_sessions_jira_id ON sessions(jira_id) WHERE jira_id IS NOT NULL;
CREATE INDEX idx_sessions_device_id ON sessions(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to call the function before any UPDATE
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE sessions IS 'Stores Web Reel replay session metadata and file references';
COMMENT ON COLUMN sessions.blob_url IS 'Vercel Blob public URL for the session zip file';
COMMENT ON COLUMN sessions.file_size IS 'Size of the session file in bytes';
COMMENT ON COLUMN sessions.jira_id IS 'Associated Jira ticket ID';
COMMENT ON COLUMN sessions.platform IS 'Platform where session was recorded (e.g., web, mobile)';
COMMENT ON COLUMN sessions.device_id IS 'Device identifier for the session';
