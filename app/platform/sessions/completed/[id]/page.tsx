'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Copy, Check, Share2, Edit, Save, X, Sparkles, Wand2, CheckCircle, Maximize, Minimize, Briefcase, Globe, Lock, User, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase/client';
import { shareDocument, unshareDocument } from '@/lib/supabase/interviews';
import { Document } from '@/types/database.types';
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";

export default function DocumentViewPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [interview, setInterview] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [blockNoteContent, setBlockNoteContent] = useState<any[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<{ original: string; suggestion: string; blockId: string } | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // AI helper function with suggestion workflow
  const callAI = async (operation: string, selectedText: string, blockId?: string, showSuggestion: boolean = false) => {
    try {
      setIsLoadingAI(true);
      console.log('[Client] Calling AI with operation:', operation);
      console.log('[Client] Selected text length:', selectedText?.length);

      const response = await fetch('/api/blocknote-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          selectedText,
        }),
      });

      console.log('[Client] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Client] AI API Error:', errorData);
        const errorMsg = errorData.details || errorData.error || 'AI request failed';
        throw new Error(`${errorMsg} (${errorData.errorName || 'Unknown'})`);
      }

      const data = await response.json();
      console.log('[Client] Received response, text length:', data.text?.length);

      if (showSuggestion && blockId) {
        // Show suggestion with accept/reject buttons
        setAiSuggestion({
          original: selectedText,
          suggestion: data.text,
          blockId
        });
        return null;
      }

      return data.text;
    } catch (error: any) {
      console.error('[Client] AI Error:', error);
      alert(`AI Error: ${error.message || 'Failed to process AI request'}`);
      throw error;
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Accept AI suggestion
  const acceptSuggestion = () => {
    if (!aiSuggestion) return;

    const block = editor.document.find(b => b.id === aiSuggestion.blockId);
    if (block) {
      editor.updateBlock(block, { type: "paragraph", content: aiSuggestion.suggestion });
    }
    setAiSuggestion(null);
  };

  // Reject AI suggestion
  const rejectSuggestion = () => {
    setAiSuggestion(null);
  };

  // Create BlockNote editor
  const editor = useCreateBlockNote({
    initialContent: blockNoteContent.length > 0 ? blockNoteContent : undefined,
  });

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  // Update editor when blockNoteContent changes
  useEffect(() => {
    if (blockNoteContent.length > 0 && editor) {
      editor.replaceBlocks(editor.document, blockNoteContent);
    }
  }, [blockNoteContent, editor]);

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

      const doc = data as unknown as Document;
      setDocument(doc);

      // Fetch interview data for function_area
      if ((doc as any).interview_id) {
        const { data: interviewData } = await supabase
          .from('interviews')
          .select('function_area')
          .eq('id', (doc as any).interview_id)
          .single();

        setInterview(interviewData);
      }

      // Fetch profile data for owner name
      if ((doc as any).user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', (doc as any).user_id)
          .single();

        setProfile(profileData);
      }

      // Parse BlockNote content if format is blocknote
      if (doc.format === 'blocknote' && doc.content) {
        try {
          const parsed = JSON.parse(doc.content);
          setBlockNoteContent(parsed);
        } catch (e) {
          console.error('Error parsing BlockNote content:', e);
          // Fallback to markdown
        }
      }
    } catch (error) {
      console.error('Error loading document:', error);
      alert('Failed to load document');
      router.push('/platform/sessions/completed');
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = async () => {
    if (!document) return;

    try {
      // Get markdown from editor if in BlockNote format
      if (document.format === 'blocknote' && editor) {
        const markdown = await editor.blocksToMarkdownLossy(editor.document);
        await navigator.clipboard.writeText(markdown);
      } else {
        await navigator.clipboard.writeText(document.content);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const downloadPDF = async () => {
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

    let plainText = '';
    
    if (document.format === 'blocknote' && editor) {
      // Convert BlockNote to markdown first, then to plain text
      const markdown = await editor.blocksToMarkdownLossy(editor.document);
      plainText = markdown
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    } else {
      plainText = document.content
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    }

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

  const downloadMarkdown = async () => {
    if (!document) return;

    let markdownContent = '';
    
    if (document.format === 'blocknote' && editor) {
      markdownContent = await editor.blocksToMarkdownLossy(editor.document);
    } else {
      markdownContent = document.content;
    }

    const blob = new Blob([markdownContent], { type: 'text/markdown' });
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
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedTitle('');
    // Reset editor content
    if (blockNoteContent.length > 0 && editor) {
      editor.replaceBlocks(editor.document, blockNoteContent);
    }
  };

  const handleSaveEdit = async () => {
    if (!document || !editor) return;

    setIsSaving(true);
    try {
      // Get current blocks from editor
      const currentBlocks = editor.document;

      const { error } = await (supabase
        .from('documents')
        .update as any)({
          title: editedTitle,
          content: JSON.stringify(currentBlocks),
          format: 'blocknote',
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id);

      if (error) throw error;

      // Update local state
      setDocument({
        ...document,
        title: editedTitle,
        content: JSON.stringify(currentBlocks),
        format: 'blocknote'
      });

      setBlockNoteContent(currentBlocks);
      setIsEditing(false);

      // Regenerate AI summary in the background (don't wait for it)
      fetch('/api/generate-ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: document.id })
      }).catch(err => {
        console.warn('Failed to regenerate AI summary:', err);
        // Don't show error to user - summary generation is background task
      });

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
            onClick={() => router.push('/platform/sessions/completed')}
            className="text-book-cloth hover:underline"
          >
            Back to completed sessions
          </button>
        </div>
      </div>
    );
  }

  const isOwner = currentUserId === (document as any).user_id;
  const isBlockNoteFormat = document.format === 'blocknote';

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header - unchanged */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-8 lg:px-16">
          <div className="flex justify-between items-center h-14">
            <button
              onClick={() => router.push('/platform/sessions/completed')}
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

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-8 lg:px-16 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Title */}
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
            <div className="flex items-center gap-3 px-2 text-sm">
              {/* Share/Private Badge */}
              {(document as any).is_shared ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 font-medium">
                  <Globe className="w-3.5 h-3.5" />
                  Shared
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 font-medium">
                  <Lock className="w-3.5 h-3.5" />
                  Private
                </span>
              )}

              {/* Function Area */}
              {interview?.function_area && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium capitalize">
                  {interview.function_area}
                </span>
              )}

              {/* Date */}
              <span className="flex items-center gap-1.5 text-gray-500">
                <Calendar className="w-4 h-4" />
                {new Date(document.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>

              {/* Owner */}
              {profile?.full_name && (
                <span className="flex items-center gap-1.5 text-gray-500">
                  <User className="w-4 h-4" />
                  {profile.full_name}
                </span>
              )}
            </div>
          </div>

          {/* AI Toolbar - Only show in edit mode for BlockNote documents */}
          {isEditing && isBlockNoteFormat && (
            <div className="mb-4 space-y-3">
              <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      AI-Powered Editing
                    </p>
                    <p className="text-xs text-gray-600 mb-3">
                      Select text in the editor, then use the AI tools below to enhance your writing.
                    </p>

                    {/* AI Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={async () => {
                          const selection = editor.getSelection();
                          if (!selection || !selection.blocks || selection.blocks.length === 0) {
                            alert('Please select some text first');
                            return;
                          }
                          const selectedText = selection.blocks.map((block: any) => block.content?.map((c: any) => c.text).join('')).join('\n');
                          if (!selectedText) return;
                          await callAI('improve', selectedText, selection.blocks[0].id, true);
                        }}
                        className="px-3 py-1.5 bg-white border border-purple-200 rounded-md text-xs font-medium text-gray-700 hover:bg-purple-50 transition-colors flex items-center gap-1.5"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        Improve
                      </button>
                      <button
                        onClick={async () => {
                          const selection = editor.getSelection();
                          if (!selection || !selection.blocks || selection.blocks.length === 0) {
                            alert('Please select some text first');
                            return;
                          }
                          const selectedText = selection.blocks.map((block: any) => block.content?.map((c: any) => c.text).join('')).join('\n');
                          if (!selectedText) return;
                          await callAI('fix', selectedText, selection.blocks[0].id, true);
                        }}
                        className="px-3 py-1.5 bg-white border border-purple-200 rounded-md text-xs font-medium text-gray-700 hover:bg-purple-50 transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Fix Grammar
                      </button>
                      <button
                        onClick={async () => {
                          const selection = editor.getSelection();
                          if (!selection || !selection.blocks || selection.blocks.length === 0) {
                            alert('Please select some text first');
                            return;
                          }
                          const selectedText = selection.blocks.map((block: any) => block.content?.map((c: any) => c.text).join('')).join('\n');
                          if (!selectedText) return;
                          await callAI('professional', selectedText, selection.blocks[0].id, true);
                        }}
                        className="px-3 py-1.5 bg-white border border-purple-200 rounded-md text-xs font-medium text-gray-700 hover:bg-purple-50 transition-colors flex items-center gap-1.5"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        Professional
                      </button>
                      <button
                        onClick={async () => {
                          const selection = editor.getSelection();
                          if (!selection || !selection.blocks || selection.blocks.length === 0) {
                            alert('Please select some text first');
                            return;
                          }
                          const selectedText = selection.blocks.map((block: any) => block.content?.map((c: any) => c.text).join('')).join('\n');
                          if (!selectedText) return;
                          await callAI('simplify', selectedText, selection.blocks[0].id, true);
                        }}
                        className="px-3 py-1.5 bg-white border border-purple-200 rounded-md text-xs font-medium text-gray-700 hover:bg-purple-50 transition-colors flex items-center gap-1.5"
                      >
                        <Minimize className="w-3.5 h-3.5" />
                        Simplify
                      </button>
                      <button
                        onClick={async () => {
                          const selection = editor.getSelection();
                          if (!selection || !selection.blocks || selection.blocks.length === 0) {
                            alert('Please select some text first');
                            return;
                          }
                          const selectedText = selection.blocks.map((block: any) => block.content?.map((c: any) => c.text).join('')).join('\n');
                          if (!selectedText) return;
                          await callAI('expand', selectedText, selection.blocks[0].id, true);
                        }}
                        className="px-3 py-1.5 bg-white border border-purple-200 rounded-md text-xs font-medium text-gray-700 hover:bg-purple-50 transition-colors flex items-center gap-1.5"
                      >
                        <Maximize className="w-3.5 h-3.5" />
                        Expand
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Suggestion Dialog */}
          {aiSuggestion && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">AI Suggestion</h3>
                  </div>
                  <button
                    onClick={rejectSuggestion}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Original */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Original
                    </label>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-gray-800">{aiSuggestion.original}</p>
                    </div>
                  </div>

                  {/* Suggestion */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Suggestion
                    </label>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="text-gray-800">{aiSuggestion.suggestion}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    onClick={rejectSuggestion}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={acceptSuggestion}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Accept
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoadingAI && (
            <div className="fixed top-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">AI is thinking...</span>
            </div>
          )}

          {/* Content */}
          <div className="mt-8">
            {isBlockNoteFormat ? (
              <BlockNoteView
                editor={editor}
                editable={isEditing}
                theme="light"
              />
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