'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Clock, CheckCircle, Eye, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getUserInterviews, getUserDocuments, deleteInterview } from '@/lib/supabase/interviews';
import { Interview, Document } from '@/types/database.types';

export default function DocumentsPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed'>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const [interviewsData, documentsData] = await Promise.all([
        getUserInterviews(),
        getUserDocuments()
      ]);

      setInterviews(interviewsData);
      setDocuments(documentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleResumeInterview = (interviewId: string) => {
    // For now, just redirect to interview page
    // In the future, we can load the interview messages
    router.push(`/interview?resume=${interviewId}`);
  };

  const handleViewDocument = (documentId: string) => {
    router.push(`/documents/${documentId}`);
  };

  const handleDeleteInterview = async (interviewId: string) => {
    if (!confirm('Are you sure you want to delete this interview? This cannot be undone.')) {
      return;
    }

    try {
      await deleteInterview(interviewId);
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error deleting interview:', error);
      alert('Failed to delete interview');
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    if (activeTab === 'all') return true;
    if (activeTab === 'in-progress') return interview.status === 'in_progress';
    if (activeTab === 'completed') return interview.status === 'completed';
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
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
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </button>
              <div className="h-8 w-px bg-border"></div>
              <h1 className="text-xl font-semibold text-foreground">Your Interviews</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-border">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-3 px-4 text-sm font-medium transition-colors relative ${
                activeTab === 'all'
                  ? 'text-book-cloth'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Interviews
              <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-xs">
                {interviews.length}
              </span>
              {activeTab === 'all' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-book-cloth"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('in-progress')}
              className={`pb-3 px-4 text-sm font-medium transition-colors relative ${
                activeTab === 'in-progress'
                  ? 'text-book-cloth'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              In Progress
              <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-100 text-xs text-orange-700">
                {interviews.filter(i => i.status === 'in_progress').length}
              </span>
              {activeTab === 'in-progress' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-book-cloth"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`pb-3 px-4 text-sm font-medium transition-colors relative ${
                activeTab === 'completed'
                  ? 'text-book-cloth'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Completed
              <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-xs text-green-700">
                {interviews.filter(i => i.status === 'completed').length}
              </span>
              {activeTab === 'completed' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-book-cloth"></div>
              )}
            </button>
          </div>

          {/* Interviews List */}
          {filteredInterviews.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No interviews yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Start your first interview to capture your expertise
              </p>
              <button
                onClick={() => router.push('/interview')}
                className="px-6 py-3 bg-book-cloth text-white font-medium rounded-lg hover:bg-book-cloth/90 transition-all"
              >
                Start Interview
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredInterviews.map((interview) => {
                const document = documents.find(d => d.interview_id === interview.id);

                return (
                  <motion.div
                    key={interview.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                            interview.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {interview.status === 'completed' ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Completed
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                In Progress
                              </>
                            )}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-book-cloth/10 text-book-cloth text-xs font-medium">
                            {interview.document_type === 'case-study' ? 'Case Study' : 'Best Practices'}
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {interview.description}
                        </h3>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Started {formatDate(interview.created_at)}</span>
                          {interview.completed_at && (
                            <span>• Completed {formatDate(interview.completed_at)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {interview.status === 'in_progress' ? (
                          <button
                            onClick={() => handleResumeInterview(interview.id)}
                            className="px-4 py-2 bg-book-cloth text-white text-sm font-medium rounded-lg hover:bg-book-cloth/90 transition-all flex items-center gap-2"
                          >
                            Resume
                          </button>
                        ) : document ? (
                          <button
                            onClick={() => handleViewDocument(document.id)}
                            className="px-4 py-2 bg-book-cloth text-white text-sm font-medium rounded-lg hover:bg-book-cloth/90 transition-all flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Document
                          </button>
                        ) : null}

                        <button
                          onClick={() => handleDeleteInterview(interview.id)}
                          className="p-2 text-muted-foreground hover:text-red-600 transition-colors"
                          title="Delete interview"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
