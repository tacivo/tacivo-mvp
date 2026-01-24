'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  HomeIcon,
  RocketLaunchIcon,
  ClockIcon,
  CheckCircleIcon,
  LightBulbIcon,
  BookOpenIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  UserIcon,
  ShieldCheckIcon,
  PlusIcon,
  PencilSquareIcon,
  Squares2X2Icon
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
  const [privateExpanded, setPrivateExpanded] = useState(true)
  const [collectiveExpanded, setCollectiveExpanded] = useState(true)
  const [settingsExpanded, setSettingsExpanded] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true')
    }
  }, [])

  // Save sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', String(newState))
  }

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
  ]

  const privateItems = [
    { icon: ClockIcon, label: 'Started Sessions', href: '/platform/sessions/started' },
    { icon: CheckCircleIcon, label: 'Completed Sessions', href: '/platform/sessions/completed' },
    { icon: PlusIcon, label: 'Start New', href: '/interview' },
    { icon: BookOpenIcon, label: 'Create Playbook', href: '/platform/playbooks' },
    { icon: PencilSquareIcon, label: 'Update Playbook', href: '/platform/playbooks/update' },
  ]

  const collectiveItems = [
    { icon: LightBulbIcon, label: 'Experiences', href: '/platform/experiences' },
    { icon: Squares2X2Icon, label: 'Playbooks', href: '/platform/shared-playbooks' },
    { icon: UserGroupIcon, label: 'Experts', href: '/platform/experts' },
  ]

  const isActive = (href: string) => {
    if (href === '/platform') {
      return pathname === href
    }
    // Exact match for paths that have sub-paths
    if (href === '/platform/playbooks') {
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
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-card border-r border-border flex flex-col overflow-y-auto transition-all duration-300 ease-in-out`}>
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
            {!sidebarCollapsed && (
              <h1 className="text-lg font-semibold text-foreground truncate">{companyName}</h1>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          ))}

          {/* Private Section */}
          <div className="pt-4">
            {!sidebarCollapsed && (
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
            )}
            {(sidebarCollapsed || privateExpanded) && (
              <div className={`${sidebarCollapsed ? '' : 'mt-1'} space-y-1`}>
                {privateItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Collective Section */}
          <div className="pt-4">
            {!sidebarCollapsed && (
              <button
                onClick={() => setCollectiveExpanded(!collectiveExpanded)}
                className="flex items-center gap-2 px-3 py-1.5 w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                {collectiveExpanded ? (
                  <ChevronDownIcon className="w-3 h-3" />
                ) : (
                  <ChevronRightIcon className="w-3 h-3" />
                )}
                Shared
              </button>
            )}
            {(sidebarCollapsed || collectiveExpanded) && (
              <div className={`${sidebarCollapsed ? '' : 'mt-1'} space-y-1`}>
                {collectiveItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="pt-4">
            {!sidebarCollapsed && (
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
            )}
            {(sidebarCollapsed || settingsExpanded) && (
              <div className={`${sidebarCollapsed ? '' : 'mt-1'} space-y-1`}>
                <Link
                  href="/platform/profile"
                  title={sidebarCollapsed ? 'Profile' : undefined}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/platform/profile')
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <UserIcon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Profile</span>}
                </Link>
                {isAdmin && (
                  <Link
                    href="/platform/admin"
                    title={sidebarCollapsed ? 'Admin' : undefined}
                    className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/platform/admin')
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <ShieldCheckIcon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>Admin</span>}
                  </Link>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Sidebar Toggle Button */}
        <div className="p-3 border-t border-border">
          <button
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors`}
          >
            {sidebarCollapsed ? (
              <ChevronDoubleRightIcon className="w-5 h-5" />
            ) : (
              <>
                <ChevronDoubleLeftIcon className="w-5 h-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  )
}
