'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Mail, Briefcase, Award, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Profile } from '@/types/database.types';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-book-cloth border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ivory-light via-background to-ivory-light">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="flex items-center h-16 lg:h-20">
            <button
              onClick={() => router.push('/platform')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Platform
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Profile Header */}
          <div className="text-center mb-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-book-cloth to-book-cloth/70 rounded-full flex items-center justify-center shadow-lg">
              <User className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-serif text-slate-900 mb-2">
              {profile.full_name || 'Your Profile'}
            </h1>
            <p className="text-slate-600">
              {profile.role || 'Expert'} {profile.company ? `at ${profile.company}` : ''}
            </p>
          </div>

          {/* Profile Information */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Profile Information</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Full Name */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-book-cloth/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-book-cloth" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                  <p className="text-foreground font-medium">{profile.full_name || 'Not set'}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-book-cloth/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-book-cloth" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="text-foreground font-medium break-all">{profile.email}</p>
                </div>
              </div>

              {/* Company */}
              {profile.company && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-book-cloth/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-book-cloth" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">Company</p>
                    <p className="text-foreground font-medium">{profile.company}</p>
                  </div>
                </div>
              )}

              {/* Role */}
              {profile.role && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-book-cloth/10 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-book-cloth" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">Role</p>
                    <p className="text-foreground font-medium">{profile.role}</p>
                  </div>
                </div>
              )}

              {/* Years of Experience */}
              {profile.years_of_experience !== undefined && profile.years_of_experience !== null && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-book-cloth/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-book-cloth" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">Years of Experience</p>
                    <p className="text-foreground font-medium">
                      {profile.years_of_experience} {profile.years_of_experience === 1 ? 'year' : 'years'}
                    </p>
                  </div>
                </div>
              )}

              {/* Member Since */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-book-cloth/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-book-cloth" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                  <p className="text-foreground font-medium">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
