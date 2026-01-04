'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  HomeIcon,
  RocketLaunchIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  LightBulbIcon,
  BookOpenIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserIcon,
  ShieldCheckIcon,
  PlusIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'

interface PlatformLayoutProps {
  children: React.ReactNode
}

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('Tacivo')
  const [companyLogo, setCompanyLogo] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [privateExpanded, setPrivateExpanded] = useState(true)
  const [collectiveExpanded, setCollectiveExpanded] = useState(true)
  const [settingsExpanded, setSettingsExpanded] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Get user's organization name, logo, and admin status
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          is_admin,
          organization:organizations(name, logo_url)
        `)
        .eq('id', user.id)
        .single() as { data: { is_admin: boolean | null; organization: { name: string; logo_url: string | null } | null } | null }

      if (profile?.organization?.name) {
        setCompanyName(profile.organization.name)
      }

      if (profile?.organization?.logo_url) {
        setCompanyLogo(profile.organization.logo_url)
      }

      if (profile?.is_admin) {
        setIsAdmin(true)
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  const navigationItems = [
    { icon: HomeIcon, label: 'Home', href: '/platform' },
    { icon: RocketLaunchIcon, label: 'Get Started', href: '/platform/get-started' },
    { icon: SparklesIcon, label: 'Tacivo AI', href: '/platform/ai' },
  ]

  const privateItems = [
    { icon: ClockIcon, label: 'Started Sessions', href: '/platform/sessions/started' },
    { icon: CheckCircleIcon, label: 'Completed Sessions', href: '/platform/sessions/completed' },
    { icon: PlusIcon, label: 'Start New', href: '/interview' },
  ]

  const collectiveItems = [
    { icon: LightBulbIcon, label: 'Experiences', href: '/platform/experiences' },
    { icon: BookOpenIcon, label: 'Playbooks', href: '/platform/playbooks' },
    { icon: PencilSquareIcon, label: 'Update Playbooks', href: '/platform/playbooks/update' },
    { icon: UserGroupIcon, label: 'Experts', href: '/platform/experts' },
  ]

  const isActive = (href: string) => {
    if (href === '/platform') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col overflow-y-auto">
        {/* Company Name & Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={`${companyName} logo`}
                className="w-8 h-8 object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center flex-shrink-0">
                <span className="text-accent font-bold text-sm">
                  {companyName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-lg font-semibold text-foreground truncate">{companyName}</h1>
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}

          {/* Private Section */}
          <div className="pt-4">
            <button
              onClick={() => setPrivateExpanded(!privateExpanded)}
              className="flex items-center gap-2 px-3 py-1.5 w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {privateExpanded ? (
                <ChevronDownIcon className="w-3 h-3" />
              ) : (
                <ChevronRightIcon className="w-3 h-3" />
              )}
              Private Database
            </button>
            {privateExpanded && (
              <div className="mt-1 space-y-1">
                {privateItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Collective Section */}
          <div className="pt-4">
            <button
              onClick={() => setCollectiveExpanded(!collectiveExpanded)}
              className="flex items-center gap-2 px-3 py-1.5 w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {collectiveExpanded ? (
                <ChevronDownIcon className="w-3 h-3" />
              ) : (
                <ChevronRightIcon className="w-3 h-3" />
              )}
              Public Database
            </button>
            {collectiveExpanded && (
              <div className="mt-1 space-y-1">
                {collectiveItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="pt-4">
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className="flex items-center gap-2 px-3 py-1.5 w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {settingsExpanded ? (
                <ChevronDownIcon className="w-3 h-3" />
              ) : (
                <ChevronRightIcon className="w-3 h-3" />
              )}
              Settings
            </button>
            {settingsExpanded && (
              <div className="mt-1 space-y-1">
                <Link
                  href="/platform/profile"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/platform/profile')
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <UserIcon className="w-5 h-5" />
                  <span>Profile</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/platform/admin"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/platform/admin')
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <ShieldCheckIcon className="w-5 h-5" />
                    <span>Admin</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  )
}
