'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Upload, X, FileText, Sparkles, Send, Mic, Volume2, Square, FileDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { Profile } from '@/types/database.types'
import { createInterview, addInterviewMessage, updateInterviewStatus, getInterviewMessages, createDocument, getInterview } from '@/lib/supabase/interviews'
import { useVoiceControls } from '@/hooks/useVoiceControls'

type ExperienceContext = {
  process: string
  title: string
  description: string
  uploadedFiles: File[]
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
      // Estimate progress: 10 exchanges = 100%
      const progress = Math.min((messages.length / 20) * 100, 95) // Cap at 95% until completed
      setInterviewProgress(progress)
    }
  }, [messages])

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
      router.push(`/documents/${doc.id}`)
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
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center h-16">
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
          <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
            {/* Header with Progress and Controls */}
            <div className="mb-6 space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Interview Progress</span>
                  <span className="font-medium text-foreground">{Math.round(interviewProgress)}%</span>
                </div>
                <div className="w-full h-2 bg-card border border-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${interviewProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {/* Replay Last Message */}
                  {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                    <button
                      onClick={handlePlayLastMessage}
                      disabled={voiceControls.isPlaying}
                      className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Replay last AI response"
                    >
                      <Volume2 className="w-4 h-4" />
                      {voiceControls.isPlaying ? 'Playing...' : 'Replay'}
                    </button>
                  )}

                  {/* Auto-play Toggle */}
                  <button
                    onClick={voiceControls.toggleAutoPlay}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      voiceControls.autoPlayEnabled
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-card border border-border text-foreground hover:bg-accent/10'
                    }`}
                    title={voiceControls.autoPlayEnabled ? 'Auto-play enabled' : 'Auto-play disabled'}
                  >
                    <Volume2 className="w-4 h-4" />
                    Auto-play {voiceControls.autoPlayEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* End Interview Button */}
                <button
                  onClick={handleEndInterview}
                  disabled={isEndingInterview || messages.length < 5}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground border border-accent rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={messages.length < 5 ? 'Continue the conversation before ending' : 'End interview and generate case study document'}
                >
                  {isEndingInterview ? (
                    <>
                      <div className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                      Generating Document...
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4" />
                      Generate Case Study
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-6 py-4 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-card border border-border text-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] px-6 py-4 rounded-2xl bg-card border border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border pt-6">
              <div className="flex items-end gap-4">
                {/* Microphone Button for Speech-to-Text */}
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
                  className={`px-4 py-3 rounded-2xl font-medium transition-all flex items-center gap-2 h-[48px] disabled:opacity-50 disabled:cursor-not-allowed ${
                    voiceControls.isRecording
                      ? 'bg-accent text-accent-foreground animate-pulse'
                      : voiceControls.isTranscribing
                      ? 'bg-accent/50 text-accent-foreground'
                      : 'bg-card border border-border text-foreground hover:bg-accent/10'
                  }`}
                  title={
                    voiceControls.isRecording
                      ? 'Stop recording'
                      : voiceControls.isTranscribing
                      ? 'Transcribing...'
                      : 'Start voice input'
                  }
                >
                  <Mic className="w-5 h-5" />
                </button>

                <div className="flex-1 bg-card border border-border rounded-2xl px-4 py-2">
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
                        ? 'Recording...'
                        : voiceControls.isTranscribing
                        ? 'Transcribing...'
                        : 'Type your response or use voice input...'
                    }
                    className="w-full bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground"
                    style={{ minHeight: '48px', maxHeight: '144px' }}
                    disabled={isLoading}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-6 py-3 bg-accent text-accent-foreground rounded-2xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-[48px]"
                >
                  <Send className="w-5 h-5" />
                  Send
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Press Enter to send, Shift+Enter for new line • Click mic for voice input
              </p>
            </div>
          </div>
        )}
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
