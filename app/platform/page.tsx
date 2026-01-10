'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, FileText, Clock, CheckCircle, Play, Eye, User, Users, BookOpen, Globe, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getUserStats, getUserInterviews, getUserDocuments, getSharedCompanyDocuments } from '@/lib/supabase/interviews'
import { Profile, Interview, Document } from '@/types/database.types'

type PlaybookWithProfile = {
  id: string
  title: string
  type: string
  created_at: string
  is_shared: boolean
  user_id: string
  profiles?: {
    full_name: string | null
    role: string | null
  }
}

export default function PlatformHomePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [sharedDocs, setSharedDocs] = useState<any[]>([])
  const [playbooks, setPlaybooks] = useState<PlaybookWithProfile[]>([])
  const [stats, setStats] = useState({
    totalInterviews: 0,
    completedInterviews: 0,
    totalDocuments: 0,
    hoursEstimated: 0
  })
  const [isLoading, setIsLoading] = useState(true)

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
        .select(`
          *,
          organization:organizations(name)
        `)
        .eq('id', user.id)
        .single() as { data: Profile & { organization_id: string | null } | null }

      setProfile(profileData)

      // Fetch playbooks (both own and shared from organization)
      const { data: playbooksData } = await (supabase as any)
        .from('playbooks')
        .select(`
          id,
          title,
          type,
          created_at,
          is_shared,
          user_id,
          profiles:user_id (
            full_name,
            role
          )
        `)
        .or(`user_id.eq.${user.id},and(is_shared.eq.true,organization_id.eq.${profileData?.organization_id || 'null'})`)
        .order('created_at', { ascending: false })
        .limit(3)

      // Fetch stats and recent data
      const [statsData, interviewsData, documentsData, sharedDocsData] = await Promise.all([
        getUserStats(),
        getUserInterviews(),
        getUserDocuments(),
        getSharedCompanyDocuments()
      ])

      setStats(statsData)
      setInterviews(interviewsData.slice(0, 5))
      setDocuments(documentsData.slice(0, 5))
      setSharedDocs(sharedDocsData.slice(0, 3))
      setPlaybooks(playbooksData || [])
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

  const getPlaybookTypeLabel = (type: string) => {
    switch (type) {
      case 'sales-playbook': return 'Sales Playbook'
      case 'customer-success-guide': return 'Customer Success'
      case 'operational-procedures': return 'Operations'
      case 'strategic-planning-document': return 'Strategy'
      default: return type
    }
  }

  const handleStartInterview = () => {
    router.push('/interview')
  }

  const handleViewDocument = (documentId: string) => {
    router.push(`/documents/${documentId}`)
  }

  const handleResumeInterview = (interviewId: string) => {
    router.push(`/interview?resume=${interviewId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-semibold text-foreground mb-3">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-lg text-muted-foreground">
            Your knowledge workspace at {(profile as any)?.organization?.name || 'Tacivo'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Main Content - 2 columns */}
          <div className="col-span-2 space-y-8">
            {/* Your Experiences Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-foreground">Your Experiences</h2>
                <button
                  onClick={() => router.push('/platform/sessions/completed')}
                  className="text-sm text-accent hover:underline"
                >
                  View All →
                </button>
              </div>

              {documents.length === 0 && interviews.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">No knowledge captured yet</p>
                  <button
                    onClick={handleStartInterview}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground font-medium rounded-lg hover:bg-accent/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Start Your First Interview
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {interviews.map((interview) => {
                    const isCompleted = interview.status === 'completed'
                    const document = documents.find(d => d.interview_id === interview.id)

                    return (
                      <div
                        key={interview.id}
                        className="bg-card rounded-lg border border-border p-4 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => isCompleted && document ? handleViewDocument(document.id) : handleResumeInterview(interview.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isCompleted ? 'bg-accent/10' : 'bg-muted'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-accent" />
                            ) : (
                              <Clock className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                isCompleted
                                  ? 'bg-accent/10 text-accent'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {isCompleted ? 'Completed' : 'In Progress'}
                              </span>
                              {document?.is_shared ? (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  Shared
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  Private
                                </span>
                              )}
                              {interview.function_area && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground border border-border">
                                  {interview.function_area}
                                </span>
                              )}
                            </div>

                            <h3 className="font-medium text-foreground mb-1 group-hover:text-accent">
                              {interview.title || interview.description}
                            </h3>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>{profile?.full_name || 'You'}</span>
                              <span>•</span>
                              <span>{formatDate(interview.created_at)}</span>
                            </div>
                          </div>

                          {isCompleted ? (
                            <Eye className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
                          ) : (
                            <Play className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Recently Shared Experiences Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-foreground">Recently Shared Experiences</h2>
                <button
                  onClick={() => router.push('/platform/experiences')}
                  className="text-sm text-accent hover:underline"
                >
                  View All →
                </button>
              </div>

              {sharedDocs.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-2">No shared knowledge yet</p>
                  <p className="text-sm text-muted-foreground">
                    Share your documents to help your team grow
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedDocs.map((doc) => {
                    const ownerProfile = doc.profiles
                    const initials = ownerProfile?.full_name
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase() || '??'

                    const colors = [
                      'from-accent to-accent/80',
                      'from-primary to-primary/80',
                      'from-muted to-muted/80',
                    ]
                    const colorIndex = ownerProfile?.full_name?.charCodeAt(0) % colors.length || 0

                    // Get the interview to access function_area
                    const interview = (doc as any).interviews

                    return (
                      <div
                        key={doc.id}
                        className="bg-card rounded-lg border border-border p-4 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => handleViewDocument(doc.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm`}>
                            {initials}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                Shared
                              </span>
                              {interview?.function_area && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground border border-border">
                                  {interview.function_area}
                                </span>
                              )}
                            </div>

                            <h3 className="font-medium text-foreground mb-1 group-hover:text-accent">
                              {doc.title}
                            </h3>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>{ownerProfile?.full_name || 'Unknown'}</span>
                              <span>•</span>
                              <span>{formatDate(doc.created_at)}</span>
                            </div>
                          </div>

                          <Eye className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Playbooks Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-foreground">Playbooks</h2>
                <button
                  onClick={() => router.push('/platform/shared-playbooks')}
                  className="text-sm text-accent hover:underline"
                >
                  View All →
                </button>
              </div>

              {playbooks.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-2">No playbooks created yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create playbooks from your experiences
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {playbooks.map((playbook) => (
                    <div
                      key={playbook.id}
                      className="bg-card rounded-lg border border-border p-4 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => router.push('/platform/shared-playbooks')}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-5 h-5 text-accent" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                              {getPlaybookTypeLabel(playbook.type)}
                            </span>
                            {playbook.is_shared ? (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
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

                          <h3 className="font-medium text-foreground mb-1 group-hover:text-accent">
                            {playbook.title}
                          </h3>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{playbook.profiles?.full_name || profile?.full_name || 'You'}</span>
                            <span>•</span>
                            <span>{formatDate(playbook.created_at)}</span>
                          </div>
                        </div>

                        <Eye className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Sidebar - Actions */}
          <div className="space-y-6">
            {/* Start Interview Card */}
            <div className="bg-card rounded-xl border border-border p-6">
              <FileText className="w-10 h-10 mb-4 text-accent" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                Capture Knowledge
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                Start a new AI-powered interview to document your expertise
              </p>

              {/* Quick Tips */}
              <div className="mb-6">
                <h4 className="font-semibold text-foreground mb-3 text-sm">Quick Tips</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <span className="text-accent font-bold">•</span>
                    <span>Interviews take 15-30 minutes</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-accent font-bold">•</span>
                    <span>Use voice input for faster responses</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-accent font-bold">•</span>
                    <span>Documents are automatically formatted</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-accent font-bold">•</span>
                    <span>Export as PDF or Markdown anytime</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleStartInterview}
                className="w-full px-6 py-3 bg-accent text-accent-foreground font-medium rounded-lg hover:bg-accent/90 transition-all"
              >
                Start Interview
              </button>
            </div>

            {/* Create Playbook Card */}
            <div className="bg-card rounded-xl border border-border p-6">
              <BookOpen className="w-10 h-10 mb-4 text-accent" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                Create Playbook
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                Synthesize insights from multiple experiences into actionable guides
              </p>
              <button
                onClick={() => router.push('/platform/playbooks')}
                className="w-full px-6 py-3 bg-accent text-accent-foreground font-medium rounded-lg hover:bg-accent/90 transition-all"
              >
                Create Playbook
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
