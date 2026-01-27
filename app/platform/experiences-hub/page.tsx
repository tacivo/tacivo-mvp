'use client'

import { useRouter } from 'next/navigation'
import { User, Users, Plus, ArrowRight } from 'lucide-react'
import { LightBulbIcon } from '@heroicons/react/24/outline'

export default function ExperiencesHubPage() {
  const router = useRouter()

  const items = [
    {
      icon: User,
      title: 'My Experiences',
      description: 'Your personal experiences structured',
      href: '/platform/sessions/completed',
    },
    {
      icon: Users,
      title: 'Shared Experiences',
      description: 'Collective experiences shared by your team',
      href: '/platform/experiences',
    },
    {
      icon: Plus,
      title: 'Add New Experience',
      description: 'Start a new AI-powered interview to capture your knowledge',
      href: '/interview',
      accent: true,
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <LightBulbIcon className="w-10 h-10 text-accent" />
          <h1 className="text-4xl font-semibold text-foreground">Experiences</h1>
        </div>
        <p className="text-muted-foreground">
          Access your personal experiences and team-shared knowledge
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => (
          <div
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`rounded-xl border p-6 hover:shadow-md transition-all cursor-pointer group ${
              item.accent
                ? 'bg-accent/5 border-accent/30 hover:border-accent'
                : 'bg-card border-border hover:border-accent/40'
            }`}
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
              item.accent ? 'bg-accent/20' : 'bg-accent/10'
            }`}>
              <item.icon className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
              {item.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {item.description}
            </p>
            <div className="flex items-center text-accent text-sm font-medium">
              {item.accent ? 'Start' : 'View'} <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
