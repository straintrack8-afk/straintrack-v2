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
        const { userId, organizationId } = await request.json()

        if (!userId || !organizationId) {
            return NextResponse.json({ error: 'User ID and organization ID required' }, { status: 400 })
        }

        // Verify requester is admin of the organization
        const { data: requesterOrg } = await supabase
            .from('user_organizations')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('organization_id', organizationId)
            .single()

        if (!requesterOrg || !['admin', 'super_admin'].includes(requesterOrg.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        // Verify target user is a member of the organization
        const { data: targetUserOrg } = await supabase
            .from('user_organizations')
            .select('role')
            .eq('user_id', userId)
            .eq('organization_id', organizationId)
            .single()

        if (!targetUserOrg) {
            return NextResponse.json({ error: 'User is not a member of this organization' }, { status: 404 })
        }

        if (targetUserOrg.role === 'admin') {
            return NextResponse.json({ error: 'User is already an admin' }, { status: 400 })
        }

        // Promote user to admin
        const { data: updatedMember, error: updateError } = await supabase
            .from('user_organizations')
            .update({ role: 'admin' })
            .eq('user_id', userId)
            .eq('organization_id', organizationId)
            .select('*, users(id, email, full_name)')
            .single()

        if (updateError) {
            console.error('Promote error:', updateError)
            return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            member: updatedMember
        })

    } catch (error) {
        console.error('Promote error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
