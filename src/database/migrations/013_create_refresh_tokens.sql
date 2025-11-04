-- Migration: 013_create_refresh_tokens
-- Description: Create refresh_tokens table for persistent session management
-- Date: 2025-10-15

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);

-- Add comments
COMMENT ON TABLE refresh_tokens IS 'Persistent refresh tokens for session management';
COMMENT ON COLUMN refresh_tokens.id IS 'Unique refresh token identifier';
COMMENT ON COLUMN refresh_tokens.user_id IS 'User who owns this refresh token';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'Hashed version of the refresh token (for security)';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'When this token expires (defaults to 90 days)';
COMMENT ON COLUMN refresh_tokens.is_revoked IS 'Whether this token has been revoked (logout)';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'When this token was revoked';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'Browser/device information';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP address where token was created';
COMMENT ON COLUMN refresh_tokens.created_at IS 'When this token was created';
COMMENT ON COLUMN refresh_tokens.last_used_at IS 'Last time this token was used for refresh';

-- Cleanup function: Remove expired tokens older than 30 days
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM refresh_tokens 
  WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_refresh_tokens();');

