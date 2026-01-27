'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Calendar, FileText, Globe, Lock, Trash2, Share2, ArrowLeft } from 'lucide-react'
import { BookOpenIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase/client'
import { Playbook } from '@/types/database.types'

type PlaybookWithProfile = Playbook & {
  profiles?: {
    full_name: string | null
    role: string | null
  }
}

export default function MyPlaybooksPage() {
  const router = useRouter()
  const [playbooks, setPlaybooks] = useState<PlaybookWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    loadPlaybooks()
  }, [])

  async function loadPlaybooks() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Store current user ID for permission checks
      setCurrentUserId(user.id)

      // Fetch only the current user's playbooks (both private and shared)
      const { data, error } = await (supabase as any)
        .from('playbooks')
        .select(`
          *,
          profiles:user_id (
            full_name,
            role
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading playbooks:', error)
        throw error
      }

      setPlaybooks(data || [])
    } catch (error) {
      console.error('Error loading playbooks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sales-playbook': return 'Sales Playbook'
      case 'customer-success-guide': return 'Customer Success Guide'
      case 'operational-procedures': return 'Operational Procedures'
      case 'strategic-planning-document': return 'Strategic Planning Document'
      default: return type
    }
  }

  const handleToggleShare = async (playbook: PlaybookWithProfile) => {
    try {
      const { error } = await (supabase as any)
        .from('playbooks')
        .update({ is_shared: !playbook.is_shared })
        .eq('id', playbook.id)

      if (error) throw error

      // Reload playbooks
      await loadPlaybooks()
    } catch (error) {
      console.error('Error toggling share:', error)
      alert('Failed to update sharing settings')
    }
  }

  const handleDelete = async (playbook: PlaybookWithProfile, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm(`Are you sure you want to delete "${playbook.title}"?`)) return

    try {
      const { error } = await (supabase as any)
        .from('playbooks')
        .delete()
        .eq('id', playbook.id)

      if (error) throw error

      // Reload playbooks
      await loadPlaybooks()
    } catch (error) {
      console.error('Error deleting playbook:', error)
      alert('Failed to delete playbook')
    }
  }

  const filteredPlaybooks = playbooks.filter(playbook => {
    const searchLower = searchQuery.toLowerCase()
    return (
      playbook.title.toLowerCase().includes(searchLower) ||
      playbook.type.toLowerCase().includes(searchLower)
    )
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      {/* Back Button */}
      <button
        onClick={() => router.push('/platform/playbooks-hub')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpenIcon className="w-10 h-10 text-accent" />
          <h1 className="text-4xl font-semibold text-foreground">My Playbooks</h1>
        </div>
        <p className="text-muted-foreground">
          All playbooks you've created, including both private and shared ones
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search your playbooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>
      </div>

      {/* Playbooks Grid */}
      {filteredPlaybooks.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <BookOpenIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {searchQuery ? 'No playbooks found' : 'No playbooks yet'}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Create your first playbook by selecting documents and generating a comprehensive guide.'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => router.push('/platform/playbooks')}
              className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              Create Playbook
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPlaybooks.map((playbook, index) => (
            <motion.div
              key={playbook.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-card rounded-xl border border-border p-6 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => router.push(`/platform/shared-playbooks/${playbook.id}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <BookOpenIcon className="w-6 h-6 text-accent" />
                </div>
                <div className="flex items-center gap-2">
                  {playbook.is_shared ? (
                    <div title="Shared with organization">
                      <Globe className="w-4 h-4 text-green-600" />
                    </div>
                  ) : (
                    <div title="Private">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-accent transition-colors">
                {playbook.title}
              </h3>

              {/* Type Badge */}
              <div className="mb-3">
                <span className="px-2 py-1 text-xs font-medium rounded bg-muted text-muted-foreground">
                  {getTypeLabel(playbook.type)}
                </span>
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{formatDate(playbook.created_at)}</span>
                </div>
                {playbook.updated_at && playbook.updated_at !== playbook.created_at && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Updated {formatDate(playbook.updated_at)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span>{playbook.document_ids?.length || 0} source documents</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-border flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleShare(playbook)
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg hover:border-accent/50 transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  {playbook.is_shared ? 'Unshare' : 'Share'}
                </button>
                <button
                  onClick={(e) => handleDelete(playbook, e)}
                  className="px-3 py-2 text-sm border border-border rounded-lg hover:border-red-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      {playbooks.length > 0 && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Showing {filteredPlaybooks.length} of {playbooks.length} playbook{playbooks.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
