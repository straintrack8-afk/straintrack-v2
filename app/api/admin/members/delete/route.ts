import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { userId, organizationId } = await request.json()

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

        if (!userId || !organizationId) {
            return NextResponse.json({ error: 'User ID and Organization ID are required' }, { status: 400 })
        }

        // 3. Delete Member from Organization
        const { error: deleteError } = await supabase
            .from('user_organizations')
            .delete()
            .eq('user_id', userId)
            .eq('organization_id', organizationId)

        if (deleteError) {
            console.error('Error deleting member:', deleteError)
            return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 })
        }

        // 4. Also clear the organization_id from the users table (maintain consistency)
        const { error: updateError } = await supabase
            .from('users')
            .update({ organization_id: null })
            .eq('id', userId)
            .eq('organization_id', organizationId) // Only if they are still in that org

        if (updateError) {
            // Log warning but don't fail, primary action was removing from user_organizations
            console.warn('Warning: Failed to clear organization_id from users table:', updateError)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
