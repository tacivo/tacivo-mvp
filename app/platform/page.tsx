'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, FileText, Clock, CheckCircle, Play, Eye, User, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getUserStats, getUserInterviews, getUserDocuments, getSharedCompanyDocuments } from '@/lib/supabase/interviews'
import { Profile, Interview, Document } from '@/types/database.types'

export default function PlatformHomePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [sharedDocs, setSharedDocs] = useState<any[]>([])
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
        .single()

      setProfile(profileData)

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

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
            <p className="text-3xl font-semibold text-foreground mb-1">{stats.totalInterviews}</p>
            <p className="text-sm text-muted-foreground">Interviews</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
            <p className="text-3xl font-semibold text-foreground mb-1">{stats.completedInterviews}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
            <p className="text-3xl font-semibold text-foreground mb-1">{stats.totalDocuments}</p>
            <p className="text-sm text-muted-foreground">Documents</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
            <p className="text-3xl font-semibold text-foreground mb-1">{stats.hoursEstimated.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Hours Saved</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Main Content - 2 columns */}
          <div className="col-span-2 space-y-8">
            {/* Your Knowledge Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-foreground">Your Knowledge</h2>
                <button
                  onClick={() => router.push('/documents')}
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
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                                {interview.document_type === 'case-study' ? 'Case Study' : 'Best Practices'}
                              </span>
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

            {/* Collective Knowledge Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-foreground">Collective Knowledge</h2>
                <button
                  onClick={() => router.push('/documents?shared=true')}
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
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent">
                                Shared
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                                {doc.document_type === 'case-study' ? 'Case Study' : 'Best Practices'}
                              </span>
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
          </div>

          {/* Right Sidebar - Actions */}
          <div className="space-y-6">
            {/* Start Interview Card */}
            <div className="bg-accent rounded-xl p-6 text-accent-foreground">
              <FileText className="w-10 h-10 mb-4 opacity-90" />
              <h3 className="text-lg font-semibold mb-2">
                Capture Knowledge
              </h3>
              <p className="text-accent-foreground/90 text-sm mb-6">
                Start a new AI-powered interview to document your expertise
              </p>
              <button
                onClick={handleStartInterview}
                className="w-full px-6 py-3 bg-background text-foreground font-medium rounded-lg hover:bg-background/90 transition-all"
              >
                Start Interview
              </button>
            </div>

            {/* Quick Tips */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Quick Tips</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
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
          </div>
        </div>
      </motion.div>
    </div>
  )
}
