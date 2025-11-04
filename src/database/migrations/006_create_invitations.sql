-- Migration: 006_create_invitations
-- Description: Create invitations table for store-specific employee invitations
-- Date: 2025-10-09

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'employee' CHECK (role IN ('owner', 'employee')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invitations_store_id ON invitations(store_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_store_status ON invitations(store_id, status);

-- Add trigger to update updated_at
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE invitations IS 'Invitations table for store-specific employee invitations';
COMMENT ON COLUMN invitations.id IS 'Unique invitation identifier';
COMMENT ON COLUMN invitations.store_id IS 'Reference to the store for this invitation';
COMMENT ON COLUMN invitations.email IS 'Email address of invited user';
COMMENT ON COLUMN invitations.token IS 'Unique token for invitation link';
COMMENT ON COLUMN invitations.role IS 'Role to be assigned when invitation is accepted';
COMMENT ON COLUMN invitations.status IS 'Current status of invitation';
COMMENT ON COLUMN invitations.invited_by IS 'User who sent the invitation';
COMMENT ON COLUMN invitations.expires_at IS 'Expiration timestamp for invitation';
COMMENT ON COLUMN invitations.accepted_at IS 'Timestamp when invitation was accepted';
COMMENT ON COLUMN invitations.created_at IS 'Timestamp when invitation was created';
COMMENT ON COLUMN invitations.updated_at IS 'Timestamp when invitation was last updated';

