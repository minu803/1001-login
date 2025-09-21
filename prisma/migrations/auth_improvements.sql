-- IMPROVEMENT 10: Database Schema Enhancements for Better Auth Scalability

-- Add session activities tracking table
CREATE TABLE IF NOT EXISTS session_activities (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(200),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add security audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(200) NOT NULL,
  result VARCHAR(20) NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE', 'WARNING')),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user permissions table for fine-grained access control
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(100) NOT NULL,
  granted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, permission)
);

-- Add role hierarchy table
CREATE TABLE IF NOT EXISTS role_hierarchy (
  id SERIAL PRIMARY KEY,
  parent_role VARCHAR(50) NOT NULL,
  child_role VARCHAR(50) NOT NULL,
  UNIQUE(parent_role, child_role)
);

-- Insert default role hierarchy
INSERT INTO role_hierarchy (parent_role, child_role) VALUES
('ADMIN', 'VOLUNTEER'),
('ADMIN', 'TEACHER'),
('ADMIN', 'INSTITUTION'),
('ADMIN', 'LEARNER'),
('VOLUNTEER', 'LEARNER'),
('TEACHER', 'LEARNER'),
('INSTITUTION', 'LEARNER')
ON CONFLICT (parent_role, child_role) DO NOTHING;

-- Add session security table
CREATE TABLE IF NOT EXISTS session_security (
  id SERIAL PRIMARY KEY,
  session_token TEXT NOT NULL REFERENCES sessions(session_token) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  is_suspicious BOOLEAN DEFAULT FALSE,
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_activities_user_id ON session_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_session_activities_created_at ON session_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_security_session_token ON session_security(session_token);
CREATE INDEX IF NOT EXISTS idx_session_security_last_activity ON session_security(last_activity);

-- Enhanced RLS Policies

-- Session activities policy
CREATE POLICY session_activities_policy ON session_activities
  FOR ALL TO authenticated
  USING (
    user_id = current_setting('app.current_user_id')::text 
    OR current_setting('app.current_user_role')::text = 'ADMIN'
  );

-- Security audit log policy (admin only)
CREATE POLICY security_audit_policy ON security_audit_log
  FOR ALL TO authenticated
  USING (current_setting('app.current_user_role')::text = 'ADMIN');

-- User permissions policy
CREATE POLICY user_permissions_policy ON user_permissions
  FOR ALL TO authenticated
  USING (
    user_id = current_setting('app.current_user_id')::text 
    OR current_setting('app.current_user_role')::text = 'ADMIN'
  );

-- Enable RLS
ALTER TABLE session_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_security ENABLE ROW LEVEL SECURITY;
