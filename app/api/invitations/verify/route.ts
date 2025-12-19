import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Log environment variables for debugging (only log presence, not actual values)
    console.log('Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length,
      keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      })
      return NextResponse.json(
        { error: 'Server configuration error - missing credentials' },
        { status: 500 }
      )
    }

    // Create a Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { token, type = 'regular' } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Determine which table to query based on invitation type
    const tableName = type === 'admin' ? 'admin_invitations' : 'invitations'

    // Fetch invitation using service role (bypasses RLS)
    const { data: invitation, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('token', token)
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      )
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 410 }
      )
    }

    // Fetch organization details if this is a regular invitation
    let organization = null
    if (type === 'regular' && invitation.organization_id) {
      const { data: orgData } = await supabaseAdmin
        .from('organizations')
        .select('id, name, logo_url')
        .eq('id', invitation.organization_id)
        .single()

      organization = orgData
    }

    return NextResponse.json({
      invitation,
      organization
    })

  } catch (error: any) {
    console.error('Verify invitation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
