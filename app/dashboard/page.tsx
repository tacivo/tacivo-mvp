'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, LogOut, User, Briefcase, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getUserStats } from '@/lib/supabase/interviews';
import { Profile } from '@/types/database.types';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    totalInterviews: 0,
    completedInterviews: 0,
    totalDocuments: 0,
    hoursEstimated: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      // Fetch user statistics
      const statsData = await getUserStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleStartInterview = () => {
    router.push('/interview');
  };

  const handleViewDocuments = () => {
    router.push('/documents');
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-book-cloth border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            <img src="/assets/logo/svg/13.svg" alt="Tacivo" className="h-20" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
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
          {/* Welcome Section */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-3">
              Welcome back{profile.full_name ? `, ${profile.full_name}` : ''}
            </h1>
            <p className="text-lg text-muted-foreground">
              Ready to capture and share your expertise?
            </p>
          </div>

          {/* User Info Card */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Your Profile
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 rounded-lg bg-book-cloth/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-book-cloth" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="text-foreground font-medium">{profile.email}</p>
                </div>
              </div>
              {profile.company && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-book-cloth/10 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-book-cloth" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Company</p>
                    <p className="text-foreground font-medium">{profile.company}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Start Interview Card */}
            <div className="bg-gradient-to-br from-book-cloth/5 to-book-cloth/10 rounded-2xl border border-book-cloth/20 p-6 text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Start a New Interview
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Create case studies or best practice guides in 15 minutes
              </p>
              <button
                onClick={handleStartInterview}
                className="inline-flex items-center gap-2 px-6 py-3 bg-book-cloth text-white font-medium rounded-lg shadow-lg hover:shadow-xl hover:bg-book-cloth/90 transition-all"
              >
                Start Interview
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* View Documents Card */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-border p-6 text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Your Documents
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                View and manage your generated documents
              </p>
              <button
                onClick={handleViewDocuments}
                className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-lg shadow hover:shadow-lg transition-all"
              >
                View Documents
                <FileText className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-semibold text-foreground mb-1">{stats.totalInterviews}</p>
              <p className="text-sm text-muted-foreground">Total Interviews</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-semibold text-foreground mb-1">{stats.completedInterviews}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-semibold text-foreground mb-1">{stats.totalDocuments}</p>
              <p className="text-sm text-muted-foreground">Documents</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-semibold text-foreground mb-1">{stats.hoursEstimated.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Hours Saved</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
