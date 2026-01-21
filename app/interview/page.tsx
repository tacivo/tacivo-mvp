'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Upload, X, FileText, Sparkles, Send, Mic, Volume2, VolumeX, FileDown, User, StopCircle, Pencil, Check, HelpCircle, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { Profile } from '@/types/database.types'
import { createInterview, addInterviewMessage, updateInterviewStatus, getInterviewMessages, createDocument, getInterview } from '@/lib/supabase/interviews'
import { useVoiceControls } from '@/hooks/useVoiceControls'
import Image from 'next/image'

type ExperienceContext = {
  process: string
  title: string
  description: string
  uploadedFiles: File[]
}

// Editable Info Card Component
function EditableInfoCard({
  label,
  value,
  onChange,
  multiline = false
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const textareaEditRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
    if (isEditing && textareaEditRef.current) {
      textareaEditRef.current.focus()
      // Auto-resize textarea
      textareaEditRef.current.style.height = 'auto'
      textareaEditRef.current.style.height = textareaEditRef.current.scrollHeight + 'px'
    }
  }, [isEditing])

  const handleSave = () => {
    onChange(editValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value)
    // Auto-resize on input
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  return (
    <div className="bg-card border border-border rounded-xl p-3 group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground transition-all"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
        {isEditing && (
          <button
            onClick={handleSave}
            className="p-1 rounded text-accent hover:bg-accent/10 transition-all"
          >
            <Check className="w-3 h-3" />
          </button>
        )}
      </div>
      {isEditing ? (
        multiline ? (
          <textarea
            ref={textareaEditRef}
            value={editValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full text-sm text-foreground bg-muted/50 border border-border rounded-lg px-2 py-1.5 outline-none focus:border-accent/50 resize-none overflow-hidden"
            style={{ minHeight: '60px' }}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full text-sm text-foreground bg-muted/50 border border-border rounded-lg px-2 py-1.5 outline-none focus:border-accent/50"
          />
        )
      ) : (
        <p className={`text-sm text-foreground ${multiline ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
          {value || <span className="text-muted-foreground italic">Not set</span>}
        </p>
      )}
    </div>
  )
}

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Step = 'welcome' | 'setup' | 'chat' | 'results'

function ExperiencePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resumeInterviewId = searchParams.get('resume')

  const [step, setStep] = useState<Step>('welcome')
  const [context, setContext] = useState<ExperienceContext>({
    process: '',
    title: '',
    description: '',
    uploadedFiles: [],
  })
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [currentInterviewId, setCurrentInterviewId] = useState<string | null>(null)
  const [interviewProgress, setInterviewProgress] = useState(0)
  const [isEndingInterview, setIsEndingInterview] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const voiceControls = useVoiceControls()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (resumeInterviewId && userProfile) {
      loadResumedInterview(resumeInterviewId)
    }
  }, [resumeInterviewId, userProfile])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      setUserProfile(profile as unknown as Profile)
    }
  }

  async function loadResumedInterview(interviewId: string) {
    try {
      // Load interview details
      const interview = await getInterview(interviewId)

      // Load all messages
      const interviewMessages = await getInterviewMessages(interviewId)

      // Set the interview context from the stored data
      setContext({
        process: interview.function_area || '',
        title: interview.title || '',
        description: interview.description || '',
        uploadedFiles: []
      })

      // Set the messages
      setMessages(interviewMessages.map(m => ({
        role: m.role,
        content: m.content
      })))

      // Set current interview ID
      setCurrentInterviewId(interviewId)

      // Jump directly to chat step
      setStep('chat')
    } catch (error) {
      console.error('Error loading resumed interview:', error)
      alert('Failed to load interview. Starting fresh.')
      setStep('welcome')
    }
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    const newFiles = Array.from(files).filter(file => {
      const validTypes = ['.pdf', '.docx', '.pptx', '.txt', '.md']
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      return validTypes.includes(extension) && file.size <= 10 * 1024 * 1024
    })

    setContext({
      ...context,
      uploadedFiles: [...context.uploadedFiles, ...newFiles]
    })
  }

  const removeFile = (index: number) => {
    const newFiles = [...context.uploadedFiles]
    newFiles.splice(index, 1)
    setContext({ ...context, uploadedFiles: newFiles })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '48px'
    const newHeight = Math.min(textarea.scrollHeight, 144)
    textarea.style.height = `${newHeight}px`
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [inputMessage])

  // Update progress based on message count
  useEffect(() => {
    if (messages.length > 0) {
      // Estimate progress: 10 exchanges (20 messages) = 100%
      const progress = Math.min((messages.length / 20) * 100, 100)
      setInterviewProgress(progress)
    }
  }, [messages])

  // Press-to-talk: Hold 'T' to record, release to stop
  useEffect(() => {
    if (step !== 'chat') return

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if typing in input fields
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return
      }

      // Press 'T' to start recording (only if not already recording)
      if (e.key.toLowerCase() === 't' && !e.repeat && !voiceControls.isRecording && !voiceControls.isTranscribing) {
        e.preventDefault()
        await voiceControls.startRecording()
      }
    }

    const handleKeyUp = async (e: KeyboardEvent) => {
      // Release 'T' to stop recording
      if (e.key.toLowerCase() === 't' && voiceControls.isRecording) {
        e.preventDefault()
        try {
          const transcribedText = await voiceControls.stopRecording()
          setInputMessage(prev => {
            const newText = prev ? `${prev} ${transcribedText}` : transcribedText
            return newText.trim()
          })
          // Focus the textarea after transcription
          setTimeout(() => {
            textareaRef.current?.focus()
            // Move cursor to end of text
            if (textareaRef.current) {
              const len = textareaRef.current.value.length
              textareaRef.current.setSelectionRange(len, len)
            }
          }, 50)
        } catch (error) {
          console.error('Failed to transcribe:', error)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [step, voiceControls.isRecording, voiceControls.isTranscribing, voiceControls])

  const handleEndInterview = async () => {
    if (!currentInterviewId || !userProfile) return

    if (!confirm('Are you sure you want to end this interview? We will generate your case study document.')) {
      return
    }

    setIsEndingInterview(true)
    try {
      // Update interview status to completed
      await updateInterviewStatus(currentInterviewId, 'completed', new Date().toISOString())
      setInterviewProgress(100)

      // Fetch all interview messages
      const allMessages = await getInterviewMessages(currentInterviewId)

      // Generate document using AI
      const response = await fetch('/api/generate-doc-case-study', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          context: {
            expertName: userProfile.full_name || 'Expert',
            role: userProfile.role || 'Professional',
            yearsOfExperience: userProfile.years_of_experience || 0,
            processToDocument: context.description || context.title
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate document')
      }

      const responseData = await response.json()
      const { document: documentContent, blockNoteBlocks, format } = responseData

      // Save document to database
      const doc = await createDocument({
        interview_id: currentInterviewId,
        user_id: userProfile.id,
        title: context.title || context.process || 'Case Study',
        content: format === 'blocknote' ? JSON.stringify(blockNoteBlocks) : documentContent,
        document_type: 'case-study',
        format: format || 'markdown',
        is_shared: false
      })

      // Redirect to document viewing page
      router.push(`/platform/sessions/completed/${doc.id}`)
    } catch (error) {
      console.error('Error ending interview:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to generate document: ${errorMessage}. Please try again.`)
    } finally {
      setIsEndingInterview(false)
    }
  }

  const handlePlayLastMessage = () => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')
    if (lastAssistantMessage) {
      voiceControls.playText(lastAssistantMessage.content)
    }
  }

  const startExperience = async () => {
    if (!context.process.trim()) {
      alert('Please specify the process or area')
      return
    }
    if (!context.title.trim()) {
      alert('Please provide a title for your experience')
      return
    }
    if (context.description.length < 50) {
      alert('Please provide at least a brief description (50 characters minimum)')
      return
    }

    if (!userProfile) {
      alert('User profile not loaded')
      return
    }

    setStep('chat')
    setIsLoading(true)
    setIsTyping(true)

    const processToDocument = `Case Study: ${context.description}`

    try {
      // Create interview record
      const interview = await createInterview({
        user_id: userProfile.id,
        document_type: 'case-study',
        title: context.title,
        function_area: context.process,
        description: context.description,
        status: 'in_progress'
      })
      setCurrentInterviewId(interview.id)

      const initialMessages: Message[] = [
        {
          role: 'user',
          content: `Hello! I'm ready to begin the knowledge transfer interview about: ${processToDocument}`,
        },
      ]

      const response = await fetch('/api/chat-case-study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: initialMessages,
          context: {
            expertName: userProfile.full_name || 'Expert',
            role: userProfile.role || '',
            yearsOfExperience: userProfile.years_of_experience?.toString() || '0',
            processToDocument,
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to start interview')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              setIsTyping(false)
              setMessages([{ role: 'assistant', content: assistantMessage }])

              // Save assistant's first message
              if (interview.id && assistantMessage) {
                try {
                  await addInterviewMessage({
                    interview_id: interview.id,
                    role: 'assistant',
                    content: assistantMessage,
                    sequence_number: 1
                  })
                } catch (err) {
                  console.error('Error saving first message:', err)
                }
              }
              break
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                assistantMessage += parsed.text
                setMessages([{ role: 'assistant', content: assistantMessage }])
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Auto-play AI response if enabled
      if (voiceControls.autoPlayEnabled && assistantMessage) {
        await voiceControls.playText(assistantMessage)
      }
    } catch (error) {
      console.error('Error starting interview:', error)
      alert('Failed to start interview. Please try again.')
      setStep('setup')
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputMessage('')
    setIsLoading(true)
    setIsTyping(true)

    // Save user message
    if (currentInterviewId) {
      try {
        await addInterviewMessage({
          interview_id: currentInterviewId,
          role: 'user',
          content: userMessage.content,
          sequence_number: newMessages.length
        })
      } catch (err) {
        console.error('Error saving user message:', err)
      }
    }

    try {
      const processToDocument = `Case Study: ${context.description}`

      const response = await fetch('/api/chat-case-study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: {
            expertName: userProfile?.full_name || 'Expert',
            role: userProfile?.role || '',
            yearsOfExperience: userProfile?.years_of_experience?.toString() || '0',
            processToDocument,
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              setIsTyping(false)
              setMessages([...newMessages, { role: 'assistant', content: assistantMessage }])

              // Save assistant message
              if (currentInterviewId && assistantMessage) {
                try {
                  await addInterviewMessage({
                    interview_id: currentInterviewId,
                    role: 'assistant',
                    content: assistantMessage,
                    sequence_number: newMessages.length + 1
                  })
                } catch (err) {
                  console.error('Error saving assistant message:', err)
                }
              }
              break
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                assistantMessage += parsed.text
                setMessages([...newMessages, { role: 'assistant', content: assistantMessage }])
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Auto-play AI response if enabled
      if (voiceControls.autoPlayEnabled && assistantMessage) {
        await voiceControls.playText(assistantMessage)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Logo - Fixed top left */}
      <div className="fixed top-4 left-4 z-20">
        <Image
          src="/assets/logo/svg/10.svg"
          alt="Tacivo"
          width={162}
          height={162}
        />
      </div>

      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center h-16 pl-12">
            <button
              onClick={() => step === 'welcome' ? router.push('/platform') : setStep('welcome')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {step === 'welcome' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-accent" />
            </div>

            <h1 className="text-4xl font-semibold text-foreground mb-4">
              Hello, {userProfile?.full_name?.split(' ')[0] || 'Expert'}
            </h1>

            <p className="text-lg text-muted-foreground mb-8">
              You hold incredible experience that can help your team grow and thrive.
              By sharing your knowledge, you build your legacy and empower others to succeed.
            </p>

            <button
              onClick={() => setStep('setup')}
              className="px-8 py-4 bg-accent text-accent-foreground rounded-lg font-medium text-lg hover:bg-accent/90 transition-colors inline-flex items-center gap-3"
            >
              <Sparkles className="w-5 h-5" />
              Share Your Experience
            </button>
          </motion.div>
        )}

        {step === 'setup' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="text-3xl font-semibold text-foreground mb-8">
              Let's capture your experience
            </h2>

            <div className="space-y-8">
              {/* Process/Area */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What process or area does this relate to?
                </label>
                <input
                  type="text"
                  value={context.process}
                  onChange={(e) => setContext({ ...context, process: e.target.value })}
                  placeholder="e.g., Product Development, Customer Success, Sales..."
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Experience Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Think about a recent experience in {context.process || 'this area'}
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  It could be a success or even a failure - any experience holds incredible knowledge and lessons to be learned
                </p>
                <input
                  type="text"
                  value={context.title}
                  onChange={(e) => setContext({ ...context, title: e.target.value })}
                  placeholder="Give your experience a title..."
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Briefly describe the situation
                </label>
                <textarea
                  value={context.description}
                  onChange={(e) => setContext({ ...context, description: e.target.value })}
                  placeholder="What happened? What was the context? What was at stake?"
                  rows={6}
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground placeholder:text-muted-foreground resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {context.description.length}/50 characters minimum
                </p>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Upload relevant documents (optional)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop files here, or
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-accent hover:underline text-sm font-medium"
                  >
                    browse files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.pptx,.txt,.md"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    PDF, DOCX, PPTX, TXT, MD (max 10MB each)
                  </p>
                </div>

                {context.uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {context.uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-lg"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground flex-1 truncate">
                          {file.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={startExperience}
                className="w-full px-6 py-4 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
              >
                Start Capturing Experience
              </button>
            </div>
          </motion.div>
        )}

        {step === 'chat' && (
          <div className="fixed inset-0 top-16 flex">
            {/* Left Sidebar - Compact Session Info */}
            <div className="w-64 flex-shrink-0 border-r border-border bg-card/50 p-4 flex flex-col gap-3 overflow-y-auto">
              {/* Header with Help Icon */}
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-medium text-foreground">Session Info</span>
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  title="How this works"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    <span className="text-xs font-medium text-foreground">{Math.round(interviewProgress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${interviewProgress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  {/* Progress instruction text */}
                  {interviewProgress < 100 && (
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Reach 100% to generate your document
                    </p>
                  )}
                </div>
              </div>

              {/* Editable Session Info Cards */}
              <div className="space-y-2">
                <EditableInfoCard
                  label="Area"
                  value={context.process}
                  onChange={(value) => setContext({ ...context, process: value })}
                />
                <EditableInfoCard
                  label="Title"
                  value={context.title}
                  onChange={(value) => setContext({ ...context, title: value })}
                />
                <EditableInfoCard
                  label="Description"
                  value={context.description}
                  onChange={(value) => setContext({ ...context, description: value })}
                  multiline
                />
              </div>

              {/* Voice Controls */}
              <div className="pt-3 border-t border-border/50 mt-auto">
                <div className="flex items-center gap-2">
                  {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                    <button
                      onClick={handlePlayLastMessage}
                      disabled={voiceControls.isPlaying}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-muted/50 text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                      title="Replay last response"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Replay</span>
                    </button>
                  )}
                  <button
                    onClick={voiceControls.toggleAutoPlay}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition-colors ${
                      voiceControls.autoPlayEnabled
                        ? 'bg-accent/10 text-accent'
                        : 'bg-muted/50 text-foreground hover:bg-muted'
                    }`}
                    title={voiceControls.autoPlayEnabled ? 'Auto-play ON' : 'Auto-play OFF'}
                  >
                    {voiceControls.autoPlayEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              {/* Finish Button - Only show at 100% */}
              {interviewProgress >= 100 && (
                <button
                  onClick={handleEndInterview}
                  disabled={isEndingInterview}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generate case study"
                >
                  {isEndingInterview ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Generate Case Study</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Main Chat Area - Full Height */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-6 py-6 space-y-1">
                  <AnimatePresence mode="popLayout">
                    {messages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`group flex gap-3 py-4 px-3 rounded-xl transition-colors ${
                          message.role === 'assistant' ? 'hover:bg-muted/30' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${
                          message.role === 'assistant'
                            ? ''
                            : 'bg-foreground/10 text-foreground'
                        }`}>
                          {message.role === 'assistant' ? (
                            <Image
                              src="/assets/logo/svg/14.svg"
                              alt="Tacivo AI"
                              width={32}
                              height={32}
                              className="w-full h-full"
                            />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">
                              {message.role === 'assistant' ? 'Tacivo AI' : userProfile?.full_name?.split(' ')[0] || 'You'}
                            </span>
                            {/* Replay button for AI messages */}
                            {message.role === 'assistant' && (
                              <button
                                onClick={() => voiceControls.playText(message.content)}
                                disabled={voiceControls.isPlaying}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all disabled:opacity-50"
                                title="Play this message"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="text-[15px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Typing Indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 py-4 px-3"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
                        <Image
                          src="/assets/logo/svg/14.svg"
                          alt="Tacivo AI"
                          width={32}
                          height={32}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 py-2">
                        <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area - Fixed at Bottom */}
              <div className="border-t border-border/50 bg-background">
                <div className="max-w-3xl mx-auto px-6 py-4">
                  <div className="relative flex items-end gap-2 bg-muted/30 border border-border/50 rounded-2xl p-2 focus-within:border-accent/50 focus-within:bg-muted/50 transition-all">
                    {/* Voice Input Button */}
                    <button
                      onClick={async () => {
                        if (voiceControls.isRecording) {
                          try {
                            const transcribedText = await voiceControls.stopRecording()
                            setInputMessage(prev => {
                              const newText = prev ? `${prev} ${transcribedText}` : transcribedText
                              return newText.trim()
                            })
                          } catch (error) {
                            console.error('Failed to transcribe:', error)
                          }
                        } else {
                          await voiceControls.startRecording()
                        }
                      }}
                      disabled={voiceControls.isTranscribing}
                      className={`flex-shrink-0 p-2.5 rounded-xl transition-all ${
                        voiceControls.isRecording
                          ? 'bg-red-500/10 text-red-500'
                          : voiceControls.isTranscribing
                          ? 'bg-accent/10 text-accent'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                      title={voiceControls.isRecording ? 'Stop recording' : 'Voice input'}
                    >
                      {voiceControls.isRecording ? (
                        <StopCircle className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </button>

                    {/* Text Input */}
                    <textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      placeholder={
                        voiceControls.isRecording
                          ? 'Listening...'
                          : voiceControls.isTranscribing
                          ? 'Transcribing...'
                          : 'Share your experience...'
                      }
                      className="flex-1 bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground text-[15px] py-2 px-1"
                      style={{ minHeight: '44px', maxHeight: '120px' }}
                      disabled={isLoading}
                    />

                    {/* Send Button */}
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !inputMessage.trim()}
                      className={`flex-shrink-0 p-2.5 rounded-xl transition-all ${
                        inputMessage.trim()
                          ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                          : 'text-muted-foreground'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 mt-2 text-center">
                    Enter to send · Shift+Enter for new line · Hold T to speak
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        <AnimatePresence>
          {showHelpModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">How This Works</h3>
                    <button
                      onClick={() => setShowHelpModal(false)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4 text-sm text-foreground/80">
                    <div>
                      <h4 className="font-medium text-foreground mb-1">What is this interview?</h4>
                      <p>This is an AI-powered knowledge capture session. You share your expertise through a conversational interview, and we transform it into a structured case study document.</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-1">Who is the AI?</h4>
                      <p>Tacivo is your interview assistant. It asks thoughtful questions to help you articulate your experience clearly and thoroughly.</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-1">What happens at 100%?</h4>
                      <p>Once you reach 100% progress, the &quot;Generate Case Study&quot; button appears. Click it to create a professional document from your interview.</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-1">How long does it take?</h4>
                      <p>A typical interview takes 10-15 exchanges. The depth of conversation ensures your case study captures the nuances and insights that make your experience valuable.</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-1">Tips</h4>
                      <ul className="list-disc list-inside space-y-1 text-foreground/70">
                        <li>Use voice input for natural conversation</li>
                        <li>Share specific examples and outcomes</li>
                        <li>Include challenges and how you overcame them</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-muted/30 border-t border-border">
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="w-full py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default function ExperiencePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ExperiencePageContent />
    </Suspense>
  )
}
