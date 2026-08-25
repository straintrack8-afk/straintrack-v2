import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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

        // 2. Check Super Admin status
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userError || userData?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 })
        }

        if (!userId || !organizationId) {
            return NextResponse.json({ error: 'User ID and Organization ID are required' }, { status: 400 })
        }

        // 3. Service role client for auth.users deletion
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Reassign reports to super_admin first
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

        // Delete from auth.users (cascades to public.users via FK)
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
        if (deleteError) {
            console.error('Delete error:', deleteError)
            return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
