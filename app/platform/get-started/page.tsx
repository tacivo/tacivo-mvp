'use client'

import { useRouter } from 'next/navigation'
import { RocketLaunchIcon, MicrophoneIcon, DocumentTextIcon, ShareIcon, SparklesIcon, BookOpenIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function GetStartedPage() {
  const router = useRouter()

  const steps = [
    {
      icon: MicrophoneIcon,
      title: 'Start an Interview',
      description: 'Share your personal experiences through an AI-powered conversation. Document specific projects (case studies) or repeatable processes (best practices).',
      action: 'Start Interview',
      href: '/interview',
      comingSoon: false
    },
    {
      icon: DocumentTextIcon,
      title: 'Review Your Document',
      description: 'AI transforms your conversation into a structured, professional document. Edit and refine before sharing with your team.',
      action: 'View Documents',
      href: '/documents',
      comingSoon: false
    },
    {
      icon: ShareIcon,
      title: 'Share with Your Team',
      description: 'Make your document accessible to colleagues. Your shared experiences help others learn from your successes and avoid pitfalls.',
      action: 'Share Documents',
      href: '/documents',
      comingSoon: false
    },
    {
      icon: SparklesIcon,
      title: 'Browse Team Knowledge',
      description: "Explore experiences shared by other experts in your organization. Learn from your colleagues' real-world insights.",
      action: 'View Experiences',
      href: '/platform/experiences',
      comingSoon: false
    },
    {
      icon: BookOpenIcon,
      title: 'AI-Generated Playbooks',
      description: 'Our AI will analyze patterns across all shared experiences to automatically create actionable playbooks and best-practice frameworks. Transform collective knowledge into structured guidance that accelerates team learning and decision-making.',
      action: 'Coming Soon',
      href: '#',
      comingSoon: true
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-accent/5 to-background">
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent/70 shadow-lg mb-6">
            <RocketLaunchIcon className="w-10 h-10 text-accent-foreground" />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-4 bg-clip-text">
            Get Started with Tacivo
          </h1>
          <div className="space-y-3 max-w-3xl mx-auto">
            <p className="text-xl text-muted-foreground">
              Share your personal experiences and help your team learn from what you've built, solved, and discovered.
            </p>
            <p className="text-base text-muted-foreground">
              Your knowledge is valuable. When you document your real-world experiences, you help colleagues avoid mistakes,
              accelerate their learning, and build on your successes. Every shared experience strengthens your organization's
              collective intelligence.
            </p>
          </div>
        </div>

        {/* Steps Section */}
        <div className="space-y-5">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`group relative bg-card rounded-xl border p-6 transition-all duration-300 ${
                step.comingSoon
                  ? 'border-border/50 opacity-80'
                  : 'border-border hover:border-accent/50 hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              {/* Gradient overlay on hover for active cards */}
              {!step.comingSoon && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              )}

              <div className="relative flex items-start gap-5">
                {/* Step Number */}
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shadow-sm transition-all duration-300 ${
                    step.comingSoon
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-gradient-to-br from-accent to-accent/80 text-accent-foreground group-hover:shadow-md group-hover:scale-105'
                  }`}>
                    {index + 1}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <step.icon className={`w-6 h-6 flex-shrink-0 transition-colors ${
                      step.comingSoon ? 'text-muted-foreground' : 'text-accent'
                    }`} />
                    <h3 className="text-xl font-semibold text-foreground">
                      {step.title}
                    </h3>
                    {step.comingSoon && (
                      <span className="ml-auto px-2.5 py-1 bg-muted/80 text-muted-foreground text-xs font-semibold rounded-full whitespace-nowrap border border-border">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {step.description}
                  </p>
                  {!step.comingSoon ? (
                    <button
                      onClick={() => router.push(step.href)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-semibold hover:bg-accent/90 hover:shadow-md transition-all duration-200"
                    >
                      {step.action}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 text-muted-foreground rounded-lg text-sm font-medium cursor-not-allowed border border-border">
                      <Sparkles className="w-4 h-4" />
                      {step.action}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Why It Matters */}
        <div className="mt-16 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent rounded-2xl border border-accent/20 p-8 shadow-lg">
          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">Why Sharing Your Experience Matters</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4 bg-background/50 rounded-xl p-6 border border-accent/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <UserGroupIcon className="w-5 h-5 text-accent" />
                </div>
                <p className="text-lg font-semibold text-foreground">For Your Team</p>
              </div>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                  <span className="text-accent text-lg mt-0.5">✓</span>
                  <span className="text-sm text-muted-foreground">Learn from your real-world solutions</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-accent text-lg mt-0.5">✓</span>
                  <span className="text-sm text-muted-foreground">Avoid repeating mistakes you've already solved</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-accent text-lg mt-0.5">✓</span>
                  <span className="text-sm text-muted-foreground">Get up to speed faster on projects</span>
                </li>
              </ul>
            </div>
            <div className="space-y-4 bg-background/50 rounded-xl p-6 border border-accent/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-accent" />
                </div>
                <p className="text-lg font-semibold text-foreground">For You</p>
              </div>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                  <span className="text-accent text-lg mt-0.5">✓</span>
                  <span className="text-sm text-muted-foreground">Preserve your knowledge as you move to new challenges</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-accent text-lg mt-0.5">✓</span>
                  <span className="text-sm text-muted-foreground">Reduce repetitive questions from colleagues</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-accent text-lg mt-0.5">✓</span>
                  <span className="text-sm text-muted-foreground">Build your reputation as a subject matter expert</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="mt-8 bg-gradient-to-br from-secondary/50 to-secondary rounded-2xl border border-border p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Tips for Great Knowledge Sharing</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="flex gap-4 items-start bg-background/30 rounded-lg p-4 border border-border/50">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent font-bold text-sm">1</span>
              </div>
              <p className="text-sm text-muted-foreground">Focus on real examples—specific projects and challenges you've faced</p>
            </div>
            <div className="flex gap-4 items-start bg-background/30 rounded-lg p-4 border border-border/50">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent font-bold text-sm">2</span>
              </div>
              <p className="text-sm text-muted-foreground">Include what didn't work—lessons from failures are just as valuable</p>
            </div>
            <div className="flex gap-4 items-start bg-background/30 rounded-lg p-4 border border-border/50">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent font-bold text-sm">3</span>
              </div>
              <p className="text-sm text-muted-foreground">Use voice input for faster, more natural conversations</p>
            </div>
            <div className="flex gap-4 items-start bg-background/30 rounded-lg p-4 border border-border/50">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent font-bold text-sm">4</span>
              </div>
              <p className="text-sm text-muted-foreground">Take breaks—you can pause and resume interviews anytime</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
