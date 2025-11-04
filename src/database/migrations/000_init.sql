-- Migration: 000_init
-- Description: Initial setup and extensions
-- Date: 2025-10-09

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional security functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create function to generate random tokens
CREATE OR REPLACE FUNCTION generate_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON EXTENSION "uuid-ossp" IS 'Extension for UUID generation';
COMMENT ON EXTENSION "pgcrypto" IS 'Extension for cryptographic functions';
COMMENT ON FUNCTION generate_token IS 'Function to generate random tokens for invitations';

