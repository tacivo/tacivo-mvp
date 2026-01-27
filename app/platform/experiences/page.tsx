'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileText, Calendar, User, Share2, Eye, Search, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getSharedCompanyDocuments } from '@/lib/supabase/interviews'
import { Profile } from '@/types/database.types'

type SharedDocument = {
  id: string
  title: string
  document_type: 'case-study' | 'best-practices'
  created_at: string
  user_id: string
  function_area: string | null
  profiles?: {
    full_name: string | null
    role: string | null
  }
  interviews?: {
    function_area: string | null
  }
}

export default function ExperiencesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sharedDocs, setSharedDocs] = useState<SharedDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
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

      setProfile(profileData as unknown as Profile)

      const sharedDocsData = await getSharedCompanyDocuments()
      setSharedDocs(sharedDocsData as SharedDocument[])
    } catch (error) {
      console.error('Error loading data:', error)
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

  const filteredDocs = sharedDocs.filter(doc => {
    const searchLower = searchQuery.toLowerCase()
    // Use function_area directly from document, fallback to interviews join for backwards compatibility
    const functionArea = doc.function_area || (doc as any).interviews?.function_area
    return (
      doc.title.toLowerCase().includes(searchLower) ||
      doc.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      doc.profiles?.role?.toLowerCase().includes(searchLower) ||
      functionArea?.toLowerCase().includes(searchLower)
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
    <div className="max-w-6xl mx-auto px-8 py-12">
      {/* Back Button */}
      <button
        onClick={() => router.push('/platform/experiences-hub')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-foreground mb-2">Shared Experiences</h1>
        <p className="text-muted-foreground">
          Collective knowledge and insights shared by your team
        </p>
      </div>

      {/* Search Bar */}
      {sharedDocs.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search experiences by title, author, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Share2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {searchQuery ? 'No experiences found' : 'No shared experiences yet'}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Team members can share their completed case studies and best practices here to build your organization\'s knowledge base.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => router.push(`/platform/experiences/${doc.id}`)}
              className="bg-card rounded-lg border border-border p-6 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer group"
            >
              {/* Document Icon and Function Area */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                {(doc.function_area || (doc as any).interviews?.function_area) && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-muted text-muted-foreground capitalize">
                    {doc.function_area || (doc as any).interviews?.function_area}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-accent transition-colors">
                {doc.title}
              </h3>

              {/* Metadata */}
              <div className="space-y-2 text-sm text-muted-foreground">
                {doc.profiles?.full_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {doc.profiles.full_name}
                      {doc.profiles.role && ` • ${doc.profiles.role}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{formatDate(doc.created_at)}</span>
                </div>
              </div>

              {/* View Button */}
              <div className="mt-4 pt-4 border-t border-border">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/platform/experiences/${doc.id}`)
                  }}
                  className="w-full px-4 py-2 bg-accent/10 text-accent rounded-lg font-medium hover:bg-accent/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Experience
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      {sharedDocs.length > 0 && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Showing {filteredDocs.length} of {sharedDocs.length} shared experience{sharedDocs.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
