'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Shield, ArrowRight } from 'lucide-react'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase/client'

export default function SettingsHubPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single() as { data: { is_admin: boolean } | null }

      setIsAdmin(profile?.is_admin || false)
      setIsLoading(false)
    }

    checkAdmin()
  }, [router])

  const items = [
    {
      icon: User,
      title: 'Profile',
      description: 'Manage your personal information and preferences',
      href: '/platform/profile',
      show: true,
    },
    {
      icon: Shield,
      title: 'Admin',
      description: 'Organization settings and user management',
      href: '/platform/admin',
      show: isAdmin,
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Cog6ToothIcon className="w-10 h-10 text-accent" />
          <h1 className="text-4xl font-semibold text-foreground">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your account and organization settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.filter(item => item.show).map((item) => (
          <div
            key={item.href}
            onClick={() => router.push(item.href)}
            className="bg-card rounded-xl border border-border p-6 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <item.icon className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
              {item.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {item.description}
            </p>
            <div className="flex items-center text-accent text-sm font-medium">
              View <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
