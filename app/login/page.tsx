'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign up
        console.log('Starting signup with:', { email, fullName, company });

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
              company: company,
              role: role,
              years_of_experience: parseInt(yearsOfExperience) || 0,
            }
          }
        });

        console.log('Signup response:', { authData, signUpError });

        if (signUpError) {
          console.error('Signup error:', signUpError);
          throw signUpError;
        }

        if (authData.user) {
          console.log('User created:', authData.user.id);

          // Wait a moment for the trigger to create the profile
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Update profile with additional info
          try {
            console.log('Attempting to update profile...');
            const { error: profileError } = await supabase
              .from('profiles')
              // @ts-ignore - Profile update type issue
              .update({
                full_name: fullName,
                company: company,
                role: role,
                years_of_experience: parseInt(yearsOfExperience) || 0,
              })
              .eq('id', authData.user.id);

            if (profileError) {
              console.error('Profile update error:', profileError);
              // Don't throw - profile might not exist yet, which is okay
            } else {
              console.log('Profile updated successfully');
            }
          } catch (profileErr) {
            console.error('Profile update failed:', profileErr);
            // Don't throw - this is not critical
          }

          // Check if email confirmation is required
          if (authData.session) {
            console.log('Session created, redirecting to dashboard');
            setSuccessMessage('Account created successfully! Redirecting...');
            setTimeout(() => router.push('/dashboard'), 1000);
          } else {
            console.log('No session - email confirmation required');
            setSuccessMessage('Account created! Please check your email to confirm your account.');
            setIsLoading(false);
          }
        } else {
          console.log('No user in response');
          throw new Error('Account creation failed - no user returned');
        }
      } else {
        // Sign in
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (data.session) {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsLoading(false);
    }
  };

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
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-muted-foreground">
              {isSignUp ? 'Start capturing your expertise' : 'Sign in to continue to Tacivo Interview'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && (
                <>
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-foreground mb-2">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-book-cloth focus:border-transparent outline-none transition bg-background"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-foreground mb-2">
                      Company
                    </label>
                    <input
                      id="company"
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-book-cloth focus:border-transparent outline-none transition bg-background"
                      placeholder="Acme Inc."
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-foreground mb-2">
                      Your Role/Title
                    </label>
                    <input
                      id="role"
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-book-cloth focus:border-transparent outline-none transition bg-background"
                      placeholder="e.g., Senior Sales Manager"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="yearsOfExperience" className="block text-sm font-medium text-foreground mb-2">
                      Years of Experience
                    </label>
                    <input
                      id="yearsOfExperience"
                      type="number"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-book-cloth focus:border-transparent outline-none transition bg-background"
                      placeholder="e.g., 10"
                      min="0"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-book-cloth focus:border-transparent outline-none transition bg-background"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-book-cloth focus:border-transparent outline-none transition bg-background"
                  placeholder={isSignUp ? "At least 6 characters" : "Enter your password"}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 bg-book-cloth text-white font-medium rounded-lg shadow hover:bg-book-cloth/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create account' : 'Sign in')}
              </button>
            </form>

            {!isSignUp && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-book-cloth transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccessMessage('');
              }}
              className="text-book-cloth hover:underline font-medium"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
