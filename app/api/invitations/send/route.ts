import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient(request)

        // Check authentication
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get request body
        const { email, organizationId } = await request.json()

        if (!email || !organizationId) {
            return NextResponse.json({ error: 'Email and organization ID required' }, { status: 400 })
        }

        // Verify user is admin of the organization
        const { data: userOrg } = await supabase
            .from('user_organizations')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('organization_id', organizationId)
            .single()

        if (!userOrg || !['admin', 'super_admin'].includes(userOrg.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
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

        // Check for existing pending invitation
        const { data: existingInvitation } = await supabase
            .from('organization_invitations')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('email', email.toLowerCase())
            .eq('status', 'pending')
            .single()

        if (existingInvitation) {
            return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 400 })
        }

        // Get organization details
        const { data: organization } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', organizationId)
            .single()

        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        // Get inviter details
        const { data: inviter } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', session.user.id)
            .single()

        // Create invitation record (expires in 7 days)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        const { data: invitation, error: inviteError } = await supabase
            .from('organization_invitations')
            .insert({
                organization_id: organizationId,
                email: email.toLowerCase(),
                invited_by: session.user.id,
                expires_at: expiresAt.toISOString(),
                status: 'pending'
            })
            .select()
            .single()

        if (inviteError) {
            console.error('Invitation creation error:', inviteError)
            return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
        }

        // Create signup link with invitation token
        const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/signup?invitation=${invitation.id}`

        // Send email via Resend
        // NOTE: onboarding@resend.dev can only send to verified email (owner's email)
        // For testing with other emails, we'll skip email sending but create invitation
        const TESTING_MODE = process.env.NODE_ENV === 'development'
        const OWNER_EMAIL = 'straintrack8@gmail.com' // Email used to register Resend

        try {
            // Only send email if recipient is owner email (Resend restriction)
            if (!TESTING_MODE || email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
                const emailResult = await resend.emails.send({
                    from: 'StrainTrack <onboarding@resend.dev>',
                    to: email,
                    subject: `You've been invited to join ${organization.name} on StrainTrack`,
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                                <h1 style="color: white; margin: 0; font-size: 28px;">StrainTrack</h1>
                            </div>
                            
                            <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                                <h2 style="color: #111827; margin-top: 0;">You're Invited!</h2>
                                
                                <p style="font-size: 16px; color: #4b5563;">
                                    <strong>${inviter?.full_name || inviter?.email}</strong> has invited you to join 
                                    <strong>${organization.name}</strong> on StrainTrack.
                                </p>
                                
                                <p style="font-size: 16px; color: #4b5563;">
                                    StrainTrack is a comprehensive disease tracking and management system for livestock farms.
                                </p>
                                
                                <div style="text-align: center; margin: 35px 0;">
                                    <a href="${signupUrl}" 
                                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                              color: white; 
                                              padding: 14px 32px; 
                                              text-decoration: none; 
                                              border-radius: 8px; 
                                              font-weight: 600; 
                                              font-size: 16px;
                                              display: inline-block;">
                                        Accept Invitation & Create Account
                                    </a>
                                </div>
                                
                                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                                    This invitation will expire in <strong>7 days</strong> on 
                                    ${expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                                </p>
                                
                                <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                                    If you didn't expect this invitation, you can safely ignore this email.
                                </p>
                            </div>
                            
                            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
                                <p>© ${new Date().getFullYear()} StrainTrack. All rights reserved.</p>
                            </div>
                        </body>
                        </html>
                    `
                })

                console.log('✅ Email sent successfully:', {
                    emailId: emailResult.data?.id,
                    to: email,
                    from: 'onboarding@resend.dev'
                })
            } else {
                // Testing mode: Skip email, just create invitation
                console.log('⚠️ TESTING MODE: Email skipped (Resend restriction)')
                console.log('📋 Invitation created but email not sent to:', email)
                console.log('🔗 Signup URL:', signupUrl)
                console.log('💡 To receive emails, use owner email:', OWNER_EMAIL)
            }
        } catch (emailError: any) {
            console.error('❌ Email sending error:', {
                error: emailError.message,
                statusCode: emailError.statusCode,
                name: emailError.name
            })

            // In testing mode, don't fail if email doesn't send
            if (TESTING_MODE) {
                console.log('⚠️ Email failed but continuing in testing mode')
            } else {
                // Delete invitation if email fails in production
                await supabase
                    .from('organization_invitations')
                    .delete()
                    .eq('id', invitation.id)

                return NextResponse.json({
                    error: `Failed to send invitation email: ${emailError.message || 'Unknown error'}`
                }, { status: 500 })
            }
        }

        return NextResponse.json({
            success: true,
            invitation: {
                id: invitation.id,
                email: invitation.email,
                expires_at: invitation.expires_at
            }
        })

    } catch (error) {
        console.error('Invitation error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
