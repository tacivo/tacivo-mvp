'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircleIcon, XCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

type AdminInvitation = {
  id: string
  email: string
  full_name: string | null
  token: string
  status: 'pending' | 'accepted' | 'expired'
  expires_at: string
}

export default function AdminInviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [invitation, setInvitation] = useState<AdminInvitation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Form data
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profile, setProfile] = useState({
    full_name: '',
    role: '',
    years_of_experience: 0,
    area_of_expertise: '',
    goal: ''
  })
  const [organization, setOrganization] = useState({
    name: '',
    website: '',
    industry: '',
    size: '',
    description: ''
  })

  useEffect(() => {
    loadInvitation()
  }, [token])

  async function loadInvitation() {
    try {
      // Create a service role client to bypass RLS for reading invitation
      const { data: inviteData, error: inviteError } = await supabase
        .from('admin_invitations')
        .select('*')
        .eq('token', token)
        .single()

      if (inviteError || !inviteData) {
        setError('Invitation not found')
        setIsLoading(false)
        return
      }

      const typedInvite = inviteData as unknown as AdminInvitation

      // Check if expired
      if (new Date(typedInvite.expires_at) < new Date()) {
        setError('This invitation has expired')
        setIsLoading(false)
        return
      }

      // Check if already accepted
      if (typedInvite.status === 'accepted') {
        setError('This invitation has already been used')
        setIsLoading(false)
        return
      }

      setInvitation(typedInvite)

      // Pre-fill name if provided
      if (typedInvite.full_name) {
        setProfile(prev => ({ ...prev, full_name: typedInvite.full_name! }))
      }

    } catch (err) {
      console.error('Error loading invitation:', err)
      setError('Failed to load invitation')
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 8) {
      alert('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    if (!invitation) return

    setIsSaving(true)
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password
      })

      if (signUpError) {
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

      setUserId(authData.user.id)
      setStep(2)
    } catch (error: any) {
      console.error('Signup error:', error)
      alert(`Failed to create account: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!profile.full_name.trim()) {
      alert('Full name is required')
      return
    }

    setStep(3)
  }

  async function handleOrganizationSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!organization.name.trim()) {
      alert('Organization name is required')
      return
    }

    if (!userId || !invitation) {
      alert('User not authenticated')
      return
    }

    setIsSaving(true)
    try {
      // Use API endpoint with service role to create organization and complete signup
      const response = await fetch('/api/admin-invitations/complete-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          invitationId: invitation.id,
          profile: {
            full_name: profile.full_name,
            role: profile.role || null,
            years_of_experience: profile.years_of_experience || null,
            area_of_expertise: profile.area_of_expertise || null,
            goal: profile.goal || null
          },
          organization: {
            name: organization.name,
            website: organization.website || null,
            industry: organization.industry || null,
            size: organization.size || null,
            description: organization.description || null
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete signup')
      }

      alert('Welcome to Tacivo! Your admin account has been set up successfully.')
      router.push('/platform/admin')
    } catch (error: any) {
      console.error('Error completing signup:', error)
      alert(`Failed to complete signup: ${error.message}`)
    } finally {
      setIsSaving(false)
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border p-8 max-w-2xl w-full"
      >
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {step} of 3
            </span>
            <span className="text-sm font-medium text-accent">
              {Math.round((step / 3) * 100)}%
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Password */}
        {step === 1 && (
          <form onSubmit={handlePasswordSubmit}>
            <div className="text-center mb-8">
              <ShieldCheckIcon className="w-16 h-16 text-accent mx-auto mb-4" />
              <h1 className="text-3xl font-semibold text-foreground mb-2">Create Admin Account</h1>
              <p className="text-muted-foreground">
                Welcome to Tacivo! You've been invited to become an administrator.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={invitation?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-secondary border border-input rounded-lg text-foreground"
                />
              </div>

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
                  required
                  minLength={8}
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
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Creating Account...' : 'Continue'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Profile Information */}
        {step === 2 && (
          <form onSubmit={handleProfileSubmit}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-2">Profile Information</h2>
              <p className="text-muted-foreground">
                Tell us about yourself
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Role
                </label>
                <input
                  type="text"
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  placeholder="e.g., CEO, CTO, Founder"
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={profile.years_of_experience || ''}
                  onChange={(e) => setProfile({ ...profile, years_of_experience: parseInt(e.target.value) || 0 })}
                  min="0"
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Area of Expertise
                </label>
                <input
                  type="text"
                  value={profile.area_of_expertise}
                  onChange={(e) => setProfile({ ...profile, area_of_expertise: e.target.value })}
                  placeholder="e.g., Enterprise Sales, Cloud Architecture"
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Goal
                </label>
                <textarea
                  value={profile.goal}
                  onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                  placeholder="What do you hope to achieve with Tacivo?"
                  rows={3}
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Organization Information */}
        {step === 3 && (
          <form onSubmit={handleOrganizationSubmit}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-2">Organization Information</h2>
              <p className="text-muted-foreground">
                Set up your organization
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={organization.name}
                  onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                  placeholder="Acme Inc."
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={organization.website}
                  onChange={(e) => setOrganization({ ...organization, website: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  value={organization.industry}
                  onChange={(e) => setOrganization({ ...organization, industry: e.target.value })}
                  placeholder="Technology, Healthcare, Finance..."
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Size
                </label>
                <select
                  value={organization.size}
                  onChange={(e) => setOrganization({ ...organization, size: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={organization.description}
                  onChange={(e) => setOrganization({ ...organization, description: e.target.value })}
                  placeholder="Tell us about your organization..."
                  rows={4}
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Setting Up...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}
