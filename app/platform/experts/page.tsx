'use client'

import { UserGroupIcon } from '@heroicons/react/24/outline'

export default function ExpertsPage() {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-foreground mb-2">Experts</h1>
        <p className="text-muted-foreground">
          Subject matter experts within your organization
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <UserGroupIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Discover who knows what in your organization. Connect with experts
          and tap into their knowledge and experience.
        </p>
      </div>
    </div>
  )
}
