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

        const { userId, newRole } = await request.json()

        if (!userId || !newRole) {
            return NextResponse.json({ error: 'userId and newRole are required' }, { status: 400 })
        }

        if (!['admin', 'member'].includes(newRole)) {
            return NextResponse.json({ error: 'newRole must be "admin" or "member"' }, { status: 400 })
        }

        if (userId === user.id) {
            return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
        }

        // Only super_admin can change roles
        const { data: caller } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!caller || caller.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 })
        }

        // Verify target exists and is not a super_admin
        const { data: targetUser } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single()

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        if (targetUser.role === 'super_admin') {
            return NextResponse.json({ error: 'Cannot change the role of a super admin' }, { status: 403 })
        }

        // Service-role client — bypasses users_update_own RLS policy
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error: updateError } = await adminClient
            .from('users')
            .update({ role: newRole })
            .eq('id', userId)

        if (updateError) {
            console.error('Role update error:', updateError)
            return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Role update error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
