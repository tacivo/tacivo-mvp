'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Copy, Check, Share2, Edit, Save, X, Type, Bold, Italic, List, ListOrdered, Code, Quote } from 'lucide-react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  // Formatting helper functions
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editedContent.substring(start, end);
    const newText = editedContent.substring(0, start) + before + selectedText + after + editedContent.substring(end);

    setEditedContent(newText);

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Find the start of the current line
    const beforeCursor = editedContent.substring(0, start);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    // Check if line already has this prefix
    const currentLine = editedContent.substring(lineStart, end);
    const hasPrefix = currentLine.startsWith(prefix);

    if (hasPrefix) {
      // Remove prefix
      const newText = editedContent.substring(0, lineStart) + currentLine.substring(prefix.length) + editedContent.substring(end);
      setEditedContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start - prefix.length, start - prefix.length);
      }, 0);
    } else {
      // Add prefix
      const newText = editedContent.substring(0, lineStart) + prefix + currentLine + editedContent.substring(end);
      setEditedContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    }
  };

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
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Notion-style Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-8 lg:px-16">
          <div className="flex justify-between items-center h-14">
            <button
              onClick={() => router.push('/platform')}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1.5 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>

            <div className="flex items-center gap-2">
              {isOwner && !isEditing && (
                <>
                  <button
                    onClick={handleEditStart}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1.5"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleShareToggle}
                    disabled={isSharing}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                      (document as any).is_shared
                        ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
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
                    className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleEditCancel}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1.5"
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
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        Copied
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
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    .md
                  </button>
                  <button
                    onClick={downloadPDF}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-all flex items-center gap-1.5"
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

      {/* Notion-style Main Content */}
      <main className="max-w-5xl mx-auto px-8 lg:px-16 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Document Title - Notion Style */}
          <div className="mb-4">
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full text-[2.5rem] leading-[1.2] font-bold text-gray-900 mb-3 px-2 py-1 -ml-2 border-none focus:outline-none focus:bg-gray-50 rounded placeholder:text-gray-400"
                placeholder="Untitled"
              />
            ) : (
              <h1 className="text-[2.5rem] leading-[1.2] font-bold text-gray-900 mb-3 px-2 -ml-2">
                {document.title}
              </h1>
            )}
            <div className="flex items-center gap-4 px-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                {document.document_type === 'case-study' ? '📋 Case Study' : '📚 Best Practices'}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(document.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
              {(document as any).is_shared && (
                <span className="flex items-center gap-1.5 text-blue-600">
                  <Share2 className="w-4 h-4" />
                  Shared with team
                </span>
              )}
            </div>
          </div>

          {/* Document Content - Notion Style */}
          <div className="mt-8">
            {isEditing ? (
              <div className="space-y-4">
                {/* Formatting Toolbar */}
                <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm p-2 flex items-center gap-1 flex-wrap">
                  {/* Headings */}
                  <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
                    <button
                      onClick={() => insertLinePrefix('# ')}
                      className="px-2.5 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Heading 1"
                    >
                      H1
                    </button>
                    <button
                      onClick={() => insertLinePrefix('## ')}
                      className="px-2.5 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Heading 2"
                    >
                      H2
                    </button>
                    <button
                      onClick={() => insertLinePrefix('### ')}
                      className="px-2.5 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Heading 3"
                    >
                      H3
                    </button>
                  </div>

                  {/* Text Formatting */}
                  <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
                    <button
                      onClick={() => insertMarkdown('**', '**')}
                      className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Bold (Ctrl+B)"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertMarkdown('*', '*')}
                      className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Italic (Ctrl+I)"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertMarkdown('`', '`')}
                      className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Code"
                    >
                      <Code className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Lists */}
                  <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
                    <button
                      onClick={() => insertLinePrefix('- ')}
                      className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Bullet List"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertLinePrefix('1. ')}
                      className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Numbered List"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quote */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => insertLinePrefix('> ')}
                      className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Quote"
                    >
                      <Quote className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Markdown Hint */}
                  <div className="ml-auto text-xs text-gray-500 hidden md:block">
                    💡 Using Markdown
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full min-h-[600px] px-2 py-3 -ml-2 border-none focus:outline-none focus:bg-gray-50 rounded text-[15px] leading-relaxed resize-none"
                  placeholder="Start writing..."
                  style={{ fontFamily: 'ui-monospace, monospace' }}
                  onKeyDown={(e) => {
                    // Keyboard shortcuts
                    if (e.ctrlKey || e.metaKey) {
                      if (e.key === 'b') {
                        e.preventDefault();
                        insertMarkdown('**', '**');
                      } else if (e.key === 'i') {
                        e.preventDefault();
                        insertMarkdown('*', '*');
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <article
                className="notion-content prose prose-lg max-w-none
                  prose-headings:font-bold prose-headings:tracking-tight
                  prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4
                  prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3
                  prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2
                  prose-p:text-gray-700 prose-p:leading-relaxed prose-p:my-3
                  prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-gray-900 prose-strong:font-semibold
                  prose-ul:my-3 prose-ol:my-3
                  prose-li:text-gray-700 prose-li:my-1
                  prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-pink-600 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-gray-900 prose-pre:text-gray-100
                  prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600
                  prose-hr:border-gray-200 prose-hr:my-8"
                style={{ fontSize: '16px', lineHeight: '1.75' }}
              >
                <ReactMarkdown>{document.content}</ReactMarkdown>
              </article>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
