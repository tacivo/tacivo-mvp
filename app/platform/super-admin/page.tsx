'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheckIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { Plus, X, Send, Trash2, Crown } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Profile } from '@/types/database.types'

type AdminInvitation = {
  id: string
  email: string
  full_name: string | null
  token: string
  status: 'pending' | 'accepted' | 'expired'
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [invitations, setInvitations] = useState<AdminInvitation[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [newInvite, setNewInvite] = useState({
    email: '',
    full_name: ''
  })

  useEffect(() => {
    checkSuperAdminAccess()
  }, [])

  async function checkSuperAdminAccess() {
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

      if (!typedProfile?.is_super_admin) {
        router.push('/platform')
        return
      }

      setProfile(typedProfile)
      await loadInvitations()
    } catch (error) {
      console.error('Error checking super admin access:', error)
      router.push('/platform')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadInvitations() {
    try {
      const { data, error } = await supabase
        .from('admin_invitations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setInvitations(data as unknown as AdminInvitation[])
    } catch (error) {
      console.error('Error loading admin invitations:', error)
    }
  }

  async function handleSendInvitation() {
    if (!newInvite.email.trim()) {
      alert('Email is required')
      return
    }

    if (!profile) return

    setIsSending(true)
    try {
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { data: invitationData, error } = await supabase
        .from('admin_invitations')
        .insert({
          invited_by: profile.id,
          email: newInvite.email,
          full_name: newInvite.full_name || null,
          token: token,
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        } as any)
        .select()
        .single() as { data: AdminInvitation | null; error: any }

      if (error || !invitationData) throw error || new Error('Failed to create invitation')

      // Send invitation email
      const emailResponse = await fetch('/api/admin-invitations/send', {
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
        alert(`Invitation created but email failed to send: ${emailResult.error}. You can copy this link to share manually:\n\n${window.location.origin}/admin-invite/${token}`)
      } else {
        alert('Admin invitation sent successfully!')
      }

      setNewInvite({ email: '', full_name: '' })
      setShowInviteForm(false)
      await loadInvitations()

    } catch (error: any) {
      console.error('Error sending admin invitation:', error)
      alert(`Failed to send invitation: ${error.message}`)
    } finally {
      setIsSending(false)
    }
  }

  async function handleDeleteInvitation(invitationId: string) {
    if (!confirm('Are you sure you want to delete this invitation?')) return

    try {
      const { error } = await supabase
        .from('admin_invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      alert('Invitation deleted successfully')
      await loadInvitations()
    } catch (error: any) {
      console.error('Error deleting invitation:', error)
      alert(`Failed to delete invitation: ${error.message}`)
    }
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/admin-invite/${token}`
    navigator.clipboard.writeText(link)
    alert('Invite link copied to clipboard!')
  }

  function getStatusBadge(invitation: AdminInvitation) {
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)

    if (invitation.status === 'accepted') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
          Accepted
        </span>
      )
    }

    if (now > expiresAt || invitation.status === 'expired') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
          Expired
        </span>
      )
    }

    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
        Pending
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-accent" />
              <h1 className="text-xl font-semibold text-foreground">Super Admin</h1>
            </div>
            <button
              onClick={() => router.push('/platform')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Platform
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="bg-card rounded-xl border border-border p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheckIcon className="w-8 h-8 text-accent" />
                <h2 className="text-2xl font-semibold text-foreground">Admin Invitations</h2>
              </div>
              <p className="text-muted-foreground">
                Invite new administrators to join Tacivo and manage their own organizations
              </p>
            </div>
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Admin Invite
            </button>
          </div>

          {/* Invite Form */}
          {showInviteForm && (
            <div className="bg-secondary rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Send Admin Invitation</h3>
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newInvite.email}
                    onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                    placeholder="admin@example.com"
                    className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newInvite.full_name}
                    onChange={(e) => setNewInvite({ ...newInvite, full_name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                  />
                </div>

                <button
                  onClick={handleSendInvitation}
                  disabled={isSending || !newInvite.email.trim()}
                  className="w-full px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {isSending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          )}

          {/* Invitations List */}
          <div className="space-y-4">
            {invitations.length === 0 ? (
              <div className="text-center py-12 bg-secondary rounded-xl">
                <UserPlusIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No admin invitations yet</h3>
                <p className="text-muted-foreground mb-6">Start by inviting your first admin</p>
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Send First Invitation
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Expires</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Sent</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((invitation) => (
                      <tr key={invitation.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                        <td className="py-4 px-4 text-sm text-foreground">{invitation.email}</td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          {invitation.full_name || '-'}
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(invitation)}
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {invitation.status === 'pending' && (
                              <button
                                onClick={() => copyInviteLink(invitation.token)}
                                className="px-3 py-1 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
                              >
                                Copy Link
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteInvitation(invitation.id)}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
