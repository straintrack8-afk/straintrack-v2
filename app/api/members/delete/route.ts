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

        // Prevent self-deletion
        if (userId === session.user.id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
        }

        // Verify caller is admin of the organization (via users table)
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

        // Verify target user is in this organization
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

        // Guard: cannot remove last admin
        if (targetUser.role === 'admin') {
            const { count: adminCount } = await supabase
                .from('users')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
                .eq('role', 'admin')

            if ((adminCount ?? 0) <= 1) {
                return NextResponse.json(
                    { error: 'Cannot remove the last admin. Promote another member first.' },
                    { status: 400 }
                )
            }
        }

        // Remove member: clear organization_id and reset role to 'admin' (default for new users)
        const { error: removeError } = await supabase
            .from('users')
            .update({ organization_id: null, role: 'admin' })
            .eq('id', userId)

        if (removeError) {
            console.error('Delete member error:', removeError)
            return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Member removed successfully' })

    } catch (error) {
        console.error('Delete member error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
