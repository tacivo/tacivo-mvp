'use client'

import { SparklesIcon, ChatBubbleLeftRightIcon, BeakerIcon, LightBulbIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

export default function TacivoAIPage() {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <SparklesIcon className="w-10 h-10 text-accent" />
          <h1 className="text-4xl font-semibold text-foreground">Tacivo AI</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          AI-powered knowledge capture and synthesis for your organization
        </p>
      </div>

      {/* Main AI Features */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="bg-card rounded-xl border border-border p-8">
          <ChatBubbleLeftRightIcon className="w-10 h-10 text-accent mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-3">
            Conversational Interviews
          </h3>
          <p className="text-muted-foreground">
            Our AI conducts natural, adaptive interviews that extract deep insights from your experiences.
            It asks follow-up questions and explores interesting details automatically.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-8">
          <DocumentTextIcon className="w-10 h-10 text-accent mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-3">
            Automatic Documentation
          </h3>
          <p className="text-muted-foreground">
            Conversations are transformed into professional, well-structured documents with proper formatting,
            sections, and key insights highlighted.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-8">
          <LightBulbIcon className="w-10 h-10 text-accent mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-3">
            Pattern Recognition
          </h3>
          <p className="text-muted-foreground">
            AI identifies common patterns across multiple experiences to create synthesized playbooks
            and best practice frameworks for your team.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-8">
          <BeakerIcon className="w-10 h-10 text-accent mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-3">
            Knowledge Discovery
          </h3>
          <p className="text-muted-foreground">
            Search and explore your organization's collective knowledge. Ask questions and get answers
            grounded in real team experiences.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-accent rounded-xl p-8 text-accent-foreground mb-12">
        <h2 className="text-2xl font-semibold mb-6">How Tacivo AI Works</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-foreground/20 flex items-center justify-center font-semibold">
              1
            </div>
            <div>
              <h4 className="font-semibold mb-1">Capture</h4>
              <p className="text-accent-foreground/90 text-sm">
                AI conducts a conversational interview, asking relevant follow-up questions to extract deep insights
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-foreground/20 flex items-center justify-center font-semibold">
              2
            </div>
            <div>
              <h4 className="font-semibold mb-1">Structure</h4>
              <p className="text-accent-foreground/90 text-sm">
                Your knowledge is automatically organized into clear, professional documents with proper formatting
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-foreground/20 flex items-center justify-center font-semibold">
              3
            </div>
            <div>
              <h4 className="font-semibold mb-1">Synthesize</h4>
              <p className="text-accent-foreground/90 text-sm">
                AI identifies patterns across experiences to create actionable playbooks and frameworks
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-foreground/20 flex items-center justify-center font-semibold">
              4
            </div>
            <div>
              <h4 className="font-semibold mb-1">Share</h4>
              <p className="text-accent-foreground/90 text-sm">
                Knowledge becomes searchable and accessible across your organization
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-secondary rounded-xl border border-border p-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Coming Soon</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex gap-3">
            <span className="text-accent font-bold">•</span>
            <p className="text-muted-foreground">AI-powered search across all your organization's knowledge</p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold">•</span>
            <p className="text-muted-foreground">Automatic playbook generation from multiple experiences</p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold">•</span>
            <p className="text-muted-foreground">Expert recommendation based on topic and expertise</p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold">•</span>
            <p className="text-muted-foreground">Knowledge graph visualization of interconnected insights</p>
          </div>
        </div>
      </div>
    </div>
  )
}
