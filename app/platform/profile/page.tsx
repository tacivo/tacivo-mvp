'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserIcon, BriefcaseIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { LogOut, User, Building2, Mail, Save, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Profile } from '@/types/database.types'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    full_name: '',
    email: '',
    role: '',
    years_of_experience: 0
  })

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select(`
          *,
          organization:organizations(name)
        `)
        .eq('id', user.id)
        .single()

      if (profileData) {
        const typedProfile = profileData as unknown as Profile
        setProfile(typedProfile)
        setEditedProfile({
          full_name: typedProfile.full_name || '',
          email: typedProfile.email || '',
          role: typedProfile.role || '',
          years_of_experience: typedProfile.years_of_experience || 0
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        // @ts-expect-error - Supabase type inference issue with update
        .update({
          full_name: editedProfile.full_name,
          email: editedProfile.email,
          role: editedProfile.role,
          years_of_experience: editedProfile.years_of_experience
        })
        .eq('id', profile.id)

      if (error) throw error

      // Reload profile
      await loadProfile()
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedProfile({
      full_name: profile?.full_name || '',
      email: profile?.email || '',
      role: profile?.role || '',
      years_of_experience: profile?.years_of_experience || 0
    })
    setIsEditing(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const formatMemberSince = (dateString: string | null) => {
    if (!dateString) return 'Not available'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <UserIcon className="w-10 h-10 text-accent" />
            <h1 className="text-4xl font-semibold text-foreground">Profile</h1>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
        <p className="text-lg text-muted-foreground">
          Manage your personal information and account
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Information */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Personal Information</h2>

          <div className="space-y-4">
            {/* Full Name */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.full_name}
                    onChange={(e) => setEditedProfile({ ...editedProfile, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                  />
                ) : (
                  <p className="font-medium text-foreground">{profile?.full_name || 'Not set'}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedProfile.email}
                    onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                  />
                ) : (
                  <p className="font-medium text-foreground">{profile?.email || 'Not set'}</p>
                )}
              </div>
            </div>

            {/* Role */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center flex-shrink-0">
                <BriefcaseIcon className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Role</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.role}
                    onChange={(e) => setEditedProfile({ ...editedProfile, role: e.target.value })}
                    placeholder="e.g., Product Manager, Engineer..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground placeholder:text-muted-foreground"
                  />
                ) : (
                  <p className="font-medium text-foreground">{profile?.role || 'Not set'}</p>
                )}
              </div>
            </div>

            {/* Years of Experience */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                <CalendarIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Years of Experience</p>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={editedProfile.years_of_experience}
                    onChange={(e) => setEditedProfile({ ...editedProfile, years_of_experience: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                  />
                ) : (
                  <p className="font-medium text-foreground">
                    {profile?.years_of_experience ? `${profile.years_of_experience} years` : 'Not set'}
                  </p>
                )}
              </div>
            </div>

            {/* Organization (Read-only) */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-muted to-muted/70 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Organization</p>
                <p className="font-medium text-foreground">{(profile as any)?.organization?.name || 'Not set'}</p>
              </div>
            </div>

            {/* Member Since (Read-only) */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center flex-shrink-0">
                <CalendarIcon className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                <p className="font-medium text-foreground">{formatMemberSince(profile?.created_at || null)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Account</h2>

          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-destructive/40 hover:bg-destructive/10 transition-colors text-left group"
            >
              <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-foreground group-hover:text-destructive">Sign Out</p>
                <p className="text-sm text-muted-foreground group-hover:text-destructive/70">Sign out of your account</p>
              </div>
            </button>
          </div>
        </div>

        {/* App Information */}
        <div className="bg-secondary rounded-xl border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">About Tacivo</h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Version 1.0.0</p>
            <p>© 2026 Tacivo. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
