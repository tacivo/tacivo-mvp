import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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
      .from('admin_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Get inviter details
    const { data: inviter } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', invitation.invited_by)
      .single()

    const inviterName = inviter?.full_name || 'Tacivo Team'

    // Get the base URL - works for Vercel preview deployments and production
    // Note: Use APP_URL (not NEXT_PUBLIC_APP_URL) as this is server-side code
    const appUrl = process.env.APP_URL ||
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const inviteUrl = `${appUrl}/admin-invite/${invitation.token}`

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: invitation.email,
      subject: `You've been invited to become a Tacivo Admin`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f4f4f5;
              }
              .container {
                max-width: 600px;
                margin: 40px auto;
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 30px;
                text-align: center;
              }
              .header h1 {
                color: white;
                margin: 0;
                font-size: 28px;
                font-weight: 600;
              }
              .content {
                padding: 40px 30px;
              }
              .content h2 {
                color: #18181b;
                font-size: 22px;
                margin-top: 0;
                margin-bottom: 16px;
              }
              .content p {
                color: #52525b;
                margin: 16px 0;
              }
              .info-box {
                background: #f4f4f5;
                border-radius: 12px;
                padding: 20px;
                margin: 24px 0;
              }
              .info-box p {
                margin: 8px 0;
                color: #18181b;
              }
              .info-box strong {
                color: #667eea;
              }
              .button {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 14px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin: 24px 0;
                transition: background 0.2s;
              }
              .button:hover {
                background: #5568d3;
              }
              .footer {
                background: #fafafa;
                padding: 30px;
                text-align: center;
                color: #71717a;
                font-size: 14px;
                border-top: 1px solid #e4e4e7;
              }
              .footer p {
                margin: 8px 0;
              }
              .expire-notice {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 16px;
                margin: 24px 0;
                border-radius: 4px;
              }
              .expire-notice p {
                margin: 0;
                color: #92400e;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Admin Invitation</h1>
              </div>

              <div class="content">
                <h2>Hello${invitation.full_name ? ` ${invitation.full_name}` : ''}!</h2>

                <p>
                  <strong>${inviterName}</strong> has invited you to become an administrator on <strong>Tacivo</strong>,
                  the platform for preserving and sharing organizational knowledge.
                </p>

                <p>
                  As an admin, you'll be able to:
                </p>
                <ul style="color: #52525b; margin: 16px 0; padding-left: 24px;">
                  <li>Set up and manage your organization</li>
                  <li>Invite team members and experts</li>
                  <li>Access all platform features and analytics</li>
                  <li>Configure organization settings and preferences</li>
                </ul>

                <div style="text-align: center;">
                  <a href="${inviteUrl}" class="button">Accept Invitation & Get Started</a>
                </div>

                <div class="expire-notice">
                  <p>⏰ <strong>Important:</strong> This invitation expires in 7 days. Please accept it before ${new Date(invitation.expires_at).toLocaleDateString()}.</p>
                </div>

                <p style="font-size: 14px; color: #71717a; margin-top: 32px;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="font-size: 13px; color: #667eea; word-break: break-all;">
                  ${inviteUrl}
                </p>
              </div>

              <div class="footer">
                <p>You're receiving this email because you were invited to Tacivo.</p>
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                <p style="margin-top: 16px;">© ${new Date().getFullYear()} Tacivo. All rights reserved.</p>
              </div>
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
      message: 'Admin invitation email sent successfully',
      emailId: emailData?.id
    })

  } catch (error: any) {
    console.error('Send admin invitation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
