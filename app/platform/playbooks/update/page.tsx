'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileText, Calendar, User, CheckCircle, BookOpenIcon as BookOpen, Users, Loader2, ArrowLeft, Plus, Upload, File, X } from 'lucide-react'
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
  function_area: string | null
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

type UploadedPlaybook = {
  fileName: string
  content: string
  title: string
}

type ViewMode = 'select-source' | 'playbook-selection' | 'document-selection'

export default function UpdatePlaybooksPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('select-source')
  const [playbooks, setPlaybooks] = useState<PlaybookWithProfile[]>([])
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookWithProfile | null>(null)
  const [uploadedPlaybook, setUploadedPlaybook] = useState<UploadedPlaybook | null>(null)
  const [documents, setDocuments] = useState<AccessibleDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('')

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

  const handleSelectPlaybook = (playbook: PlaybookWithProfile) => {
    setSelectedPlaybook(playbook)
    setUploadedPlaybook(null)
    // Pre-select existing documents in the playbook
    setSelectedDocuments(new Set(playbook.document_ids || []))
    setViewMode('document-selection')
  }

  const handleBackToSelection = () => {
    setSelectedPlaybook(null)
    setUploadedPlaybook(null)
    setSelectedDocuments(new Set())
    setAdditionalContext('')
    setViewMode('select-source')
  }

  const handleBackToPlaybooks = () => {
    setSelectedPlaybook(null)
    setSelectedDocuments(new Set())
    setAdditionalContext('')
    setViewMode('playbook-selection')
  }

  const handleChooseExistingPlaybooks = () => {
    setViewMode('playbook-selection')
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handleFileUpload = async (file: globalThis.File) => {
    // Validate file type
    const validTypes = ['text/plain', 'text/markdown', 'application/json']
    const validExtensions = ['.txt', '.md', '.json']
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

    if (!validTypes.includes(file.type) && !hasValidExtension) {
      alert('Please upload a .txt, .md, or .json file')
      return
    }

    setIsUploading(true)
    try {
      const content = await file.text()

      // Extract title from content or use filename
      let title = file.name.replace(/\.(txt|md|json)$/i, '')

      // Try to extract title from markdown heading
      const headingMatch = content.match(/^#\s+(.+)$/m)
      if (headingMatch) {
        title = headingMatch[1].trim()
      }

      setUploadedPlaybook({
        fileName: file.name,
        content,
        title
      })
      setSelectedPlaybook(null)
      setSelectedDocuments(new Set())
      setViewMode('document-selection')
    } catch (error) {
      console.error('Error reading file:', error)
      alert('Failed to read file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveUploadedFile = () => {
    setUploadedPlaybook(null)
    setViewMode('select-source')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpdate = async () => {
    if (selectedDocuments.size === 0) return
    if (!selectedPlaybook && !uploadedPlaybook) return

    setIsUpdating(true)
    setUpdateStatus('Preparing update...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to update playbooks')
        router.push('/login')
        return
      }

      let requestBody: any
      if (uploadedPlaybook) {
        requestBody = {
          uploadedContent: uploadedPlaybook.content,
          uploadedTitle: uploadedPlaybook.title,
          documentIds: Array.from(selectedDocuments),
          newDocumentIds: Array.from(selectedDocuments),
          additionalContext: additionalContext || undefined,
          userId: user.id,
        }
      } else if (selectedPlaybook) {
        const existingDocIds = new Set(selectedPlaybook.document_ids || [])
        const newDocIds = Array.from(selectedDocuments).filter(id => !existingDocIds.has(id))
        requestBody = {
          playbookId: selectedPlaybook.id,
          documentIds: Array.from(selectedDocuments),
          newDocumentIds: newDocIds,
          additionalContext: additionalContext || undefined,
          userId: user.id,
        }
      }

      const response = await fetch('/api/update-playbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to update playbook')
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

        // SSE events are separated by double newlines
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const event of events) {
          if (!event.trim()) continue

          const lines = event.split('\n')
          let eventType = ''
          let eventData = ''

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6)
            }
          }

          if (eventType && eventData) {
            try {
              const data = JSON.parse(eventData)

              if (eventType === 'status') {
                setUpdateStatus(data.message)
              } else if (eventType === 'error') {
                throw new Error(data.error)
              } else if (eventType === 'complete') {
                console.log('Updated playbook:', data)
                setUpdateStatus('Success!')
                // Redirect to the playbook
                setTimeout(() => {
                  router.push(`/platform/shared-playbooks/${data.playbookId}`)
                }, 500)
              }
            } catch (parseError) {
              if (parseError instanceof Error && parseError.message !== 'Failed to update playbook') {
                console.warn('Failed to parse SSE event data:', eventData, parseError)
              } else {
                throw parseError
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Error updating playbook:', error)
      alert(error instanceof Error ? error.message : 'Failed to update playbook. Please try again.')
    } finally {
      setIsUpdating(false)
      setUpdateStatus('')
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

  // Source selection view - choose between upload or existing playbook
  if (viewMode === 'select-source') {
    return (
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-foreground mb-2">Update Playbook</h1>
          <p className="text-muted-foreground">
            Upload a local playbook or select an existing one to update with new experiences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-card rounded-xl border border-border p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Upload Local Playbook</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Upload a playbook file from your computer to enhance it with experiences from the platform
            </p>

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-accent/50 hover:bg-muted/30'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.json"
                onChange={handleFileSelect}
                className="hidden"
                id="playbook-upload"
              />

              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-accent animate-spin" />
                  <p className="text-muted-foreground">Reading file...</p>
                </div>
              ) : (
                <>
                  <File className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-foreground font-medium mb-2">
                    Drag and drop your playbook file here
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supports .txt, .md, and .json files
                  </p>
                  <label
                    htmlFor="playbook-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Browse Files
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Existing Playbooks Section */}
          <div className="bg-card rounded-xl border border-border p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Update Existing Playbook</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Select one of your existing playbooks to add new experiences and insights
            </p>

            {playbooks.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No playbooks yet</p>
                <button
                  onClick={() => router.push('/platform/playbooks')}
                  className="px-4 py-2 bg-accent/10 text-accent rounded-lg font-medium hover:bg-accent/20 transition-colors"
                >
                  Create Your First Playbook
                </button>
              </div>
            ) : (
              <>
                <div className="text-sm text-muted-foreground mb-4">
                  {playbooks.length} playbook{playbooks.length !== 1 ? 's' : ''} available
                </div>
                <button
                  onClick={handleChooseExistingPlaybooks}
                  className="w-full px-4 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Choose from My Playbooks
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Playbook selection view - choose which existing playbook to update
  if (viewMode === 'playbook-selection') {
    return (
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <button
            onClick={handleBackToSelection}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to options
          </button>
          <h1 className="text-4xl font-semibold text-foreground mb-2">Select a Playbook</h1>
          <p className="text-muted-foreground">
            Choose which playbook you want to update with new experiences
          </p>
        </div>

        {/* Playbooks List */}
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
      </div>
    )
  }

  // Document selection view - select experiences to add to playbook
  const playbookTitle = selectedPlaybook?.title || uploadedPlaybook?.title || 'Playbook'
  const existingDocCount = selectedPlaybook?.document_ids?.length || 0
  const newDocCount = selectedDocuments.size - existingDocCount

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      {/* Page Header with Back Button */}
      <div className="mb-8">
        <button
          onClick={selectedPlaybook ? handleBackToPlaybooks : handleBackToSelection}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {selectedPlaybook ? 'Back to playbooks' : 'Back to options'}
        </button>
        <h1 className="text-4xl font-semibold text-foreground mb-2">
          {uploadedPlaybook ? `Update: ${playbookTitle}` : `Update: ${playbookTitle}`}
        </h1>
        <p className="text-muted-foreground">
          {uploadedPlaybook
            ? 'Select experiences to enhance your uploaded playbook'
            : 'Add new experiences or provide additional context to enhance your playbook'
          }
        </p>
      </div>

      {/* Uploaded File Info */}
      {uploadedPlaybook && (
        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <File className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{uploadedPlaybook.fileName}</h3>
                <p className="text-sm text-muted-foreground">
                  {uploadedPlaybook.content.length.toLocaleString()} characters
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveUploadedFile}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Remove file"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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
      <div className={`bg-card rounded-xl border p-6 mb-8 transition-colors ${isUpdating ? 'border-accent/50 bg-accent/5' : 'border-border'}`}>
        {/* Update Progress Banner */}
        {isUpdating && updateStatus && (
          <div className="mb-6 p-4 bg-accent/10 rounded-lg border border-accent/20">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-accent animate-spin flex-shrink-0" />
              <div className="overflow-hidden">
                <p className="font-medium text-foreground">
                  {uploadedPlaybook ? 'Creating your playbook...' : 'Updating your playbook...'}
                </p>
                <p className="text-sm text-muted-foreground">{updateStatus}</p>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">Selected Experiences</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {uploadedPlaybook
                ? `${selectedDocuments.size} experiences selected`
                : `${selectedDocuments.size} experiences selected (${newDocCount > 0 ? newDocCount : 0} new)`
              }
            </p>
            {selectedDocuments.size > 0 && !isUpdating && (
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
                  {uploadedPlaybook ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  {uploadedPlaybook ? 'Create Enhanced Playbook' : 'Update Playbook'}
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
            const isExistingInPlaybook = selectedPlaybook?.document_ids?.includes(doc.id) || false
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
                  {!isExistingInPlaybook && selectedPlaybook && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      New
                    </span>
                  )}
                  {(doc.function_area || (doc as any).interviews?.function_area) && (
                    <span className="px-2 py-1 text-xs font-medium rounded bg-muted text-muted-foreground capitalize">
                      {doc.function_area || (doc as any).interviews?.function_area}
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