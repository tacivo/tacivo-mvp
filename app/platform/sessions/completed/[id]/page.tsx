'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Copy, Check, Share2, Edit, Save, X, Globe, Lock, User, Calendar, List, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase/client';
import { shareDocument, unshareDocument, updateInterviewFunctionArea } from '@/lib/supabase/interviews';
import { Document } from '@/types/database.types';
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote, FormattingToolbarController, FormattingToolbar, getFormattingToolbarItems, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { en as blockNoteEn } from "@blocknote/core/locales";
import { AIExtension, AIMenuController, AIToolbarButton, getAISlashMenuItems } from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import { aiDocumentFormats } from "@blocknote/xl-ai/server";
import { DefaultChatTransport } from "ai";
import "@blocknote/mantine/style.css";
import "@blocknote/xl-ai/style.css";
import { extractPlainTextFromBlockNote } from "@/lib/blocknote-utils";

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
  const [editedFunctionArea, setEditedFunctionArea] = useState('');
  const [tableOfContents, setTableOfContents] = useState<{ id: string; text: string; level: number }[]>([]);
  const [copiedSidebar, setCopiedSidebar] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  // Create BlockNote editor with AI extension
  const editor = useCreateBlockNote({
    initialContent: blockNoteContent.length > 0 ? blockNoteContent : undefined,
    dictionary: {
      ...blockNoteEn,
      ai: aiEn,
    },
    extensions: [
      AIExtension({
        transport: new DefaultChatTransport({
          api: "/api/blocknote-ai-stream",
        }),
        streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider({
          withDelays: true,
        }),
      }),
    ],
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

  // Extract table of contents from headings (only H1 and H2)
  useEffect(() => {
    if (blockNoteContent.length > 0) {
      const headings = blockNoteContent
        .filter((block: any) => block.type === 'heading')
        .map((block: any) => ({
          id: block.id,
          text: block.content?.map((c: any) => c.text || '').join('') || '',
          level: block.props?.level || 1
        }))
        .filter((h: any) => h.text.trim() !== '' && h.level <= 2);
      setTableOfContents(headings);
    }
  }, [blockNoteContent]);

  // Track active heading on scroll using Intersection Observer
  useEffect(() => {
    if (tableOfContents.length === 0) return;

    const setupObserver = () => {
      const editorContainer = window.document.querySelector('.bn-editor');
      if (!editorContainer) return null;

      const allHeadings = Array.from(editorContainer.querySelectorAll('h1, h2, h3')) as Element[];
      if (allHeadings.length === 0) return null;

      const headingToTocMap = new Map<Element, number>();
      allHeadings.forEach((heading: Element) => {
        const text = heading.textContent?.trim() || '';
        const tocIndex = tableOfContents.findIndex(h => h.text.trim() === text);
        if (tocIndex !== -1) {
          headingToTocMap.set(heading, tocIndex);
        }
      });

      if (headingToTocMap.size === 0) return null;

      const visibleHeadings = new Set<number>();

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const tocIndex = headingToTocMap.get(entry.target);
            if (tocIndex === undefined) return;

            if (entry.isIntersecting) {
              visibleHeadings.add(tocIndex);
            } else {
              visibleHeadings.delete(tocIndex);
            }
          });

          if (visibleHeadings.size > 0) {
            const firstVisible = Math.min(...Array.from(visibleHeadings));
            setActiveHeadingId(tableOfContents[firstVisible]?.id || null);
          } else {
            let lastPassed: number | null = null;
            allHeadings.forEach((heading: Element) => {
              const tocIndex = headingToTocMap.get(heading);
              if (tocIndex === undefined) return;
              const rect = heading.getBoundingClientRect();
              if (rect.top < 150) {
                lastPassed = tocIndex;
              }
            });
            if (lastPassed !== null) {
              setActiveHeadingId(tableOfContents[lastPassed]?.id || null);
            }
          }
        },
        {
          rootMargin: '-140px 0px -70% 0px',
          threshold: 0
        }
      );

      headingToTocMap.forEach((_, heading) => {
        observer.observe(heading);
      });

      return observer;
    };

    if (tableOfContents.length > 0) {
      setActiveHeadingId(tableOfContents[0].id);
    }

    const timeoutId = setTimeout(() => {
      const observer = setupObserver();
      if (!observer) {
        setTimeout(() => setupObserver(), 500);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [tableOfContents]);

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
    // Use document.function_area first, fallback to interview for backwards compatibility
    setEditedFunctionArea(document.function_area || interview?.function_area || '');
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedTitle('');
    setEditedFunctionArea('');
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

      // Extract plain text from blocks
      const plainText = extractPlainTextFromBlockNote(currentBlocks);

      const { error } = await (supabase
        .from('documents')
        .update as any)({
          title: editedTitle,
          content: JSON.stringify(currentBlocks),
          format: 'blocknote',
          plain_text: plainText,
          function_area: editedFunctionArea || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id);

      if (error) throw error;

      // Also update function_area on interview if it exists (for backwards compatibility)
      if ((document as any).interview_id && editedFunctionArea !== interview?.function_area) {
        await updateInterviewFunctionArea((document as any).interview_id, editedFunctionArea);
        setInterview({ ...interview, function_area: editedFunctionArea });
      }

      // Update local state
      setDocument({
        ...document,
        title: editedTitle,
        content: JSON.stringify(currentBlocks),
        format: 'blocknote',
        function_area: editedFunctionArea || null
      });

      setBlockNoteContent(currentBlocks);
      setIsEditing(false);

      alert('Document updated successfully!');
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Failed to update document');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboardSidebar = async () => {
    if (!document || !editor) return;

    try {
      const markdown = await editor.blocksToMarkdownLossy(editor.document);
      const fullContent = `# ${document.title}\n\n${markdown}`;
      await navigator.clipboard.writeText(fullContent);
      setCopiedSidebar(true);
      setTimeout(() => setCopiedSidebar(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const openInClaude = async () => {
    if (!document || !editor) return;

    try {
      const markdown = await editor.blocksToMarkdownLossy(editor.document);
      const fullContent = `# ${document.title}\n\n${markdown}`;
      await navigator.clipboard.writeText(fullContent);
      const shortPrompt = encodeURIComponent(`I have a document titled "${document.title}" copied to my clipboard. I'll paste it now so you can use it to answer my questions.`);
      window.open(`https://claude.ai/new?q=${shortPrompt}`, '_blank');
    } catch (error) {
      console.error('Error opening in Claude:', error);
    }
  };

  const openInChatGPT = async () => {
    if (!document || !editor) return;

    try {
      const markdown = await editor.blocksToMarkdownLossy(editor.document);
      const fullContent = `# ${document.title}\n\n${markdown}`;
      await navigator.clipboard.writeText(fullContent);
      const shortPrompt = encodeURIComponent(`I have a document titled "${document.title}" copied to my clipboard. I'll paste it now so you can use it to answer my questions.`);
      window.open(`https://chatgpt.com/?prompt=${shortPrompt}`, '_blank');
    } catch (error) {
      console.error('Error opening in ChatGPT:', error);
    }
  };

  const scrollToHeading = (headingId: string) => {
    setActiveHeadingId(headingId);
    const headingElement = window.document.querySelector(`[data-id="${headingId}"]`) ||
                          window.document.querySelector(`[data-block-id="${headingId}"]`) ||
                          window.document.getElementById(headingId);
    if (headingElement) {
      headingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
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

      {/* Title Section - Sticky below header */}
      <div className="sticky top-14 z-40 bg-[#FAFAFA] border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-8 lg:px-16 py-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full text-2xl font-bold text-gray-900 mb-2 px-2 py-1 -ml-2 border-none focus:outline-none focus:bg-gray-50 rounded placeholder:text-gray-400"
                placeholder="Untitled"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {document.title}
              </h1>
            )}
            <div className="flex items-center flex-wrap gap-3 text-sm text-gray-500">
              {/* Share/Private Badge */}
              {(document as any).is_shared ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-50 text-green-700 font-medium">
                  <Globe className="w-3.5 h-3.5" />
                  Shared
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                  <Lock className="w-3.5 h-3.5" />
                  Private
                </span>
              )}

              {/* Function Area */}
              {isEditing ? (
                <input
                  type="text"
                  value={editedFunctionArea}
                  onChange={(e) => setEditedFunctionArea(e.target.value)}
                  placeholder="Function area (e.g. Sales, Engineering)"
                  className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-300 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
                />
              ) : (document.function_area || interview?.function_area) ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium capitalize">
                  {document.function_area || interview?.function_area}
                </span>
              ) : null}

              {/* Date */}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(document.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>

              {/* Owner */}
              {profile?.full_name && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {profile.full_name}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 lg:px-16 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Content with Sidebar */}
          <div className="flex gap-8">
            <div className="flex-1 min-w-0">
            {isBlockNoteFormat ? (
              <BlockNoteView
                editor={editor}
                editable={isEditing}
                theme="light"
                formattingToolbar={false}
                slashMenu={false}
              >
                {isEditing && (
                  <>
                    <FormattingToolbarController
                      formattingToolbar={() => (
                        <FormattingToolbar>
                          {...getFormattingToolbarItems()}
                          <AIToolbarButton />
                        </FormattingToolbar>
                      )}
                    />
                    <SuggestionMenuController
                      triggerCharacter="/"
                      getItems={async (query) =>
                        filterSuggestionItems(
                          [
                            ...getDefaultReactSlashMenuItems(editor),
                            ...getAISlashMenuItems(editor),
                          ],
                          query
                        )
                      }
                    />
                    <AIMenuController />
                  </>
                )}
              </BlockNoteView>
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

            {/* Right Sidebar */}
            {!isEditing && isBlockNoteFormat && (
              <aside className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-36">
                  {/* Action Buttons */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                    <button
                      onClick={copyToClipboardSidebar}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      {copiedSidebar ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy page as markdown</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={openInClaude}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors group"
                      title="Copies content and opens Claude - just paste!"
                    >
                      <span className="w-4 h-4 flex items-center justify-center font-bold text-orange-600">A\</span>
                      <span className="flex-1 text-left">Open in Claude</span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </button>
                    <button
                      onClick={openInChatGPT}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors group"
                      title="Copies content and opens ChatGPT - just paste!"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.392.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                      </svg>
                      <span className="flex-1 text-left">Open in ChatGPT</span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>

                  {/* Table of Contents */}
                  {tableOfContents.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-900">
                        <List className="w-4 h-4" />
                        <span>Page contents</span>
                      </div>
                      <nav className="space-y-1">
                        {tableOfContents.map((heading, index) => {
                          const isActive = activeHeadingId === heading.id;
                          return (
                            <button
                              key={heading.id || index}
                              onClick={() => scrollToHeading(heading.id)}
                              className={`w-full text-left text-sm transition-colors truncate ${
                                isActive
                                  ? 'text-book-cloth font-medium'
                                  : 'text-gray-600 hover:text-gray-900'
                              } ${heading.level === 1 && !isActive ? 'font-medium' : ''}`}
                              style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                            >
                              <span className={`inline-block w-1 h-4 mr-2 align-middle rounded-full ${
                                isActive ? 'bg-book-cloth' : 'bg-gray-300'
                              }`}></span>
                              {heading.text}
                            </button>
                          );
                        })}
                      </nav>
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}