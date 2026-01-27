'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileText, Calendar, User, Search, Globe, Lock, Trash2, Eye, ArrowLeft } from 'lucide-react'
import { LightBulbIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase/client'
import { deleteDocumentWithRelated } from '@/lib/supabase/interviews'
import { Profile } from '@/types/database.types'

type UserDocument = {
  id: string
  title: string
  document_type: 'case-study' | 'best-practices'
  created_at: string
  user_id: string
  function_area: string | null
  is_shared: boolean
  interviews?: {
    function_area: string | null
  }
}

export default function MyExperiencesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [documents, setDocuments] = useState<UserDocument[]>([])
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

      // Fetch all documents for the current user (both shared and private)
      const { data: docsData, error } = await supabase
        .from('documents')
        .select(`
          *,
          interviews:interview_id (
            function_area
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading documents:', error)
        throw error
      }

      setDocuments(docsData as UserDocument[] || [])
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

  const handleDeleteDocument = async (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this experience? This will permanently delete the document, interview, and all messages.')) {
      return
    }

    try {
      await deleteDocumentWithRelated(documentId)
      await loadData()
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Failed to delete experience. Please try again.')
    }
  }

  const filteredDocs = documents.filter(doc => {
    const searchLower = searchQuery.toLowerCase()
    const functionArea = doc.function_area || doc.interviews?.function_area
    return (
      doc.title.toLowerCase().includes(searchLower) ||
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
    <div className="max-w-4xl mx-auto px-8 py-12">
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
        <div className="flex items-center gap-3 mb-2">
          <LightBulbIcon className="w-10 h-10 text-accent" />
          <h1 className="text-4xl font-semibold text-foreground">My Experiences</h1>
        </div>
        <p className="text-muted-foreground">
          Your captured knowledge, including both private and shared experiences
        </p>
      </div>

      {/* Search Bar */}
      {documents.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search your experiences by title or function area..."
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
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {searchQuery ? 'No experiences found' : 'No experiences yet'}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Complete an interview session to capture your first experience.'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => router.push('/interview')}
              className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              Start New Session
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDocs.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => router.push(`/platform/sessions/completed/${doc.id}`)}
              className="bg-card rounded-xl border border-border p-6 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer group"
            >
              {/* Document Icon and Badges */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                <div className="flex items-center gap-2">
                  {doc.is_shared ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Shared
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Private
                    </span>
                  )}
                </div>
              </div>

              {/* Function Area Badge */}
              {(doc.function_area || doc.interviews?.function_area) && (
                <div className="mb-3">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-muted text-muted-foreground capitalize">
                    {doc.function_area || doc.interviews?.function_area}
                  </span>
                </div>
              )}

              {/* Title */}
              <h3 className="text-lg font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-accent transition-colors">
                {doc.title}
              </h3>

              {/* Metadata */}
              <div className="space-y-2 text-sm text-muted-foreground">
                {profile?.full_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {profile.full_name}
                      {profile.role && ` • ${profile.role}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{formatDate(doc.created_at)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-4 border-t border-border flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/platform/sessions/completed/${doc.id}`)
                  }}
                  className="flex-1 px-4 py-2 bg-accent/10 text-accent rounded-lg font-medium hover:bg-accent/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={(e) => handleDeleteDocument(doc.id, e)}
                  className="px-3 py-2 border border-border rounded-lg hover:border-red-500 hover:text-red-500 transition-colors"
                  title="Delete experience"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      {documents.length > 0 && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Showing {filteredDocs.length} of {documents.length} experience{documents.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
