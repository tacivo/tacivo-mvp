'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Briefcase, Award, FileText, Calendar, X, Search, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getOrganizationExperts, getExpertDocuments } from '@/lib/supabase/interviews'
import { Profile } from '@/types/database.types'

type Expert = Profile & {
  documentCount?: number
}

type ExpertDocument = {
  id: string
  title: string
  document_type: 'case-study' | 'best-practices'
  created_at: string
}

export default function ExpertsPage() {
  const router = useRouter()
  const [experts, setExperts] = useState<Expert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  const [expertDocuments, setExpertDocuments] = useState<ExpertDocument[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)

  useEffect(() => {
    loadExperts()
  }, [])

  async function loadExperts() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const expertsData = await getOrganizationExperts()

      // Get document counts for each expert
      const expertsWithCounts = await Promise.all(
        expertsData.map(async (expert: Expert) => {
          const docs = await getExpertDocuments(expert.id)
          return {
            ...expert,
            documentCount: docs.length
          }
        })
      )

      setExperts(expertsWithCounts)
    } catch (error) {
      console.error('Error loading experts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleExpertClick(expert: Expert) {
    setSelectedExpert(expert)
    setLoadingDocuments(true)
    try {
      const docs = await getExpertDocuments(expert.id)
      setExpertDocuments(docs as ExpertDocument[])
    } catch (error) {
      console.error('Error loading expert documents:', error)
    } finally {
      setLoadingDocuments(false)
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

  const filteredExperts = experts.filter(expert => {
    const searchLower = searchQuery.toLowerCase()
    return (
      expert.full_name?.toLowerCase().includes(searchLower) ||
      expert.role?.toLowerCase().includes(searchLower) ||
      expert.area_of_expertise?.toLowerCase().includes(searchLower)
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
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-foreground mb-2">Experts</h1>
        <p className="text-muted-foreground">
          Subject matter experts within your organization
        </p>
      </div>

      {/* Search Bar */}
      {experts.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search experts by name, role, or expertise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Experts Grid */}
      {filteredExperts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {searchQuery ? 'No experts found' : 'No experts yet'}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Experts in your organization will appear here once they\'re marked as subject matter experts.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExperts.map((expert, index) => (
            <motion.div
              key={expert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => handleExpertClick(expert)}
              className="bg-card rounded-lg border border-border p-6 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer group"
            >
              {/* Expert Avatar */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-8 h-8 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-accent transition-colors truncate">
                    {expert.full_name || 'Expert'}
                  </h3>
                  {expert.role && (
                    <p className="text-sm text-muted-foreground truncate">
                      {expert.role}
                    </p>
                  )}
                </div>
              </div>

              {/* Expert Details */}
              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                {expert.years_of_experience && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 flex-shrink-0" />
                    <span>{expert.years_of_experience} years of experience</span>
                  </div>
                )}
                {expert.area_of_expertise && (
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{expert.area_of_expertise}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span>{expert.documentCount || 0} shared {expert.documentCount === 1 ? 'document' : 'documents'}</span>
                </div>
              </div>

              {/* View Profile Button */}
              <div className="pt-4 border-t border-border">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExpertClick(expert)
                  }}
                  className="w-full px-4 py-2 bg-accent/10 text-accent rounded-lg font-medium hover:bg-accent/20 transition-colors"
                >
                  View Profile
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      {experts.length > 0 && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Showing {filteredExperts.length} of {experts.length} expert{experts.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Expert Detail Modal */}
      <AnimatePresence>
        {selectedExpert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">
                      {selectedExpert.full_name || 'Expert'}
                    </h2>
                    {selectedExpert.role && (
                      <p className="text-muted-foreground">{selectedExpert.role}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedExpert(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {/* Expert Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">About</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedExpert.years_of_experience && (
                      <div className="flex items-start gap-3">
                        <Briefcase className="w-5 h-5 text-accent mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Experience</p>
                          <p className="text-sm text-muted-foreground">{selectedExpert.years_of_experience} years</p>
                        </div>
                      </div>
                    )}
                    {selectedExpert.area_of_expertise && (
                      <div className="flex items-start gap-3">
                        <Award className="w-5 h-5 text-accent mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Expertise</p>
                          <p className="text-sm text-muted-foreground">{selectedExpert.area_of_expertise}</p>
                        </div>
                      </div>
                    )}
                    {selectedExpert.company && (
                      <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-accent mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Company</p>
                          <p className="text-sm text-muted-foreground">{selectedExpert.company}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedExpert.goal && (
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium text-foreground mb-1">Goal</p>
                      <p className="text-sm text-muted-foreground">{selectedExpert.goal}</p>
                    </div>
                  )}
                </div>

                {/* Shared Documents */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Shared Documents ({expertDocuments.length})
                  </h3>
                  {loadingDocuments ? (
                    <div className="flex justify-center py-8">
                      <div className="inline-block w-6 h-6 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : expertDocuments.length === 0 ? (
                    <div className="bg-muted/30 rounded-lg p-8 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">No shared documents yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {expertDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => {
                            setSelectedExpert(null)
                            router.push(`/platform/experiences/${doc.id}`)
                          }}
                          className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground group-hover:text-accent transition-colors truncate">
                              {doc.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                {doc.document_type === 'case-study' ? 'Case Study' : 'Best Practices'}
                              </span>
                              <span>•</span>
                              <span>{formatDate(doc.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
