import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
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

        const { userId, fullName, organizationId } = await request.json()

        if (!userId || !fullName || !organizationId) {
            return NextResponse.json({ error: 'userId, fullName, and organizationId are required' }, { status: 400 })
        }

        if (userId !== user.id) {
            return NextResponse.json({ error: 'Forbidden: can only complete own signup' }, { status: 403 })
        }

        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error: updateError } = await adminClient
            .from('users')
            .update({
                full_name: fullName,
                organization_id: organizationId,
                role: 'member'
            })
            .eq('id', userId)

        if (updateError) {
            console.error('Complete signup error:', updateError)
            return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Complete signup error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
