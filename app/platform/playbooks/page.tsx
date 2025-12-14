'use client'

import { BookOpenIcon } from '@heroicons/react/24/outline'

export default function PlaybooksPage() {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-foreground mb-2">Playbooks</h1>
        <p className="text-muted-foreground">
          Synthesized patterns and best practices from your organization
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <BookOpenIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          AI-generated playbooks will synthesize patterns from multiple experiences,
          creating actionable frameworks for your team.
        </p>
      </div>
    </div>
  )
}
