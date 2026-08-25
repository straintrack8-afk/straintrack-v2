import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify caller role from public.users
        const { data: caller } = await supabase
            .from('users')
            .select('role, organization_id')
            .eq('id', user.id)
            .single()

        if (!caller || !['admin', 'super_admin'].includes(caller.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        // Get request body
        const { email, job_title } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single()

        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
        }

        // Delete any existing pending invitation for this email (replace, don't block)
        await supabase
            .from('organization_invitations')
            .delete()
            .eq('organization_id', caller.organization_id)
            .eq('email', email.toLowerCase())
            .eq('status', 'pending')

        // Create invitation record (expires in 7 days)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        const { data: invitation, error: inviteError } = await supabase
            .from('organization_invitations')
            .insert({
                organization_id: caller.organization_id,
                email: email.toLowerCase(),
                invited_by: user.id,
                job_title: job_title || null,
                expires_at: expiresAt.toISOString(),
                status: 'pending'
            })
            .select()
            .single()

        if (inviteError) {
            console.error('Invitation creation error:', inviteError)
            return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            invitation_link: `${process.env.NEXT_PUBLIC_APP_URL}/signup?invitation=${invitation.id}`
        })

    } catch (error) {
        console.error('Invitation error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
