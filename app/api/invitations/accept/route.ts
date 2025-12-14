import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { invitationId, userId } = await request.json()

    if (!invitationId || !userId) {
      return NextResponse.json(
        { error: 'Invitation ID and User ID are required' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update invitation status to accepted
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invitation', details: updateError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully'
    })

  } catch (error: any) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
