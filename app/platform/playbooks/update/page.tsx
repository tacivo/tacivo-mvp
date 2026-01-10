'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileText, Calendar, User, CheckCircle, BookOpenIcon as BookOpen, Users, Loader2, ArrowLeft, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getAccessibleDocuments } from '@/lib/supabase/interviews'
import { Playbook } from '@/types/database.types'

type AccessibleDocument = {
  id: string
  title: string
  document_type: 'case-study' | 'best-practices'
  created_at: string
  user_id: string
  is_shared: boolean
  profiles?: {
    full_name: string | null
    role: string | null
  }
  interviews?: {
    function_area: string | null
  }
}

type PlaybookWithProfile = Playbook & {
  profiles?: {
    full_name: string | null
  }
}

export default function UpdatePlaybooksPage() {
  const router = useRouter()
  const [playbooks, setPlaybooks] = useState<PlaybookWithProfile[]>([])
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookWithProfile | null>(null)
  const [documents, setDocuments] = useState<AccessibleDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')

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

      // Fetch only user's own playbooks (they can only update their own)
      const { data: playbooksData, error: playbooksError } = await supabase
        .from('playbooks')
        .select(`
          *,
          profiles:user_id (
            full_name
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (playbooksError) {
        console.error('Error fetching playbooks:', playbooksError)
      } else {
        console.log('Loaded playbooks:', playbooksData)
        setPlaybooks(playbooksData as PlaybookWithProfile[] || [])
      }

      // Fetch accessible documents
      const accessibleDocs = await getAccessibleDocuments()
      setDocuments(accessibleDocs as AccessibleDocument[])
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

  const filteredDocuments = documents.filter(doc => {
    const searchLower = searchQuery.toLowerCase()
    const interview = (doc as any).interviews
    return (
      doc.title.toLowerCase().includes(searchLower) ||
      doc.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      doc.profiles?.role?.toLowerCase().includes(searchLower) ||
      interview?.function_area?.toLowerCase().includes(searchLower)
    )
  })

  const handleSelectDocument = (docId: string) => {
    const newSelected = new Set(selectedDocuments)
    if (newSelected.has(docId)) {
      newSelected.delete(docId)
    } else {
      newSelected.add(docId)
    }
    setSelectedDocuments(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set())
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)))
    }
  }

  const handleSelectPlaybook = (playbook: PlaybookWithProfile) => {
    setSelectedPlaybook(playbook)
    // Pre-select existing documents in the playbook
    setSelectedDocuments(new Set(playbook.document_ids || []))
  }

  const handleBackToSelection = () => {
    setSelectedPlaybook(null)
    setSelectedDocuments(new Set())
    setAdditionalContext('')
  }

  const handleUpdate = async () => {
    if (!selectedPlaybook || selectedDocuments.size === 0) return

    setIsUpdating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to update playbooks')
        router.push('/login')
        return
      }

      // Get the new document IDs (documents that weren't in the original playbook)
      const existingDocIds = new Set(selectedPlaybook.document_ids || [])
      const newDocIds = Array.from(selectedDocuments).filter(id => !existingDocIds.has(id))

      const response = await fetch('/api/update-playbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playbookId: selectedPlaybook.id,
          documentIds: Array.from(selectedDocuments),
          newDocumentIds: newDocIds,
          additionalContext: additionalContext || undefined,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update playbook')
      }

      const result = await response.json()

      if (result.error) {
        alert(`Update failed: ${result.error}`)
      } else {
        alert('Playbook updated successfully!')
        // Redirect to the updated playbook
        router.push(`/platform/shared-playbooks/${selectedPlaybook.id}`)
      }
    } catch (error) {
      console.error('Error updating playbook:', error)
      alert('Failed to update playbook. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const getGenerationTypeLabel = (type: string) => {
    switch (type) {
      case 'sales-playbook': return 'Sales Playbook'
      case 'customer-success-guide': return 'Customer Success Guide'
      case 'operational-procedures': return 'Operational Procedures'
      case 'strategic-planning-document': return 'Strategic Planning Document'
      default: return type
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // If no playbook selected, show playbook selection
  if (!selectedPlaybook) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-foreground mb-2">Update Playbook</h1>
          <p className="text-muted-foreground">
            Select a playbook to update with new experiences and insights
          </p>
        </div>

        {/* Playbooks List */}
        {playbooks.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No playbooks yet</h2>
            <p className="text-muted-foreground mb-6">
              Create a playbook first before you can update it
            </p>
            <button
              onClick={() => router.push('/platform/playbooks')}
              className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              Create Playbook
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {playbooks.map((playbook, index) => (
              <motion.div
                key={playbook.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-card rounded-lg border border-border p-6 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleSelectPlaybook(playbook)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-accent transition-colors">
                      {playbook.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted capitalize">
                        {getGenerationTypeLabel(playbook.type)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span>{playbook.document_ids?.length || 0} source documents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>Updated {formatDate(playbook.updated_at)}</span>
                  </div>
                </div>

                <button className="mt-4 w-full px-4 py-2 bg-accent/10 text-accent rounded-lg font-medium hover:bg-accent/20 transition-colors">
                  Select to Update
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Playbook selected, show document selection
  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      {/* Page Header with Back Button */}
      <div className="mb-8">
        <button
          onClick={handleBackToSelection}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to playbooks
        </button>
        <h1 className="text-4xl font-semibold text-foreground mb-2">Update: {selectedPlaybook.title}</h1>
        <p className="text-muted-foreground">
          Add new experiences or provide additional context to enhance your playbook
        </p>
      </div>

      {/* Additional Context Section */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Additional Context (Optional)</h3>
        <textarea
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          placeholder="Provide any additional context or specific instructions for updating the playbook..."
          rows={4}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
        />
        <p className="text-xs text-muted-foreground mt-2">
          For example: "Focus on enterprise customer onboarding" or "Include more technical implementation details"
        </p>
      </div>

      {/* Selection Summary */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">Selected Experiences</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedDocuments.size} experiences selected ({selectedDocuments.size - (selectedPlaybook.document_ids?.length || 0)} new)
            </p>
            {selectedDocuments.size > 0 && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Ready to update
              </div>
            )}
          </div>

          {/* Update Button */}
          <div className="flex items-end">
            <button
              onClick={handleUpdate}
              disabled={selectedDocuments.size === 0 || isUpdating}
              className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  Update Playbook
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Select All */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search experiences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>
        <button
          onClick={handleSelectAll}
          className="px-4 py-2 border border-border rounded-lg hover:border-accent/50 transition-colors text-sm"
        >
          {selectedDocuments.size === filteredDocuments.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {searchQuery ? 'No experiences found' : 'No experiences available'}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Complete some interviews and share experiences to start updating playbooks.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc, index) => {
            const isExistingInPlaybook = selectedPlaybook.document_ids?.includes(doc.id)
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`bg-card rounded-lg border p-6 hover:shadow-md transition-all cursor-pointer group relative ${
                  selectedDocuments.has(doc.id)
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-accent/40'
                }`}
                onClick={() => handleSelectDocument(doc.id)}
              >
                {/* Existing Document Badge */}
                {isExistingInPlaybook && (
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      In playbook
                    </span>
                  </div>
                )}

                {/* Checkbox */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.has(doc.id)}
                      onChange={() => handleSelectDocument(doc.id)}
                      className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                    />
                    {doc.is_shared && (
                      <Users className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-accent transition-colors">
                  {doc.title}
                </h3>

                {/* Status and Function Area Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {!isExistingInPlaybook && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      New
                    </span>
                  )}
                  {(doc as any).interviews?.function_area && (
                    <span className="px-2 py-1 text-xs font-medium rounded bg-muted text-muted-foreground capitalize">
                      {(doc as any).interviews.function_area}
                    </span>
                  )}
                </div>

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
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Stats Footer */}
      {documents.length > 0 && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Showing {filteredDocuments.length} of {documents.length} accessible experience{documents.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}