'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Copy, Check, Share2, Edit, Save, X, Sparkles, Wand2, CheckCircle, Maximize, Minimize, Briefcase, Globe, Lock, FileText, Library } from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase/client';
import { Playbook, Document } from '@/types/database.types';
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";

type PlaybookWithSources = Playbook & {
  profiles?: {
    full_name: string | null
    role: string | null
  }
  sourceDocuments?: Document[]
}

export default function PlaybookDetailPage() {
  const router = useRouter();
  const params = useParams();
  const playbookId = params.id as string;

  const [playbook, setPlaybook] = useState<PlaybookWithSources | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [blockNoteContent, setBlockNoteContent] = useState<any[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<{ original: string; suggestion: string; blockId: string } | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showSources, setShowSources] = useState(true);

  // AI helper function with suggestion workflow
  const callAI = async (operation: string, selectedText: string, blockId?: string, showSuggestion: boolean = false) => {
    try {
      setIsLoadingAI(true);
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMsg = errorData.details || errorData.error || 'AI request failed';
        throw new Error(`${errorMsg} (${errorData.errorName || 'Unknown'})`);
      }

      const data = await response.json();

      if (showSuggestion && blockId) {
        setAiSuggestion({
          original: selectedText,
          suggestion: data.text,
          blockId
        });
        return null;
      }

      return data.text;
    } catch (error: any) {
      alert(`AI Error: ${error.message || 'Failed to process AI request'}`);
      throw error;
    } finally {
      setIsLoadingAI(false);
    }
  };

  const acceptSuggestion = () => {
    if (!aiSuggestion) return;

    const block = editor.document.find(b => b.id === aiSuggestion.blockId);
    if (block) {
      editor.updateBlock(block, { type: "paragraph", content: aiSuggestion.suggestion });
    }
    setAiSuggestion(null);
  };

  const rejectSuggestion = () => {
    setAiSuggestion(null);
  };

  // Create BlockNote editor
  const editor = useCreateBlockNote({
    initialContent: blockNoteContent.length > 0 ? blockNoteContent : undefined,
  });

  useEffect(() => {
    loadPlaybook();
  }, [playbookId]);

  useEffect(() => {
    if (blockNoteContent.length > 0 && editor) {
      editor.replaceBlocks(editor.document, blockNoteContent);
    }
  }, [blockNoteContent, editor]);

  async function loadPlaybook() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await (supabase as any)
        .from('playbooks')
        .select(`
          *,
          profiles:user_id (
            full_name,
            role
          )
        `)
        .eq('id', playbookId)
        .single();

      if (error) throw error;

      const playbookData = data as PlaybookWithSources;

      // Fetch source documents
      if (playbookData.document_ids && playbookData.document_ids.length > 0) {
        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select('id, title, document_type, created_at')
          .in('id', playbookData.document_ids);

        if (!docsError && docs) {
          playbookData.sourceDocuments = docs as Document[];
        }
      }

      setPlaybook(playbookData);

      // Parse BlockNote content - always treat as blocknote format
      try {
        // Try to parse as JSON first (blocknote format)
        const parsed = JSON.parse(playbookData.content);
        setBlockNoteContent(parsed);
      } catch (e) {
        // If not JSON, convert markdown to BlockNote blocks
        const markdownBlocks = playbookData.content.split('\n').map((line, idx) => ({
          id: `block-${idx}`,
          type: 'paragraph',
          content: line || ' '
        }));
        setBlockNoteContent(markdownBlocks);
      }
    } catch (error) {
      console.error('Error loading playbook:', error);
      alert('Failed to load playbook');
      router.push('/platform/shared-playbooks');
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = async () => {
    if (!playbook || !editor) return;

    try {
      const markdown = await editor.blocksToMarkdownLossy(editor.document);
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const downloadPDF = async () => {
    if (!playbook || !editor) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(playbook.title, maxWidth);
    doc.text(titleLines, margin, yPosition);
    yPosition += titleLines.length * 7 + 10;

    // Content
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    const plainText = markdown
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

    doc.save(`${playbook.title}.pdf`);
  };

  const downloadMarkdown = async () => {
    if (!playbook || !editor) return;

    const markdownContent = await editor.blocksToMarkdownLossy(editor.document);
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${playbook.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareToggle = async () => {
    if (!playbook) return;

    try {
      const { error } = await (supabase as any)
        .from('playbooks')
        .update({ is_shared: !playbook.is_shared })
        .eq('id', playbook.id);

      if (error) throw error;

      setPlaybook({ ...playbook, is_shared: !playbook.is_shared });
      alert(playbook.is_shared ? 'Playbook is now private' : 'Playbook shared with your organization!');
    } catch (error) {
      console.error('Error toggling share:', error);
      alert('Failed to update sharing status');
    }
  };

  const handleEditStart = () => {
    if (!playbook) return;
    setEditedTitle(playbook.title);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedTitle('');
    if (blockNoteContent.length > 0 && editor) {
      editor.replaceBlocks(editor.document, blockNoteContent);
    }
  };

  const handleSaveEdit = async () => {
    if (!playbook || !editor) return;

    setIsSaving(true);
    try {
      const currentBlocks = editor.document;

      const { error } = await (supabase as any)
        .from('playbooks')
        .update({
          title: editedTitle,
          content: JSON.stringify(currentBlocks),
          updated_at: new Date().toISOString()
        })
        .eq('id', playbook.id);

      if (error) throw error;

      setPlaybook({
        ...playbook,
        title: editedTitle,
        content: JSON.stringify(currentBlocks)
      });

      setBlockNoteContent(currentBlocks);
      setIsEditing(false);

      alert('Playbook updated successfully!');
    } catch (error) {
      console.error('Error updating playbook:', error);
      alert('Failed to update playbook');
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sales-playbook': return 'Sales Playbook'
      case 'customer-success-guide': return 'Customer Success Guide'
      case 'operational-procedures': return 'Operational Procedures'
      case 'strategic-planning-document': return 'Strategic Planning Document'
      default: return type
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading playbook...</p>
        </div>
      </div>
    );
  }

  if (!playbook) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Playbook not found</h2>
          <button
            onClick={() => router.push('/platform/shared-playbooks')}
            className="text-accent hover:underline"
          >
            Back to playbooks
          </button>
        </div>
      </div>
    );
  }

  const isOwner = currentUserId === playbook.user_id;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-8 lg:px-16">
          <div className="flex justify-between items-center h-14">
            <button
              onClick={() => router.push('/platform/shared-playbooks')}
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
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                      playbook.is_shared
                        ? 'text-green-700 bg-green-50 hover:bg-green-100'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {playbook.is_shared ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {playbook.is_shared ? 'Shared' : 'Private'}
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
                placeholder="Untitled Playbook"
              />
            ) : (
              <h1 className="text-[2.5rem] leading-[1.2] font-bold text-gray-900 mb-3 px-2 -ml-2">
                {playbook.title}
              </h1>
            )}
            <div className="flex items-center gap-4 px-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                {getTypeLabel(playbook.type)}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(playbook.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
              {playbook.updated_at && playbook.updated_at !== playbook.created_at && (
                <span className="flex items-center gap-1.5 text-blue-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Updated {new Date(playbook.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              )}
              {playbook.is_shared && (
                <span className="flex items-center gap-1.5 text-green-600">
                  <Globe className="w-4 h-4" />
                  Shared with organization
                </span>
              )}
              {playbook.profiles?.full_name && (
                <span className="flex items-center gap-1.5">
                  Created by {playbook.profiles.full_name}
                </span>
              )}
            </div>
          </div>

          {/* Source Documents */}
          {playbook.sourceDocuments && playbook.sourceDocuments.length > 0 && (
            <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-900">
                    Source Documents ({playbook.sourceDocuments.length})
                  </span>
                </div>
                <span className="text-gray-400">
                  {showSources ? '▼' : '▶'}
                </span>
              </button>

              {showSources && (
                <div className="mt-3 space-y-2">
                  {playbook.sourceDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => router.push(`/platform/experiences/${doc.id}`)}
                      className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-accent" />
                        <span className="text-sm text-gray-900 group-hover:text-accent transition-colors">
                          {doc.title}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {doc.document_type === 'case-study' ? 'Case Study' : 'Best Practices'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Toolbar - Only show in edit mode */}
          {isEditing && (
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

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Original
                    </label>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-gray-800">{aiSuggestion.original}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Suggestion
                    </label>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="text-gray-800">{aiSuggestion.suggestion}</p>
                    </div>
                  </div>
                </div>

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

          {/* Content - BlockNote Editor */}
          <div className="mt-8">
            <BlockNoteView
              editor={editor}
              editable={isEditing}
              theme="light"
            />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
