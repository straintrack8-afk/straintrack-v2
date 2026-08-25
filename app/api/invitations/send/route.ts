import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient(request)

        // Check authentication
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get request body
        const { email, organizationId } = await request.json()

        if (!email || !organizationId) {
            return NextResponse.json({ error: 'Email and organization ID required' }, { status: 400 })
        }

        // Verify user is admin of the organization
        const { data: userOrg } = await supabase
            .from('user_organizations')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('organization_id', organizationId)
            .single()

        if (!userOrg || !['admin', 'super_admin'].includes(userOrg.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single()

        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
        }

        // Check for existing pending invitation
        const { data: existingInvitation } = await supabase
            .from('organization_invitations')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('email', email.toLowerCase())
            .eq('status', 'pending')
            .single()

        if (existingInvitation) {
            return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 400 })
        }

        // Get organization details
        const { data: organization } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', organizationId)
            .single()

        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        // Get inviter details
        const { data: inviter } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', session.user.id)
            .single()

        // Create invitation record (expires in 7 days)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        const { data: invitation, error: inviteError } = await supabase
            .from('organization_invitations')
            .insert({
                organization_id: organizationId,
                email: email.toLowerCase(),
                invited_by: session.user.id,
                expires_at: expiresAt.toISOString(),
                status: 'pending'
            })
            .select()
            .single()

        if (inviteError) {
            console.error('Invitation creation error:', inviteError)
            return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            invitation_link: `${process.env.NEXT_PUBLIC_APP_URL}/signup?invitation=${invitation.id}`
        })

    } catch (error) {
        console.error('Invitation error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
