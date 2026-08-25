import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { organizationId } = await request.json()

        // 1. Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Check Super Admin status
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userError || userData?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 })
        }

        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
        }

        // 3. Delete Organization
        // Start a transaction-like flow (though Supabase REST doesn't support true transactions in this way,
        // cleaning up the user associations happens via CASCADE in DB mostly, but we trigger the delete on org)
        const { error: deleteError } = await supabase
            .from('organizations')
            .delete()
            .eq('id', organizationId)

        if (deleteError) {
            console.error('Error deleting organization:', deleteError)
            return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
