'use client'

import { useRouter } from 'next/navigation'
import { User, Users, Plus, PencilLine, ArrowRight } from 'lucide-react'
import { BookOpenIcon } from '@heroicons/react/24/outline'

export default function PlaybooksHubPage() {
  const router = useRouter()

  const items = [
    {
      icon: User,
      title: 'My Playbooks',
      description: 'All playbooks you\'ve created',
      href: '/platform/my-playbooks',
    },
    {
      icon: Users,
      title: 'Shared Playbooks',
      description: 'Playbooks shared across your organization',
      href: '/platform/shared-playbooks',
    },
    {
      icon: Plus,
      title: 'Create New',
      description: 'Generate a new playbook from your experiences',
      href: '/platform/playbooks',
    },
    {
      icon: PencilLine,
      title: 'Update Existing',
      description: 'Update an existing playbook with new experiences',
      href: '/platform/playbooks/update',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      {/* Spacer to match pages with back button */}
      <div className="mb-6 h-6" />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpenIcon className="w-10 h-10 text-accent" />
          <h1 className="text-4xl font-semibold text-foreground">Playbooks</h1>
        </div>
        <p className="text-muted-foreground">
          AI-synthesized guides that find patterns across experiences to create best practices
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => (
          <div
            key={item.href}
            onClick={() => router.push(item.href)}
            className="bg-card rounded-xl border border-border p-6 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <item.icon className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
              {item.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {item.description}
            </p>
            <div className="flex items-center text-accent text-sm font-medium">
              View <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
