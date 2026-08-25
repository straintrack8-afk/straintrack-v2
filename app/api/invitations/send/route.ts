import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient(request)

        // Auth check
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify caller is admin or super_admin
        const { data: caller } = await supabase
            .from('users')
            .select('id, role, organization_id')
            .eq('id', session.user.id)
            .single()

        if (!caller || !['admin', 'super_admin'].includes(caller.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        if (!caller.organization_id) {
            return NextResponse.json({ error: 'No organization associated with your account' }, { status: 400 })
        }

        const { email, job_title } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Check if user already exists in public.users
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle()

        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 })
        }

        // Check for existing pending invitation for this org + email
        const { data: existingInvite } = await supabase
            .from('organization_invitations')
            .select('id')
            .eq('organization_id', caller.organization_id)
            .eq('email', email.toLowerCase().trim())
            .eq('status', 'pending')
            .maybeSingle()

        if (existingInvite) {
            return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 })
        }

        // Create invitation — expires in 7 days
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        const { data: invitation, error: insertError } = await supabase
            .from('organization_invitations')
            .insert({
                organization_id: caller.organization_id,
                email: email.toLowerCase().trim(),
                invited_by: caller.id,
                status: 'pending',
                expires_at: expiresAt.toISOString(),
                job_title: job_title || null,
            })
            .select('id')
            .single()

        if (insertError || !invitation) {
            console.error('Invitation insert error:', insertError)
            return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
        }

        // Send invitation email via Resend
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
        const signupUrl = `${appUrl}/signup?invitation=${invitation.id}`
        const year = new Date().getFullYear()

        const { error: emailError } = await resend.emails.send({
            from: 'StrainTrack <onboarding@resend.dev>', // Replace with your verified domain
            to: email.toLowerCase().trim(),
            subject: "You've been invited to StrainTrack - Vaksindo Vietnam Animal Health",
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to StrainTrack</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#0d9488;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">StrainTrack</h1>
              <p style="margin:6px 0 0;color:#99f6e4;font-size:13px;letter-spacing:0.3px;">Vaksindo Vietnam Animal Health</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">You've been invited!</h2>
              <p style="margin:0 0 14px;color:#4b5563;font-size:15px;line-height:1.65;">
                You have been invited to join <strong style="color:#111827;">StrainTrack</strong> —
                the disease surveillance and reporting platform for Vaksindo Vietnam Animal Health.
              </p>
              <p style="margin:0 0 32px;color:#4b5563;font-size:15px;line-height:1.65;">
                Click the button below to create your account and access the platform.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="${signupUrl}"
                       style="display:inline-block;background-color:#0d9488;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                      Create Your Account →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry & Disclaimer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9fafb;border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;color:#6b7280;font-size:13px;text-align:center;">
                      ⏱ This invitation link expires in <strong>7 days</strong>.
                    </p>
                    <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                      If you did not expect this invitation, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb;">

              <!-- URL Fallback -->
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${signupUrl}" style="color:#0d9488;word-break:break-all;">${signupUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${year} StrainTrack · Vaksindo Vietnam Animal Health
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        })

        if (emailError) {
            console.error('Resend email error:', emailError)
            return NextResponse.json({
                success: true,
                invitation_id: invitation.id,
                warning: 'Invitation created but email delivery failed. Check RESEND_API_KEY and from address.',
            })
        }

        return NextResponse.json({ success: true, invitation_id: invitation.id })

    } catch (error) {
        console.error('Invitation send error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
