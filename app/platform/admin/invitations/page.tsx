'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlusIcon } from '@heroicons/react/24/outline'
import { Plus, X, Send, Trash2, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Invitation, Profile } from '@/types/database.types'

export default function InvitationsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [newInvite, setNewInvite] = useState({
    email: '',
    full_name: '',
    role: '',
    years_of_experience: 0,
    area_of_expertise: '',
    goal: '',
    is_admin: false,
    is_expert: false
  })

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  async function checkAdminAndLoad() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const typedProfile = profileData as unknown as Profile

      if (!typedProfile?.is_admin) {
        router.push('/platform')
        return
      }

      setProfile(typedProfile)
      await loadInvitations(typedProfile.organization_id)
    } catch (error) {
      console.error('Error loading:', error)
      router.push('/platform')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadInvitations(orgId: string | null) {
    if (!orgId) return

    try {
      const { data } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (data) {
        setInvitations(data as unknown as Invitation[])
      }
    } catch (error) {
      console.error('Error loading invitations:', error)
    }
  }

  const handleSendInvitation = async () => {
    if (!profile?.organization_id || !newInvite.email.trim() || !newInvite.full_name.trim()) {
      alert('Email and Full Name are required')
      return
    }

    setIsSending(true)
    try {
      // Generate token
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

      const { data: invitationData, error } = await supabase
        .from('invitations')
        // @ts-expect-error - Supabase type inference issue
        .insert({
          organization_id: profile.organization_id,
          invited_by: profile.id,
          email: newInvite.email,
          full_name: newInvite.full_name,
          role: newInvite.role || null,
          years_of_experience: newInvite.years_of_experience || null,
          area_of_expertise: newInvite.area_of_expertise || null,
          goal: newInvite.goal || null,
          is_admin: newInvite.is_admin,
          is_expert: newInvite.is_expert,
          token: token,
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      // Send invitation email
      const emailResponse = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitationData.id
        })
      })

      const emailResult = await emailResponse.json()

      if (!emailResponse.ok) {
        console.error('Email sending failed:', emailResult)
        alert(`Invitation created but email failed to send: ${emailResult.error}. You can copy this link to share manually:\n\n${window.location.origin}/invite/${token}`)
      } else {
        alert('Invitation sent successfully! The invitee will receive an email shortly.')
      }

      // Reset form
      setNewInvite({
        email: '',
        full_name: '',
        role: '',
        years_of_experience: 0,
        area_of_expertise: '',
        goal: '',
        is_admin: false,
        is_expert: false
      })
      setShowInviteForm(false)

      // Reload invitations
      await loadInvitations(profile.organization_id)

    } catch (error: any) {
      console.error('Error sending invitation:', error)
      alert(`Failed to send invitation: ${error.message}`)
    } finally {
      setIsSending(false)
    }
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to delete this invitation?')) return

    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      await loadInvitations(profile?.organization_id || null)
    } catch (error) {
      console.error('Error deleting invitation:', error)
      alert('Failed to delete invitation')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      expired: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return styles[status as keyof typeof styles] || styles.pending
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <UserPlusIcon className="w-10 h-10 text-accent" />
            <h1 className="text-4xl font-semibold text-foreground">Team Invitations</h1>
          </div>
          <button
            onClick={() => setShowInviteForm(true)}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Invite Member
          </button>
        </div>
        <p className="text-lg text-muted-foreground">
          Invite team members and experts to join your organization
        </p>
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Invite Team Member</h2>
              <button
                onClick={() => setShowInviteForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Required Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newInvite.email}
                    onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={newInvite.full_name}
                    onChange={(e) => setNewInvite({ ...newInvite, full_name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                  />
                </div>
              </div>

              {/* Role Toggles */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newInvite.is_admin}
                    onChange={(e) => setNewInvite({ ...newInvite, is_admin: e.target.checked })}
                    className="w-5 h-5 rounded border-input text-accent focus:ring-accent"
                  />
                  <span className="text-sm font-medium text-foreground">Admin</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newInvite.is_expert}
                    onChange={(e) => setNewInvite({ ...newInvite, is_expert: e.target.checked })}
                    className="w-5 h-5 rounded border-input text-accent focus:ring-accent"
                  />
                  <span className="text-sm font-medium text-foreground">Expert</span>
                </label>
              </div>

              {/* Optional Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    value={newInvite.role}
                    onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
                    placeholder="Product Manager, Engineer..."
                    className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={newInvite.years_of_experience}
                    onChange={(e) => setNewInvite({ ...newInvite, years_of_experience: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Area of Expertise
                </label>
                <input
                  type="text"
                  value={newInvite.area_of_expertise}
                  onChange={(e) => setNewInvite({ ...newInvite, area_of_expertise: e.target.value })}
                  placeholder="Sales, Marketing, Engineering..."
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Goal
                </label>
                <textarea
                  value={newInvite.goal}
                  onChange={(e) => setNewInvite({ ...newInvite, goal: e.target.value })}
                  placeholder="What do you want them to achieve..."
                  rows={3}
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowInviteForm(false)}
                  disabled={isSending}
                  className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvitation}
                  disabled={isSending || !newInvite.email.trim() || !newInvite.full_name.trim()}
                  className="flex-1 px-4 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {isSending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invitations List */}
      <div className="space-y-4">
        {invitations.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No invitations yet</h3>
            <p className="text-muted-foreground mb-6">Start by inviting team members to join your organization</p>
            <button
              onClick={() => setShowInviteForm(true)}
              className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Send First Invitation
            </button>
          </div>
        ) : (
          invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="bg-card rounded-xl border border-border p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{invitation.full_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(invitation.status)}`}>
                      {invitation.status}
                    </span>
                    {invitation.is_admin && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                        Admin
                      </span>
                    )}
                    {invitation.is_expert && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        Expert
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-4">{invitation.email}</p>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    {invitation.role && (
                      <div>
                        <span className="text-muted-foreground">Role:</span>
                        <span className="ml-2 text-foreground">{invitation.role}</span>
                      </div>
                    )}
                    {invitation.years_of_experience !== null && (
                      <div>
                        <span className="text-muted-foreground">Experience:</span>
                        <span className="ml-2 text-foreground">{invitation.years_of_experience} years</span>
                      </div>
                    )}
                    {invitation.area_of_expertise && (
                      <div>
                        <span className="text-muted-foreground">Expertise:</span>
                        <span className="ml-2 text-foreground">{invitation.area_of_expertise}</span>
                      </div>
                    )}
                  </div>

                  {invitation.goal && (
                    <div className="mt-4 p-4 bg-secondary rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Goal:</p>
                      <p className="text-sm text-foreground">{invitation.goal}</p>
                    </div>
                  )}

                  <div className="mt-4 text-xs text-muted-foreground">
                    Sent {new Date(invitation.created_at).toLocaleDateString()} •
                    Expires {new Date(invitation.expires_at).toLocaleDateString()}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteInvitation(invitation.id)}
                  className="ml-4 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
