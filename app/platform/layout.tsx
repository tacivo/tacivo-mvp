'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  HomeIcon,
  ClockIcon,
  LightBulbIcon,
  BookOpenIcon,
  UserGroupIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  PlusIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

interface PlatformLayoutProps {
  children: React.ReactNode
}

// Help modal sections data
const helpSections = [
  {
    icon: HomeIcon,
    title: 'Home',
    description: 'Your personal dashboard showing an overview of your recent activity, including your experiences, playbooks, and quick access to key features.',
  },
  {
    icon: PlusIcon,
    title: 'Start New Session',
    description: 'Begin a new AI-powered interview session to capture your knowledge and expertise. The AI will guide you through a structured conversation to extract valuable insights.',
  },
  {
    icon: ClockIcon,
    title: 'Started Sessions',
    description: 'View and continue your in-progress interview sessions. Pick up where you left off and complete your knowledge capture.',
  },
  {
    icon: LightBulbIcon,
    title: 'Experiences',
    description: 'Access your personal experiences and team-shared knowledge. Experiences are the documented outputs from completed interview sessions.',
  },
  {
    icon: AcademicCapIcon,
    title: 'Expertise',
    description: 'Manage and explore expertise areas within your organization. Track your skills and discover what knowledge exists across your team.',
  },
  {
    icon: BookOpenIcon,
    title: 'Playbooks',
    description: 'AI-synthesized guides that find patterns across multiple experiences to create comprehensive best practices and operational procedures.',
  },
  {
    icon: UserGroupIcon,
    title: 'Experts',
    description: 'Browse and connect with subject matter experts in your organization. Find the right people with the knowledge you need.',
  },
  {
    icon: Cog6ToothIcon,
    title: 'Settings',
    description: 'Manage your profile, account preferences, and organization settings (admin only).',
  },
]

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('Tacivo')
  const [companyLogo, setCompanyLogo] = useState<string>('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{
    experiences: Array<{ id: string; title: string; expertise_area: string }>
    playbooks: Array<{ id: string; title: string; description: string }>
  }>({ experiences: [], playbooks: [] })
  const [isSearching, setIsSearching] = useState(false)

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true')
    }
  }, [])

  // Handle keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close search modal on Escape
      if (e.key === 'Escape' && showSearchModal) {
        setShowSearchModal(false)
        setSearchQuery('')
        setSearchResults({ experiences: [], playbooks: [] })
      }
      // Open search modal with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearchModal(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSearchModal])

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

      // Get user's organization name and logo
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          organization:organizations(name, logo_url)
        `)
        .eq('id', user.id)
        .single() as { data: { organization: { name: string; logo_url: string | null } | null } | null }

      if (profile?.organization?.name) {
        setCompanyName(profile.organization.name)
      }

      if (profile?.organization?.logo_url) {
        setCompanyLogo(profile.organization.logo_url)
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  // Search function
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults({ experiences: [], playbooks: [] })
      return
    }

    setIsSearching(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single() as { data: { organization_id: string } | null }

      if (!profile?.organization_id) return

      // Search experiences (documents with status completed)
      const { data: experiences } = await supabase
        .from('documents')
        .select('id, title, expertise_area')
        .eq('organization_id', profile.organization_id)
        .eq('status', 'completed')
        .eq('is_shared', true)
        .ilike('title', `%${query}%`)
        .limit(5)

      // Search playbooks
      const { data: playbooks } = await supabase
        .from('playbooks')
        .select('id, title, description')
        .eq('organization_id', profile.organization_id)
        .eq('is_shared', true)
        .ilike('title', `%${query}%`)
        .limit(5)

      setSearchResults({
        experiences: experiences || [],
        playbooks: playbooks || []
      })
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const navigationItems = [
    { icon: HomeIcon, label: 'Home', href: '/platform', exact: true },
    { icon: PlusIcon, label: 'Start New Session', href: '/interview', exact: false },
    { icon: ClockIcon, label: 'Started Sessions', href: '/platform/sessions/started', exact: false },
  ]

  const sectionItems = [
    { icon: LightBulbIcon, label: 'Experiences', href: '/platform/experiences-hub' },
    { icon: AcademicCapIcon, label: 'Expertise', href: '/platform/expertise-hub' },
    { icon: BookOpenIcon, label: 'Playbooks', href: '/platform/playbooks-hub' },
    { icon: UserGroupIcon, label: 'Experts', href: '/platform/experts', spaceBefore: true },
    { icon: Cog6ToothIcon, label: 'Settings', href: '/platform/settings' },
  ]

  const isActive = (href: string, exact: boolean = false) => {
    if (exact) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  // Check if any sub-path of a hub is active
  const isHubActive = (hubHref: string) => {
    if (hubHref === '/platform/experiences-hub') {
      return pathname.startsWith('/platform/experiences-hub') ||
             pathname.startsWith('/platform/sessions/completed') ||
             (pathname.startsWith('/platform/experiences') && !pathname.startsWith('/platform/experiences-hub'))
    }
    if (hubHref === '/platform/expertise-hub') {
      return pathname.startsWith('/platform/expertise-hub') ||
             pathname.startsWith('/platform/my-expertise') ||
             pathname.startsWith('/platform/shared-expertise')
    }
    if (hubHref === '/platform/playbooks-hub') {
      return pathname.startsWith('/platform/playbooks-hub') ||
             pathname.startsWith('/platform/my-playbooks') ||
             pathname.startsWith('/platform/shared-playbooks') ||
             pathname === '/platform/playbooks' ||
             pathname.startsWith('/platform/playbooks/')
    }
    if (hubHref === '/platform/settings') {
      return pathname.startsWith('/platform/settings') ||
             pathname.startsWith('/platform/profile') ||
             pathname.startsWith('/platform/admin')
    }
    if (hubHref === '/platform/experts') {
      return pathname.startsWith('/platform/experts')
    }
    return pathname.startsWith(hubHref)
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
        <nav className="flex-1 px-2 py-2">
          {/* Search Button */}
          <button
            onClick={() => setShowSearchModal(true)}
            title={sidebarCollapsed ? 'Search (⌘K)' : undefined}
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 justify-between'} w-full px-3 py-1.5 mb-1 rounded-lg text-sm font-medium transition-colors text-foreground hover:bg-secondary`}
          >
            <div className="flex items-center gap-3">
              <MagnifyingGlassIcon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>Search</span>}
            </div>
            {!sidebarCollapsed && (
              <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-secondary text-muted-foreground">⌘K</kbd>
            )}
          </button>

          {/* Top Navigation Items */}
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href, item.exact)
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          ))}

          {/* Section Links */}
          <div className="pt-3">
            {sectionItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isHubActive(item.href)
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'text-foreground hover:bg-secondary'
                } ${(item as any).spaceBefore ? 'mt-3' : ''}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}

            {/* Help Button */}
            <button
              onClick={() => setShowHelpModal(true)}
              title={sidebarCollapsed ? 'Help' : undefined}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} w-full px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-foreground hover:bg-secondary`}
            >
              <QuestionMarkCircleIcon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>Help</span>}
            </button>
          </div>
        </nav>

        {/* Sidebar Toggle Button */}
        <div className="p-3 border-t border-border">
          <button
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} w-full px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors`}
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

        {/* Version Footer */}
        {!sidebarCollapsed && (
          <div className="px-4 py-2 text-[10px] text-muted-foreground/60">
            <p>Version 1.0.1</p>
            <p>© 2026 Tacivo. All rights reserved.</p>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowSearchModal(false)
              setSearchQuery('')
              setSearchResults({ experiences: [], playbooks: [] })
            }}
          />

          {/* Modal */}
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden mx-4">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <MagnifyingGlassIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="Search experiences and playbooks..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults({ experiences: [], playbooks: [] })
                  }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchQuery ? (
                <>
                  {searchResults.experiences.length === 0 && searchResults.playbooks.length === 0 ? (
                    <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No results found for "{searchQuery}"
                    </div>
                  ) : (
                    <div className="py-2">
                      {/* Experiences */}
                      {searchResults.experiences.length > 0 && (
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Experiences
                          </div>
                          {searchResults.experiences.map((exp) => (
                            <button
                              key={exp.id}
                              onClick={() => {
                                router.push(`/platform/experiences/${exp.id}`)
                                setShowSearchModal(false)
                                setSearchQuery('')
                                setSearchResults({ experiences: [], playbooks: [] })
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                            >
                              <LightBulbIcon className="w-5 h-5 text-accent flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{exp.title}</p>
                                {exp.expertise_area && (
                                  <p className="text-xs text-muted-foreground truncate">{exp.expertise_area}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Playbooks */}
                      {searchResults.playbooks.length > 0 && (
                        <div className={searchResults.experiences.length > 0 ? 'mt-2' : ''}>
                          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Playbooks
                          </div>
                          {searchResults.playbooks.map((pb) => (
                            <button
                              key={pb.id}
                              onClick={() => {
                                router.push(`/platform/shared-playbooks/${pb.id}`)
                                setShowSearchModal(false)
                                setSearchQuery('')
                                setSearchResults({ experiences: [], playbooks: [] })
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                            >
                              <BookOpenIcon className="w-5 h-5 text-accent flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{pb.title}</p>
                                {pb.description && (
                                  <p className="text-xs text-muted-foreground truncate">{pb.description}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Start typing to search...
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground">Esc</kbd> to close
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowHelpModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <QuestionMarkCircleIcon className="w-6 h-6 text-accent" />
                <h2 className="text-xl font-semibold text-foreground">Help Center</h2>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              <p className="text-muted-foreground mb-6">
                Learn about each section of the platform and how to make the most of Tacivo.
              </p>

              <div className="space-y-4">
                {helpSections.map((section) => (
                  <div
                    key={section.title}
                    className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <section.icon className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{section.title}</h3>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Need more help? Contact your organization administrator or reach out to{' '}
                  <a href="mailto:hello@tacivo.com" className="text-accent hover:underline">
                    hello@tacivo.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
