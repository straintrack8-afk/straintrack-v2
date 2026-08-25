import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Auth client — validates the bearer token
        const supabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { userId, organizationId } = await request.json()

        if (!userId || !organizationId) {
            return NextResponse.json({ error: 'userId and organizationId are required' }, { status: 400 })
        }

        if (userId === user.id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
        }

        // Verify caller role
        const { data: caller } = await supabase
            .from('users')
            .select('role, organization_id')
            .eq('id', user.id)
            .single()

        if (!caller || !['admin', 'super_admin'].includes(caller.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        // Fetch target user
        const { data: targetUser } = await supabase
            .from('users')
            .select('role, organization_id')
            .eq('id', userId)
            .single()

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Nobody can delete a super_admin
        if (targetUser.role === 'super_admin') {
            return NextResponse.json({ error: 'Cannot delete a super admin' }, { status: 403 })
        }

        // Regular admin can only delete members, not other admins
        if (caller.role === 'admin') {
            if (targetUser.role !== 'member') {
                return NextResponse.json(
                    { error: 'Admins can only remove members, not other admins' },
                    { status: 403 }
                )
            }
            if (targetUser.organization_id !== caller.organization_id) {
                return NextResponse.json({ error: 'User is not in your organization' }, { status: 403 })
            }
        }

        // Service-role admin client — bypasses RLS, deletes from auth.users
        // Cascades to public.users automatically via FK ON DELETE CASCADE
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Reassign disease_reports to super_admin before deleting user (FK constraint)
        const { data: superAdmin } = await adminClient
            .from('users')
            .select('id')
            .eq('role', 'super_admin')
            .single()

        if (superAdmin) {
            await adminClient
                .from('disease_reports')
                .update({ created_by: superAdmin.id })
                .eq('created_by', userId)
        }

        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
        if (deleteError) {
            console.error('Auth delete error:', deleteError)
            return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete member error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
