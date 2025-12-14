'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { Mail, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [useMagicLink, setUseMagicLink] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      if (data.session) {
        router.push('/platform')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/platform`,
        }
      })

      if (magicLinkError) throw magicLinkError

      setMagicLinkSent(true)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center h-16 lg:h-20">
            <img src="/assets/logo/svg/13.svg" alt="Tacivo" className="h-20" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              Welcome back
            </h1>
            <p className="text-muted-foreground">
              Sign in to continue to Tacivo
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
            {magicLinkSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Check your email
                </h2>
                <p className="text-muted-foreground mb-6">
                  We've sent a magic link to <strong>{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  Click the link in the email to sign in. The link will expire in 1 hour.
                </p>
                <button
                  onClick={() => {
                    setMagicLinkSent(false)
                    setEmail('')
                  }}
                  className="text-sm text-accent hover:underline"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={useMagicLink ? handleMagicLinkSignIn : handlePasswordSignIn} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition bg-background"
                    placeholder="you@company.com"
                    required
                  />
                </div>

                {!useMagicLink && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition bg-background"
                      placeholder="Enter your password"
                      required
                      minLength={6}
                    />
                  </div>
                )}

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-accent text-accent-foreground font-medium rounded-lg shadow hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    useMagicLink ? 'Sending magic link...' : 'Signing in...'
                  ) : (
                    <>
                      {useMagicLink ? (
                        <>
                          <Mail className="w-5 h-5" />
                          Send magic link
                        </>
                      ) : (
                        <>
                          Sign in
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </>
                  )}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-muted-foreground">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUseMagicLink(!useMagicLink)
                    setError('')
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-accent transition-colors"
                >
                  {useMagicLink ? 'Sign in with password instead' : 'Sign in with magic link instead'}
                </button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Tacivo is invite-only. Contact your administrator for access.
          </p>
        </motion.div>
      </main>
    </div>
  )
}
