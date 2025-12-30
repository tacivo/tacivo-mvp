'use client'

import { SparklesIcon, ChatBubbleLeftRightIcon, BeakerIcon, LightBulbIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

export default function TacivoAIPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-accent/5 to-background">
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent/70 shadow-lg mb-6">
            <SparklesIcon className="w-10 h-10 text-accent-foreground" />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-4">Tacivo AI</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered knowledge capture and synthesis for your organization
          </p>
        </div>

        {/* Main AI Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="group relative bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-8 hover:border-accent/30 hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="relative">
              <ChatBubbleLeftRightIcon className="w-12 h-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Conversational Interviews
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Our AI conducts natural, adaptive interviews that extract deep insights from your experiences.
                It asks follow-up questions and explores interesting details automatically.
              </p>
            </div>
          </div>

          <div className="group relative bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-8 hover:border-accent/30 hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="relative">
              <DocumentTextIcon className="w-12 h-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Automatic Documentation
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Conversations are transformed into professional, well-structured documents with proper formatting,
                sections, and key insights highlighted.
              </p>
            </div>
          </div>

          <div className="group relative bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-8 hover:border-accent/30 hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="relative">
              <LightBulbIcon className="w-12 h-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Pattern Recognition
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                AI identifies common patterns across multiple experiences to create synthesized playbooks
                and best practice frameworks for your team.
              </p>
            </div>
          </div>

          <div className="group relative bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-8 hover:border-accent/30 hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="relative">
              <BeakerIcon className="w-12 h-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Knowledge Discovery
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Search and explore your organization's collective knowledge. Ask questions and get answers
                grounded in real team experiences.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-br from-accent/15 via-accent/10 to-accent/5 backdrop-blur-sm rounded-2xl border border-accent/30 p-10 mb-12 shadow-lg">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">How Tacivo AI Works</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg shadow-md">
                1
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2 text-lg">Capture</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  AI conducts a conversational interview, asking relevant follow-up questions to extract deep insights
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg shadow-md">
                2
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2 text-lg">Structure</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your knowledge is automatically organized into clear, professional documents with proper formatting
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg shadow-md">
                3
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2 text-lg">Synthesize</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  AI identifies patterns across experiences to create actionable playbooks and frameworks
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg shadow-md">
                4
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2 text-lg">Share</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Knowledge becomes searchable and accessible across your organization
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="bg-card/30 backdrop-blur-sm rounded-2xl border border-border/50 p-10 shadow-lg">
          <h3 className="text-2xl font-bold text-foreground mb-6">Coming Soon</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
              <p className="text-muted-foreground">AI-powered search across all your organization's knowledge</p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
              <p className="text-muted-foreground">Automatic playbook generation from multiple experiences</p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
              <p className="text-muted-foreground">Expert recommendation based on topic and expertise</p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
              <p className="text-muted-foreground">Knowledge graph visualization of interconnected insights</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
