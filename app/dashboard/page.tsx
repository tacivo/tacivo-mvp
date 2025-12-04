'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, LogOut, User, FileText, Clock, CheckCircle, Play, Eye, Plus, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getUserStats, getUserInterviews, getUserDocuments, getSharedCompanyDocuments } from '@/lib/supabase/interviews';
import { Profile, Interview, Document } from '@/types/database.types';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sharedDocs, setSharedDocs] = useState<any[]>([]);
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      // Fetch stats and recent data
      const [statsData, interviewsData, documentsData, sharedDocsData] = await Promise.all([
        getUserStats(),
        getUserInterviews(),
        getUserDocuments(),
        getSharedCompanyDocuments()
      ]);

      setStats(statsData);
      setInterviews(interviewsData.slice(0, 5)); // Show only 5 most recent
      setDocuments(documentsData.slice(0, 5)); // Show only 5 most recent
      setSharedDocs(sharedDocsData.slice(0, 3)); // Show only 3 most recent shared
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

  const handleViewAllDocuments = () => {
    router.push('/documents');
  };

  const handleViewSharedDocuments = () => {
    router.push('/documents?shared=true');
  };

  const handleViewDocument = (documentId: string) => {
    router.push(`/documents/${documentId}`);
  };

  const handleResumeInterview = (interviewId: string) => {
    router.push(`/interview?resume=${interviewId}`);
  };

  const handleViewProfile = () => {
    router.push('/profile');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            <img src="/assets/logo/svg/11.svg" alt="Tacivo" className="h-10" />
            <div className="flex items-center gap-3">
              {/* Profile Icon */}
              <button
                onClick={handleViewProfile}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                title="View Profile"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-book-cloth to-book-cloth/70 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden md:block text-sm font-medium text-foreground">
                  {profile.full_name?.split(' ')[0] || 'Profile'}
                </span>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-2">
              Welcome back{profile.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-lg text-muted-foreground">
              Your knowledge base at {profile.company || 'Tacivo'}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-border p-4 text-center hover:shadow-lg transition-shadow">
              <p className="text-3xl font-semibold text-book-cloth mb-1">{stats.totalInterviews}</p>
              <p className="text-sm text-muted-foreground">Interviews</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 text-center hover:shadow-lg transition-shadow">
              <p className="text-3xl font-semibold text-book-cloth mb-1">{stats.completedInterviews}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 text-center hover:shadow-lg transition-shadow">
              <p className="text-3xl font-semibold text-book-cloth mb-1">{stats.totalDocuments}</p>
              <p className="text-sm text-muted-foreground">Documents</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 text-center hover:shadow-lg transition-shadow">
              <p className="text-3xl font-semibold text-book-cloth mb-1">{stats.hoursEstimated.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Hours Saved</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Your Knowledge */}
            <div className="lg:col-span-2 space-y-6">
              {/* Your Documents */}
              <div className="bg-white rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Your Knowledge</h2>
                  <button
                    onClick={handleViewAllDocuments}
                    className="text-sm text-book-cloth hover:text-book-cloth/80 font-medium"
                  >
                    View All →
                  </button>
                </div>

                {documents.length === 0 && interviews.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground mb-4">No knowledge captured yet</p>
                    <button
                      onClick={handleStartInterview}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-book-cloth text-white font-medium rounded-lg shadow hover:shadow-lg transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Start Your First Interview
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Show all interviews */}
                    {interviews.map((interview) => {
                      const isCompleted = interview.status === 'completed';
                      const document = documents.find(d => d.interview_id === interview.id);

                      return (
                        <div
                          key={interview.id}
                          className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-book-cloth hover:shadow-md transition-all cursor-pointer group"
                          onClick={() => isCompleted && document ? handleViewDocument(document.id) : handleResumeInterview(interview.id)}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isCompleted ? 'bg-book-cloth/10' : 'bg-slate-100'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-book-cloth" />
                            ) : (
                              <Clock className="w-5 h-5 text-slate-600" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                isCompleted
                                  ? 'bg-book-cloth/10 text-book-cloth'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {isCompleted ? 'Completed' : 'In Progress'}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                {interview.document_type === 'case-study' ? 'Case Study' : 'Best Practices'}
                              </span>
                              {interview.function_area && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-kraft/20 text-slate-700">
                                  {interview.function_area}
                                </span>
                              )}
                            </div>

                            <h3 className="font-medium text-foreground group-hover:text-book-cloth transition-colors mb-1">
                              {interview.title || interview.description}
                            </h3>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>{profile.full_name || 'You'}</span>
                              <span>•</span>
                              <span>{formatDate(interview.created_at)}</span>
                            </div>
                          </div>

                          {isCompleted ? (
                            <Eye className="w-4 h-4 text-muted-foreground group-hover:text-book-cloth transition-colors flex-shrink-0 mt-1" />
                          ) : (
                            <Play className="w-4 h-4 text-muted-foreground group-hover:text-book-cloth transition-colors flex-shrink-0 mt-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Collective Knowledge Section */}
              <div className="bg-white rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Collective Knowledge</h2>
                  <button
                    onClick={handleViewSharedDocuments}
                    className="text-sm text-book-cloth hover:text-book-cloth/80 font-medium"
                  >
                    View All →
                  </button>
                </div>

                {sharedDocs.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground mb-2">No shared knowledge yet</p>
                    <p className="text-sm text-muted-foreground">
                      Share your documents to help your team grow
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sharedDocs.map((doc) => {
                      const ownerProfile = doc.profiles;
                      const initials = ownerProfile?.full_name
                        ?.split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase() || '??';

                      // Generate color based on name - using Tacivo palette
                      const colors = [
                        'from-book-cloth to-book-cloth/80', // Book Cloth
                        'from-kraft to-kraft/80', // Kraft
                        'from-slate-600 to-slate-700', // Slate
                        'from-book-cloth/70 to-kraft', // Gradient mix
                        'from-slate-500 to-slate-600', // Cloud
                      ];
                      const colorIndex = ownerProfile?.full_name?.charCodeAt(0) % colors.length || 0;

                      return (
                        <div
                          key={doc.id}
                          className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-book-cloth hover:shadow-md transition-all cursor-pointer group"
                          onClick={() => handleViewDocument(doc.id)}
                        >
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm`}>
                            {initials}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-book-cloth/10 text-book-cloth">
                                Shared
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                {doc.document_type === 'case-study' ? 'Case Study' : 'Best Practices'}
                              </span>
                            </div>

                            <h3 className="font-medium text-foreground group-hover:text-book-cloth transition-colors mb-1">
                              {doc.title}
                            </h3>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>{ownerProfile?.full_name || 'Unknown'}</span>
                              <span>•</span>
                              <span>{formatDate(doc.created_at)}</span>
                            </div>
                          </div>

                          <Eye className="w-4 h-4 text-muted-foreground group-hover:text-book-cloth transition-colors flex-shrink-0 mt-1" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              {/* Start Interview Card */}
              <div className="bg-gradient-to-br from-book-cloth to-book-cloth/80 rounded-2xl p-6 text-white shadow-lg">
                <FileText className="w-10 h-10 mb-4 opacity-90" />
                <h2 className="text-xl font-semibold mb-2">
                  Capture Knowledge
                </h2>
                <p className="text-white/90 text-sm mb-6">
                  Start a new AI-powered interview to document your expertise
                </p>
                <button
                  onClick={handleStartInterview}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-book-cloth font-medium rounded-lg shadow hover:shadow-xl transition-all"
                >
                  Start Interview
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Tips */}
              <div className="bg-white rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Quick Tips</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <span className="text-book-cloth font-bold">•</span>
                    <span>Interviews take 15-30 minutes</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-book-cloth font-bold">•</span>
                    <span>Use voice input for faster responses</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-book-cloth font-bold">•</span>
                    <span>Documents are automatically formatted</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-book-cloth font-bold">•</span>
                    <span>Export as PDF or Markdown anytime</span>
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
