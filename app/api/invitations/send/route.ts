import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { invitationId } = await request.json()

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*, organization:organizations(name)')
      .eq('id', invitationId)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation is no longer pending' },
        { status: 400 }
      )
    }

    if (new Date(invitation.expires_at) < new Date()) {
      // Update invitation status to expired
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId)

      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Get organization name
    const orgName = invitation.organization?.name || 'the organization'

    // Get the base URL - works for Vercel preview deployments and production
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    // Create invitation link
    const inviteUrl = `${appUrl}/invite/${invitation.token}`

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: invitation.email,
      subject: `You've been invited to join ${orgName} on Tacivo`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
            </div>

            <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${invitation.full_name},</p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                You've been invited to join <strong>${orgName}</strong> on Tacivo${invitation.is_admin ? ' as an <strong>Admin</strong>' : ''}${invitation.is_expert ? ' as an <strong>Expert</strong>' : ''}.
              </p>

              ${invitation.role ? `<p style="font-size: 16px; margin-bottom: 20px;">Role: <strong>${invitation.role}</strong></p>` : ''}

              ${invitation.goal ? `<p style="font-size: 16px; margin-bottom: 20px; padding: 16px; background: #f9fafb; border-left: 4px solid #667eea; border-radius: 4px;">${invitation.goal}</p>` : ''}

              <p style="font-size: 16px; margin-bottom: 30px;">
                Click the button below to accept your invitation and create your account.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                Or copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
              </p>

              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                This invitation will expire on ${new Date(invitation.expires_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}.
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Tacivo. All rights reserved.</p>
            </div>
          </body>
        </html>
      `
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json(
        { error: 'Failed to send email', details: emailError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      emailId: emailData?.id,
      inviteUrl
    })

  } catch (error: any) {
    console.error('Send invitation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
