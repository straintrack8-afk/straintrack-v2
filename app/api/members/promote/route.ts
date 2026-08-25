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

        const { userId, organizationId } = await request.json()

        if (!userId || !organizationId) {
            return NextResponse.json(
                { error: 'User ID and organization ID required' },
                { status: 400 }
            )
        }

        // Verify caller is an admin or super_admin of the given organization.
        // With the simplified model, we look directly at users.role and users.organization_id.
        const { data: requester } = await supabase
            .from('users')
            .select('role, organization_id')
            .eq('id', session.user.id)
            .single()

        const callerIsAdmin =
            requester?.organization_id === organizationId &&
            ['admin', 'super_admin'].includes(requester?.role ?? '')

        if (!callerIsAdmin) {
            return NextResponse.json(
                { error: 'Forbidden: Admin access required' },
                { status: 403 }
            )
        }

        // Verify target user is in the same organization
        const { data: targetUser } = await supabase
            .from('users')
            .select('role, organization_id')
            .eq('id', userId)
            .single()

        if (!targetUser || targetUser.organization_id !== organizationId) {
            return NextResponse.json(
                { error: 'User is not a member of this organization' },
                { status: 404 }
            )
        }

        if (targetUser.role === 'admin') {
            return NextResponse.json(
                { error: 'User is already an admin' },
                { status: 400 }
            )
        }

        // Promote: update role on users table
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ role: 'admin' })
            .eq('id', userId)
            .select('id, email, full_name, role')
            .single()

        if (updateError) {
            console.error('Promote error:', updateError)
            return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 })
        }

        return NextResponse.json({ success: true, member: updatedUser })

    } catch (error) {
        console.error('Promote error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
