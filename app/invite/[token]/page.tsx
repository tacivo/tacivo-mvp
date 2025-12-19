'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase/client'
import { Invitation, Organization } from '@/types/database.types'

export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    loadInvitation()
  }, [token])

  async function loadInvitation() {
    try {
      // Call secure API endpoint instead of direct Supabase query
      // This bypasses RLS using service role on the server side
      const response = await fetch('/api/invitations/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          type: 'regular' // or 'admin' for admin invitations
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Invitation not found')
        setIsLoading(false)
        return
      }

      const data = await response.json()
      const typedInvite = data.invitation as unknown as Invitation

      if (data.organization) {
        setOrganization(data.organization as unknown as Organization)
      }

      setInvitation(typedInvite)
    } catch (err) {
      console.error('Error loading invitation:', err)
      setError('Failed to load invitation')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAcceptInvitation() {
    if (!invitation) return

    if (password.length < 8) {
      alert('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    setIsAccepting(true)
    try {
      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          data: {
            full_name: invitation.full_name
          }
        }
      })

      if (signUpError) {
        // Check if user already exists
        if (signUpError.message.includes('already registered')) {
          alert('An account with this email already exists. Please sign in instead.')
          router.push('/login')
          return
        }
        throw signUpError
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      // Update profile with invitation details
      const { error: profileError } = await supabase
        .from('profiles')
        // @ts-expect-error - Supabase type inference issue
        .update({
          full_name: invitation.full_name,
          organization_id: invitation.organization_id,
          role: invitation.role,
          years_of_experience: invitation.years_of_experience,
          area_of_expertise: invitation.area_of_expertise,
          goal: invitation.goal,
          is_admin: invitation.is_admin,
          is_expert: invitation.is_expert
        })
        .eq('id', authData.user.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
        // Don't throw - profile will be created by trigger
      }

      // Mark invitation as accepted via API (uses service role to bypass RLS)
      const acceptResponse = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitation.id,
          userId: authData.user.id
        })
      })

      if (!acceptResponse.ok) {
        console.error('Failed to update invitation status')
        // Don't throw - user is already created
      }

      alert('Welcome to Tacivo! Your account has been created successfully.')
      router.push('/platform')

    } catch (err: any) {
      console.error('Error accepting invitation:', err)
      alert(`Failed to accept invitation: ${err.message}`)
    } finally {
      setIsAccepting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary via-accent to-secondary">
        <div className="inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary via-accent to-secondary">
        <div className="bg-card rounded-xl border border-border p-8 max-w-md w-full mx-4 text-center">
          <XCircleIcon className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-foreground mb-4">Invalid Invitation</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary via-accent to-secondary p-4">
      <div className="bg-card rounded-xl border border-border p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <CheckCircleIcon className="w-16 h-16 text-accent mx-auto mb-4" />
          <h1 className="text-3xl font-semibold text-foreground mb-2">You're Invited!</h1>
          <p className="text-muted-foreground">
            Join {organization?.name || 'the organization'} on Tacivo
          </p>
        </div>

        <div className="bg-secondary rounded-lg p-6 mb-8">
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Name:</span>
              <p className="text-foreground font-medium">{invitation?.full_name}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Email:</span>
              <p className="text-foreground font-medium">{invitation?.email}</p>
            </div>
            {invitation?.role && (
              <div>
                <span className="text-sm text-muted-foreground">Role:</span>
                <p className="text-foreground font-medium">{invitation.role}</p>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              {invitation?.is_admin && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                  Admin
                </span>
              )}
              {invitation?.is_expert && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  Expert
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Create Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
              disabled={isAccepting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Confirm Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
              disabled={isAccepting}
            />
          </div>

          <button
            onClick={handleAcceptInvitation}
            disabled={isAccepting || !password || !confirmPassword}
            className="w-full px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAccepting ? 'Creating Account...' : 'Accept Invitation & Create Account'}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            By accepting this invitation, you agree to Tacivo's Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
