-- Migration: Add organization_invitations table for email invitation system
-- This table tracks pending email invitations to join organizations

-- Create organization_invitations table
CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate pending invitations for same email
    UNIQUE(organization_id, email, status)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON organization_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON organization_invitations(expires_at);

-- Enable RLS
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view invitations for their organization
CREATE POLICY "Admins can view organization invitations"
    ON organization_invitations FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Admins can create invitations for their organization
CREATE POLICY "Admins can create invitations"
    ON organization_invitations FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Admins can update invitation status
CREATE POLICY "Admins can update invitations"
    ON organization_invitations FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
    UPDATE organization_invitations
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON TABLE organization_invitations IS 'Stores email invitations for users to join organizations';
