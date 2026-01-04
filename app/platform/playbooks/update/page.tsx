'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileText, Calendar, User, CheckCircle, BookOpenIcon as BookOpen, FileCheck, Users, Building, Loader2, Upload, X } from 'lucide-react'
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
  profiles?: {
    full_name: string | null
    role: string | null
  }
}

export default function UpdatePlaybooksPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [documents, setDocuments] = useState<AccessibleDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

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
    return (
      doc.title.toLowerCase().includes(searchLower) ||
      doc.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      doc.profiles?.role?.toLowerCase().includes(searchLower)
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

  const handleFileUpload = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.docx') && !file.name.endsWith('.txt')) {
      alert('Please upload a PDF, DOCX, or TXT file')
      return
    }
    setUploadedFile(file)
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

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
  }

  const handleUpdate = async () => {
    if (!uploadedFile || selectedDocuments.size === 0) return

    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append('playbook', uploadedFile)
      formData.append('documentIds', JSON.stringify(Array.from(selectedDocuments)))

      const response = await fetch('/api/update-playbook', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to update playbook')
      }

      const result = await response.json()

      if (result.error) {
        alert(`Update failed: ${result.error}`)
      } else {
        alert('Playbook updated successfully!')
        setUploadedFile(null)
        setSelectedDocuments(new Set())
      }
    } catch (error) {
      console.error('Error updating playbook:', error)
      alert('Failed to update playbook. Please try again.')
    } finally {
      setIsUpdating(false)
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
        <h1 className="text-4xl font-semibold text-foreground mb-2">Update Playbooks</h1>
        <p className="text-muted-foreground">
          Upload an existing playbook or guide and incorporate new experiences to keep it current
        </p>
      </div>

      {/* File Upload Section */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Upload Existing Playbook</h3>
        {!uploadedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Drag and drop your playbook file here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Supported formats: PDF, DOCX, TXT
            </p>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg cursor-pointer hover:bg-accent/90 transition-colors"
            >
              Choose File
            </label>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-accent" />
              <div>
                <p className="font-medium text-foreground">{uploadedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-1 hover:bg-destructive/10 rounded"
            >
              <X className="w-5 h-5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        )}
      </div>

      {/* Selection Summary */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">Selected Experiences</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedDocuments.size} of {filteredDocuments.length} experiences selected
            </p>
            {selectedDocuments.size > 0 && uploadedFile && (
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
              disabled={!uploadedFile || selectedDocuments.size === 0 || isUpdating}
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

              {/* Type Badge */}
              <div className="mb-3">
                <span className="px-2 py-1 text-xs font-medium rounded bg-muted text-muted-foreground">
                  {doc.document_type === 'case-study' ? 'Case Study' : 'Best Practices'}
                </span>
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