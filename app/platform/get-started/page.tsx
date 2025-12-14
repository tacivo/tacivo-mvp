'use client'

import { useRouter } from 'next/navigation'
import { RocketLaunchIcon, MicrophoneIcon, DocumentTextIcon, ShareIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { ArrowRight } from 'lucide-react'

export default function GetStartedPage() {
  const router = useRouter()

  const steps = [
    {
      icon: MicrophoneIcon,
      title: 'Start an Interview',
      description: 'Begin capturing your knowledge with our AI-powered interview process. Choose between case studies or best practices.',
      action: 'Start Interview',
      href: '/interview'
    },
    {
      icon: DocumentTextIcon,
      title: 'Generate Documents',
      description: 'Our AI automatically transforms your conversation into beautifully formatted, professional documents.',
      action: 'View Documents',
      href: '/documents'
    },
    {
      icon: ShareIcon,
      title: 'Share with Your Team',
      description: 'Make your knowledge accessible to colleagues. Build a collective knowledge base for your organization.',
      action: 'Coming Soon',
      href: '#'
    },
    {
      icon: SparklesIcon,
      title: 'Generate Playbooks',
      description: 'AI synthesizes patterns across experiences to create actionable playbooks and frameworks.',
      action: 'Coming Soon',
      href: '#'
    }
  ]

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <RocketLaunchIcon className="w-10 h-10 text-accent" />
          <h1 className="text-4xl font-semibold text-foreground">Get Started with Tacivo</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Transform your expertise into structured knowledge in four simple steps
        </p>
      </div>

      <div className="space-y-6">
        {steps.map((step, index) => (
          <div
            key={index}
            className="bg-card rounded-xl border border-border p-8 hover:border-accent/40 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-6">
              {/* Step Number */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-accent text-accent-foreground flex items-center justify-center font-semibold text-lg">
                  {index + 1}
                </div>
              </div>

              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                <step.icon className="w-8 h-8 text-accent" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {step.description}
                </p>
                {step.href !== '#' ? (
                  <button
                    onClick={() => router.push(step.href)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
                  >
                    {step.action}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg font-medium">
                    {step.action}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Tips */}
      <div className="mt-12 bg-secondary rounded-xl border border-border p-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Pro Tips</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex gap-3">
            <span className="text-accent font-bold">•</span>
            <p className="text-muted-foreground">Use voice input for faster, more natural responses during interviews</p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold">•</span>
            <p className="text-muted-foreground">Case studies work best for specific projects or challenges</p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold">•</span>
            <p className="text-muted-foreground">Best practices capture repeatable processes and frameworks</p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold">•</span>
            <p className="text-muted-foreground">You can pause and resume interviews anytime</p>
          </div>
        </div>
      </div>
    </div>
  )
}
