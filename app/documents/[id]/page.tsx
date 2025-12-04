'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Copy, Check, Share2, Edit, Save, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase/client';
import { shareDocument, unshareDocument } from '@/lib/supabase/interviews';
import { Document } from '@/types/database.types';

export default function DocumentViewPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  async function loadDocument() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) throw error;

      setDocument(data as unknown as Document);
    } catch (error) {
      console.error('Error loading document:', error);
      alert('Failed to load document');
      router.push('/documents');
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = async () => {
    if (!document) return;

    try {
      await navigator.clipboard.writeText(document.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const downloadPDF = () => {
    if (!document) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(document.title, maxWidth);
    doc.text(titleLines, margin, yPosition);
    yPosition += titleLines.length * 7 + 10;

    // Content
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    // Simple markdown to text conversion (remove markdown syntax)
    const plainText = document.content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    const lines = doc.splitTextToSize(plainText, maxWidth);

    for (const line of lines) {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 6;
    }

    doc.save(`${document.title}.pdf`);
  };

  const downloadMarkdown = () => {
    if (!document) return;

    const blob = new Blob([document.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareToggle = async () => {
    if (!document) return;

    setIsSharing(true);
    try {
      if ((document as any).is_shared) {
        await unshareDocument(document.id);
        alert('Document is now private');
      } else {
        await shareDocument(document.id);
        alert('Document shared with your company!');
      }
      // Reload document to get updated is_shared status
      await loadDocument();
    } catch (error) {
      console.error('Error toggling share:', error);
      alert('Failed to update sharing status');
    } finally {
      setIsSharing(false);
    }
  };

  const handleEditStart = () => {
    if (!document) return;
    setEditedTitle(document.title);
    setEditedContent(document.content);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedTitle('');
    setEditedContent('');
  };

  const handleSaveEdit = async () => {
    if (!document) return;

    setIsSaving(true);
    try {
      const { error } = await (supabase
        .from('documents')
        .update as any)({
          title: editedTitle,
          content: editedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id);

      if (error) throw error;

      // Update local document state
      setDocument({
        ...document,
        title: editedTitle,
        content: editedContent
      });

      setIsEditing(false);
      alert('Document updated successfully!');
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Failed to update document');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-book-cloth border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Document not found</h2>
          <button
            onClick={() => router.push('/documents')}
            className="text-book-cloth hover:underline"
          >
            Back to documents
          </button>
        </div>
      </div>
    );
  }

  const isOwner = currentUserId === (document as any).user_id;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-2">
              {isOwner && !isEditing && (
                <>
                  <button
                    onClick={handleEditStart}
                    className="px-4 py-2 text-sm font-medium border border-border text-foreground rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleShareToggle}
                    disabled={isSharing}
                    className={`px-4 py-2 text-sm font-medium border rounded-lg transition-all flex items-center gap-2 ${
                      (document as any).is_shared
                        ? 'border-book-cloth text-book-cloth bg-book-cloth/5 hover:bg-book-cloth/10'
                        : 'border-border text-foreground hover:bg-slate-50'
                    }`}
                    title={(document as any).is_shared ? 'Shared with company' : 'Share with company'}
                  >
                    <Share2 className="w-4 h-4" />
                    {isSharing ? 'Updating...' : (document as any).is_shared ? 'Shared' : 'Share'}
                  </button>
                </>
              )}
              {isOwner && isEditing && (
                <>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium bg-book-cloth text-white rounded-lg hover:bg-book-cloth/90 transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleEditCancel}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium border border-border text-foreground rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </>
              )}
              {!isEditing && (
                <>
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={downloadMarkdown}
                    className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Markdown
                  </button>
                  <button
                    onClick={downloadPDF}
                    className="px-4 py-2 text-sm font-medium bg-book-cloth text-white rounded-lg hover:bg-book-cloth/90 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                </>
              )}
            </div>
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
          {/* Document Header */}
          <div className="mb-8">
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full text-3xl font-semibold text-foreground mb-2 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-book-cloth"
                placeholder="Document title"
              />
            ) : (
              <h1 className="text-3xl font-semibold text-foreground mb-2">
                {document.title}
              </h1>
            )}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="px-3 py-1 rounded-full bg-book-cloth/10 text-book-cloth font-medium">
                {document.document_type === 'case-study' ? 'Case Study' : 'Best Practices'}
              </span>
              <span>
                Created {new Date(document.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* Document Content */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full min-h-[500px] px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-book-cloth font-mono text-sm"
                placeholder="Document content (Markdown format)"
              />
            ) : (
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown>{document.content}</ReactMarkdown>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
