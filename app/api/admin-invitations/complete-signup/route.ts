import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { userId, invitationId, profile, organization } = await request.json()

    if (!userId || !invitationId || !profile || !organization) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify the invitation exists and is valid
    const { data: invitation, error: inviteError } = await supabase
      .from('admin_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      )
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'Invitation already accepted' },
        { status: 400 }
      )
    }

    // Create organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organization.name,
        website: organization.website || null,
        industry: organization.industry || null,
        size: organization.size || null,
        description: organization.description || null
      })
      .select()
      .single()

    if (orgError) {
      console.error('Organization creation error:', orgError)
      return NextResponse.json(
        { error: 'Failed to create organization', details: orgError },
        { status: 500 }
      )
    }

    // Update profile with all information and mark as admin
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        role: profile.role || null,
        years_of_experience: profile.years_of_experience || null,
        area_of_expertise: profile.area_of_expertise || null,
        goal: profile.goal || null,
        organization_id: orgData.id,
        is_admin: true
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.json(
        { error: 'Failed to update profile', details: profileError },
        { status: 500 }
      )
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('admin_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      // Don't fail - user and org are already created
    }

    return NextResponse.json({
      success: true,
      organization: orgData
    })

  } catch (error: any) {
    console.error('Complete signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
