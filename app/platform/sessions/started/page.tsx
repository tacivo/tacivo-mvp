'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Play, User } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getUserInterviews } from '@/lib/supabase/interviews'
import { Interview, Profile } from '@/types/database.types'

export default function StartedSessionsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
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
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      const interviewsData = await getUserInterviews()
      const startedInterviews = interviewsData.filter(i => i.status !== 'completed')
      setInterviews(startedInterviews)
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
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
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
    <div className="max-w-5xl mx-auto px-8 py-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-foreground mb-2">Started Sessions</h1>
        <p className="text-muted-foreground">
          Continue your in-progress interviews
        </p>
      </div>

      {/* Sessions List */}
      {interviews.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-2">No started sessions</p>
          <p className="text-sm text-muted-foreground">
            Start a new interview from the home page
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {interviews.map((interview) => (
            <div
              key={interview.id}
              className="bg-card rounded-lg border border-border p-6 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => handleResumeInterview(interview.id)}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                      In Progress
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

                  <h3 className="text-lg font-medium text-foreground mb-2 group-hover:text-accent">
                    {interview.title || interview.description}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{profile?.full_name || 'You'}</span>
                    <span>•</span>
                    <span>Started {formatDate(interview.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleResumeInterview(interview.id)
                    }}
                    className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
