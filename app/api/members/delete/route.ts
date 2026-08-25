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

        // Prevent self-deletion
        if (userId === session.user.id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
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

        // Check if this is the last admin
        if (targetUserOrg.role === 'admin') {
            const { data: adminCount } = await supabase
                .from('user_organizations')
                .select('id', { count: 'exact' })
                .eq('organization_id', organizationId)
                .eq('role', 'admin')

            if (adminCount && adminCount.length <= 1) {
                return NextResponse.json({
                    error: 'Cannot delete the last admin. Promote another member to admin first.'
                }, { status: 400 })
            }
        }

        // Delete user from organization
        const { error: deleteError } = await supabase
            .from('user_organizations')
            .delete()
            .eq('user_id', userId)
            .eq('organization_id', organizationId)

        if (deleteError) {
            console.error('Delete error:', deleteError)
            return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Member deleted successfully'
        })

    } catch (error) {
        console.error('Delete member error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
