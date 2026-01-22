'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileText, Calendar, User, CheckCircle, BookOpenIcon as BookOpen, FileCheck, Users, Building, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getAccessibleDocuments } from '@/lib/supabase/interviews'
import { getUserInterviews } from '@/lib/supabase/interviews'
import { Profile } from '@/types/database.types'

type AccessibleDocument = {
  id: string
  title: string
  document_type: 'case-study' | 'best-practices'
  created_at: string
  user_id: string
  is_shared: boolean
  function_area: string | null
  profiles?: {
    full_name: string | null
    role: string | null
  }
  interviews?: {
    function_area: string | null
  }
}

type GenerationType = 'sales-playbook' | 'customer-success-guide' | 'operational-procedures' | 'strategic-planning-document'

export default function PlaybooksPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [documents, setDocuments] = useState<AccessibleDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [generationType, setGenerationType] = useState<GenerationType>('sales-playbook')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('')
  const [displayedStatus, setDisplayedStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [playbookTitle, setPlaybookTitle] = useState('')

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

      const accessibleDocs = await getAccessibleDocuments()
      console.log('Accessible documents:', accessibleDocs.map(doc => ({ id: doc.id, title: doc.title, contentLength: doc.content?.length || 0, hasContent: !!(doc.content && doc.content.trim()) })))
      setDocuments(accessibleDocs as AccessibleDocument[])

      // Check if user has any interviews
      const userInterviews = await getUserInterviews()
      console.log('User interviews:', userInterviews.length, 'total')

      // Check if user has any documents at all
      if (accessibleDocs.length === 0) {
        console.log('No accessible documents found. User needs to complete interviews first.')
        if (userInterviews.length === 0) {
          console.log('User has no interviews at all. They need to start interviews.')
        } else {
          console.log('User has interviews but no documents. They need to complete and generate documents.')
        }
      }
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
    // Use function_area directly from document, fallback to interviews join for backwards compatibility
    const functionArea = doc.function_area || (doc as any).interviews?.function_area
    return (
      doc.title.toLowerCase().includes(searchLower) ||
      doc.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      doc.profiles?.role?.toLowerCase().includes(searchLower) ||
      functionArea?.toLowerCase().includes(searchLower)
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

  const generationMessages = [
    'Analyzing selected experiences...',
    'Extracting key insights and patterns...',
    'Identifying best practices...',
    'Synthesizing knowledge across documents...',
    'Structuring the playbook...',
    'Writing executive summary...',
    'Generating actionable frameworks...',
    'Adding practical examples...',
    'Finalizing content...',
    'Almost there...',
  ]

  // Typewriter effect for status messages
  useEffect(() => {
    if (!generationStatus) {
      setDisplayedStatus('')
      return
    }

    setDisplayedStatus('')
    let currentIndex = 0

    const typeInterval = setInterval(() => {
      if (currentIndex < generationStatus.length) {
        setDisplayedStatus(generationStatus.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(typeInterval)
      }
    }, 30)

    return () => clearInterval(typeInterval)
  }, [generationStatus])

  const handleGenerate = async () => {
    if (selectedDocuments.size < 2) return

    setIsGenerating(true)
    setGenerationStatus(generationMessages[0])

    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to generate playbooks')
        router.push('/login')
        return
      }

      const response = await fetch('/api/generate-playbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: Array.from(selectedDocuments),
          type: generationType,
          title: playbookTitle || undefined,
          savePlaybook: true,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate playbook')
      }

      // Handle Server-Sent Events stream
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events from buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7)
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))

            if (eventType === 'status') {
              setGenerationStatus(data.message)
            } else if (eventType === 'error') {
              throw new Error(data.error)
            } else if (eventType === 'complete') {
              console.log('Generated playbook:', data)
              setGenerationStatus('Playbook created successfully!')
              // Clear selections
              setSelectedDocuments(new Set())
              setPlaybookTitle('')
              // Redirect to shared playbooks page to view the generated playbook
              setTimeout(() => {
                router.push('/platform/shared-playbooks')
              }, 500)
            }
          }
        }
      }

    } catch (error) {
      console.error('Error generating playbook:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate playbook. Please try again.')
    } finally {
      setIsGenerating(false)
      setGenerationStatus('')
    }
  }

  const getGenerationTypeIcon = (type: GenerationType) => {
    switch (type) {
      case 'sales-playbook': return <BookOpen className="w-5 h-5" />
      case 'customer-success-guide': return <FileText className="w-5 h-5" />
      case 'operational-procedures': return <FileCheck className="w-5 h-5" />
      case 'strategic-planning-document': return <Building className="w-5 h-5" />
    }
  }

  const getGenerationTypeLabel = (type: GenerationType) => {
    switch (type) {
      case 'sales-playbook': return 'Sales Playbook'
      case 'customer-success-guide': return 'Customer Success Guide'
      case 'operational-procedures': return 'Operational Procedures'
      case 'strategic-planning-document': return 'Strategic Planning Document'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-foreground mb-2">Create Playbook</h1>
        <p className="text-muted-foreground">
          Synthesize patterns and best practices from multiple experiences to create comprehensive guides
        </p>
      </div>

      {/* Playbook Title Input */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Playbook Details</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="playbook-title" className="block text-sm font-medium text-foreground mb-2">
              Playbook Title (optional)
            </label>
            <input
              id="playbook-title"
              type="text"
              value={playbookTitle}
              onChange={(e) => setPlaybookTitle(e.target.value)}
              placeholder="e.g., Enterprise Sales Playbook Q1 2026"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground mt-1">
              If not provided, a title will be generated automatically based on the playbook type and date
            </p>
          </div>
        </div>
      </div>

      {/* Generation Controls */}
      <div className={`bg-card rounded-xl border p-6 mb-8 transition-colors ${isGenerating ? 'border-accent/50 bg-accent/5' : 'border-border'}`}>
        {/* Generation Progress Banner */}
        {isGenerating && (
          <div className="mb-6 p-4 bg-accent/10 rounded-lg border border-accent/20">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-accent animate-spin flex-shrink-0" />
              <div className="overflow-hidden">
                <p className="font-medium text-foreground">Generating your playbook...</p>
                <p className="text-sm text-muted-foreground">
                  {displayedStatus}
                  <span className="inline-block w-0.5 h-4 bg-muted-foreground ml-0.5 animate-pulse" />
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Selection Summary */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">Selected Experiences</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedDocuments.size} of {filteredDocuments.length} experiences selected
            </p>
            {selectedDocuments.size >= 2 && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Ready to generate
              </div>
            )}
          </div>

          {/* Generation Type Selector */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">Generation Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['sales-playbook', 'customer-success-guide', 'operational-procedures', 'strategic-planning-document'] as GenerationType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setGenerationType(type)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    generationType === type
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getGenerationTypeIcon(type)}
                    <span className="text-sm font-medium">{getGenerationTypeLabel(type)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={selectedDocuments.size < 2 || isGenerating}
              className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  Generate {getGenerationTypeLabel(generationType)}
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
              : 'Complete some interviews and share experiences to start creating playbooks.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`bg-card rounded-lg border p-6 hover:shadow-md transition-all cursor-pointer group ${
                selectedDocuments.has(doc.id)
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-accent/40'
              }`}
              onClick={() => handleSelectDocument(doc.id)}
            >
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

              {/* Function Area Badge */}
              {(doc.function_area || (doc as any).interviews?.function_area) && (
                <div className="mb-3">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-muted text-muted-foreground capitalize">
                    {doc.function_area || (doc as any).interviews?.function_area}
                  </span>
                </div>
              )}

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
          ))}
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
