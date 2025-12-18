'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Building2,
  Users,
  UserPlus,
  Award,
  BookOpen,
  FileText,
  CheckCircle2,
  ArrowRight,
  Target,
  Lightbulb,
  Shield
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface SetupStep {
  id: string
  title: string
  description: string
  icon: any
  action: string
  href: string
  completed: boolean
}

export default function AdminGetStartedPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [organizationName, setOrganizationName] = useState('')
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([])

  useEffect(() => {
    loadSetupProgress()
  }, [])

  async function loadSetupProgress() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get user's profile and organization
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          is_admin,
          organization:organizations(
            id,
            name
          )
        `)
        .eq('id', user.id)
        .single() as { data: any }

      if (!profile?.is_admin) {
        router.push('/platform')
        return
      }

      const orgId = profile.organization?.id
      const orgName = profile.organization?.name || 'Your Organization'
      setOrganizationName(orgName)

      // Check setup progress
      const [
        { count: expertCount },
        { count: memberCount },
        { count: documentCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_expert', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('documents').select('*', { count: 'exact', head: true }).eq('is_shared', true)
      ])

      const steps: SetupStep[] = [
        {
          id: 'organization',
          title: 'Set up your organization',
          description: 'Customize your organization name and settings',
          icon: Building2,
          action: 'Edit Organization',
          href: '/platform/admin',
          completed: !!orgName && orgName !== 'Your Organization'
        },
        {
          id: 'experts',
          title: 'Invite subject matter experts',
          description: 'Add team members who will share their knowledge and expertise',
          icon: Award,
          action: 'Invite Experts',
          href: '/platform/admin/invitations',
          completed: (expertCount || 0) > 0
        },
        {
          id: 'members',
          title: 'Invite team members',
          description: 'Add people who will benefit from your collective knowledge',
          icon: Users,
          action: 'Invite Members',
          href: '/platform/admin/invitations',
          completed: (memberCount || 0) > 2
        },
        {
          id: 'admin-expert',
          title: 'Lead by example',
          description: 'As an admin, share your own knowledge and experiences to inspire your team and demonstrate the value of knowledge sharing',
          icon: UserPlus,
          action: 'Get Started',
          href: '/platform/get-started',
          completed: false
        },
        {
          id: 'knowledge',
          title: 'View shared experiences',
          description: 'Browse the knowledge base as experts share their experiences',
          icon: BookOpen,
          action: 'View Experiences',
          href: '/platform/experiences',
          completed: (documentCount || 0) > 0
        }
      ]

      setSetupSteps(steps)
    } catch (error) {
      console.error('Error loading setup progress:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const completedSteps = setupSteps.filter(step => step.completed).length
  const progressPercentage = (completedSteps / setupSteps.length) * 100

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
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-accent" />
            <h1 className="text-4xl font-semibold text-foreground">Admin Setup Guide</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Get your organization up and running on Tacivo
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">
              Setup Progress: {completedSteps} of {setupSteps.length} completed
            </p>
            <p className="text-sm text-muted-foreground">{Math.round(progressPercentage)}%</p>
          </div>
          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-accent to-accent/80"
            />
          </div>
        </div>

        {/* Setup Steps */}
        <div className="space-y-4 mb-12">
          {setupSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`bg-card rounded-lg border p-5 transition-all ${
                step.completed
                  ? 'border-accent/40 shadow-sm'
                  : 'border-border hover:border-accent/20 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Step Icon */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      step.completed
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                    {step.completed && (
                      <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded-full whitespace-nowrap">
                        Completed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                  <button
                    onClick={() => router.push(step.href)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    {step.action}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Understanding Experts */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Award className="w-6 h-6 text-accent" />
              <h3 className="text-lg font-semibold text-foreground">What are Experts?</h3>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Experts are team members with specialized knowledge and experience that should be captured and shared with the organization.
              </p>
              <div className="space-y-2">
                <p className="font-medium text-foreground">Ideal candidates:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Senior team members with years of experience</li>
                  <li>Subject matter experts in specific domains</li>
                  <li>People who have solved complex problems</li>
                  <li>Those with unique processes or workflows</li>
                </ul>
              </div>
            </div>
          </div>

          {/* What Experts Do */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-accent" />
              <h3 className="text-lg font-semibold text-foreground">What Experts Do</h3>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Experts participate in AI-powered interviews to document their knowledge and create valuable resources for the team.
              </p>
              <div className="space-y-2">
                <p className="font-medium text-foreground">Expert activities:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Complete 15-30 minute knowledge capture interviews</li>
                  <li>Share case studies and best practices</li>
                  <li>Document processes and workflows</li>
                  <li>Review and share their knowledge with the team</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Sections Overview */}
        <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="w-8 h-8 text-accent" />
            <h3 className="text-2xl font-semibold text-foreground">Platform Sections</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Private Section */}
            <div className="bg-background/80 rounded-lg p-5">
              <h4 className="font-semibold text-foreground mb-2">Private</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Personal workspace for individual knowledge capture
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Started sessions</li>
                <li>• Completed sessions</li>
                <li>• Draft documents</li>
              </ul>
            </div>

            {/* Collective Section */}
            <div className="bg-background/80 rounded-lg p-5">
              <h4 className="font-semibold text-foreground mb-2">Collective</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Shared knowledge base accessible to all team members
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Experiences (shared documents)</li>
                <li>• Playbooks (best practices)</li>
                <li>• Experts directory</li>
              </ul>
            </div>

            {/* Admin Section */}
            <div className="bg-background/80 rounded-lg p-5">
              <h4 className="font-semibold text-foreground mb-2">Admin</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Organization management and configuration
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Organization settings</li>
                <li>• User invitations</li>
                <li>• Member management</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Next Steps CTA */}
        {completedSteps === setupSteps.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 bg-accent rounded-xl p-8 text-accent-foreground text-center"
          >
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h3 className="text-2xl font-semibold mb-3">Setup Complete!</h3>
            <p className="text-accent-foreground/90 mb-6 max-w-2xl mx-auto">
              You've completed all the initial setup steps. Your organization is ready to start capturing and sharing knowledge.
            </p>
            <button
              onClick={() => router.push('/platform')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-background text-foreground font-medium rounded-lg hover:bg-background/90 transition-colors"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
