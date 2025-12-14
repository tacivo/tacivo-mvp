'use client'

import { LightBulbIcon } from '@heroicons/react/24/outline'

export default function ExperiencesPage() {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-foreground mb-2">Experiences</h1>
        <p className="text-muted-foreground">
          Collective knowledge from your team's experiences
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <LightBulbIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          This section will showcase collective experiences and insights from your team.
          Share your completed interviews to build your organization's knowledge base.
        </p>
      </div>
    </div>
  )
}
