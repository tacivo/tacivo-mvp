'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { LogOut, User, Building2, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Profile } from '@/types/database.types'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleViewProfile = () => {
    router.push('/profile')
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
        <div className="flex items-center gap-3 mb-4">
          <Cog6ToothIcon className="w-10 h-10 text-accent" />
          <h1 className="text-4xl font-semibold text-foreground">Settings</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Profile Information</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium text-foreground">{profile?.full_name || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{profile?.email || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-muted to-muted/70 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium text-foreground">{profile?.company || 'Not set'}</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleViewProfile}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              Edit Profile
            </button>
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
