import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// Extend timeout for playbook generation
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const { documentIds, type, title, savePlaybook, userId } = await req.json();

        console.log('Playbook generation request:', {
          documentCount: documentIds?.length,
          type,
          hasTitle: !!title,
          shouldSave: savePlaybook,
          userId: userId
        });

        sendEvent('status', { message: 'Validating request...' });

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 2) {
          sendEvent('error', { error: 'At least 2 documents must be selected' });
          controller.close();
          return;
        }

        if (!type || !['sales-playbook', 'customer-success-guide', 'operational-procedures', 'strategic-planning-document'].includes(type)) {
          sendEvent('error', { error: 'Invalid generation type' });
          controller.close();
          return;
        }

        const supabase = supabaseAdmin;

        sendEvent('status', { message: 'Fetching documents...' });

        // Fetch all selected documents with plain text
        const { data: documents, error } = await supabase
          .from('documents')
          .select(`
            *,
            profiles:user_id (
              full_name,
              role,
              years_of_experience
            )
          `)
          .in('id', documentIds);

        if (error) {
          console.error('Database error fetching documents:', error);
          sendEvent('error', { error: 'Database error fetching documents' });
          controller.close();
          return;
        }

        console.log(`Fetched ${documents?.length || 0} documents for IDs:`, documentIds);
        console.log('Document details:', documents?.map((d: any) => ({
          id: d.id,
          title: d.title,
          plainTextLength: d.plain_text?.length || 0,
          hasPlainText: !!(d.plain_text && d.plain_text.trim())
        })));

        if (!documents || documents.length === 0) {
          console.error(`No documents found for IDs:`, documentIds);
          sendEvent('error', { error: 'No documents found. Please ensure you have completed interviews and generated documents.' });
          controller.close();
          return;
        }

        // Check if documents have plain_text and filter out empty ones
        const validDocuments = documents.filter((doc: any) => doc.plain_text && doc.plain_text.trim().length > 0);

        if (validDocuments.length < 2) {
          sendEvent('error', { error: `Only ${validDocuments.length} documents have content. Need at least 2 documents with content.` });
          controller.close();
          return;
        }

        console.log(`Using plain text from ${validDocuments.length} documents`);

        sendEvent('status', { message: 'Analyzing selected experiences...' });

        // Combine all document plain text content
        const combinedContent = validDocuments.map((doc: any) => {
          const profile = doc.profiles;

          return `=== ${doc.title} ===

Author: ${profile?.full_name || 'Unknown'} (${profile?.role || 'Unknown role'})
Type: ${doc.document_type}

Content:
${doc.plain_text}

---`;
        }).join('\n\n');

        console.log(`Generating ${type} from ${validDocuments.length} documents. Total content length: ${combinedContent.length} characters`);

        sendEvent('status', { message: 'Extracting key insights and patterns...' });

        // Create generation prompt based on type
        let prompt = '';
        switch (type) {
          case 'sales-playbook':
            prompt = `You are creating a comprehensive sales playbook by synthesizing insights from ${validDocuments.length} different experiences and best practices.

=== YOUR TASK ===

Create a detailed sales playbook that combines the best practices, methodologies, and insights from all these experiences. The playbook should:

1. Identify common patterns and themes across all experiences
2. Create a step-by-step sales framework that incorporates the most effective approaches
3. Include decision trees for different sales scenarios
4. Provide templates and checklists for sales activities
5. Address potential challenges and mitigation strategies in sales processes

TARGET AUDIENCE: Sales teams and individuals who need a complete sales methodology guide.

LENGTH: 5-8 pages. Be thorough but practical.

=== SALES PLAYBOOK STRUCTURE ===

# Sales Playbook

*Comprehensive sales methodology synthesized from ${validDocuments.length} expert experiences*

---

## Executive Summary

[Overview of the sales playbook's scope and key insights]

## Core Sales Framework

[Step-by-step sales methodology combining best approaches from all experiences]

## Prospecting & Lead Generation

[Effective strategies for finding and qualifying prospects]

## Qualification & Discovery

[How to identify real opportunities and understand customer needs]

## Presentation & Demonstration

[Best practices for presenting solutions and handling objections]

## Negotiation & Closing

[Techniques for successful deal closure]

## Decision Framework

[When to use different sales approaches based on deal characteristics]

## Implementation Templates

[Checklists, email templates, call scripts, and sales tools]

## Common Sales Challenges & Solutions

[Problems encountered and how to address them in sales]

## Case Studies

[Anonymized examples from the source experiences applied to sales]

## Resources & Next Steps

[Additional sales tools and continuous improvement]

---
*Generated from sales experiences by: ${validDocuments.map((d: any) => d.profiles?.full_name).filter(Boolean).join(', ')}*`;
            break;

          case 'customer-success-guide':
            prompt = `You are creating a customer success guide by synthesizing insights from ${validDocuments.length} different experiences.

=== YOUR TASK ===

Create a 4-6 page customer success guide that captures the most effective approaches and insights from all these experiences.

TARGET AUDIENCE: Customer success teams who need actionable guidance for managing and growing customer relationships.

LENGTH: 4-6 pages maximum. Be practical and focused on outcomes.

=== CUSTOMER SUCCESS GUIDE STRUCTURE ===

# Customer Success Guide

*Based on insights from ${validDocuments.length} expert experiences*

---

## Overview

[What this guide covers and why customer success matters]

## Customer Journey Mapping

[Understanding the customer's lifecycle and touchpoints]

## Onboarding Excellence

[Best practices for successful customer onboarding]

## Adoption & Engagement

[Strategies to drive product adoption and engagement]

## Health Scoring & Monitoring

[How to track customer health and identify at-risk accounts]

## Expansion & Growth

[Techniques for identifying and executing expansion opportunities]

## Retention Strategies

[Proactive approaches to prevent churn]

## Customer Communication

[Effective communication strategies and cadences]

## Success Metrics & KPIs

[Key metrics to track and measure success]

## Tools & Templates

[Practical tools for customer success teams]

---
*Compiled from customer success experiences by: ${validDocuments.map((d: any) => d.profiles?.full_name).filter(Boolean).join(', ')}*`;
            break;

          case 'operational-procedures':
            prompt = `You are creating operational procedures by synthesizing insights from ${validDocuments.length} different experiences.

=== YOUR TASK ===

Create a comprehensive operational procedures document that distills the most effective approaches from all these experiences.

TARGET AUDIENCE: Operations teams looking to establish standards and improve their processes.

LENGTH: 6-8 pages.

=== OPERATIONAL PROCEDURES STRUCTURE ===

# Standard Operating Procedures

*Distilled from ${validDocuments.length} expert experiences*

---

## Introduction

[Context and importance of standardized procedures]

## Core Operational Framework

[Overall approach to operations management]

## Process Documentation

[How to document and maintain operational processes]

## Quality Control & Assurance

[Standards and procedures for maintaining quality]

## Performance Monitoring

[Key metrics and monitoring procedures]

## Issue Resolution Protocols

[Standardized approaches to handling operational issues]

## Training & Onboarding

[Procedures for training new team members]

## Continuous Improvement

[Processes for ongoing optimization]

## Risk Management

[Procedures for identifying and mitigating operational risks]

## Compliance & Auditing

[Procedures for ensuring compliance and conducting audits]

---
*Based on operational experiences by: ${validDocuments.map((d: any) => d.profiles?.full_name).filter(Boolean).join(', ')}*`;
            break;

          case 'strategic-planning-document':
            prompt = `You are creating a strategic planning document by synthesizing insights from ${validDocuments.length} different experiences.

=== YOUR TASK ===

Create a strategic planning framework that establishes guidelines based on the collective experience from all these cases.

TARGET AUDIENCE: Leadership teams and strategic planners.

LENGTH: 6-10 pages.

=== STRATEGIC PLANNING DOCUMENT STRUCTURE ===

# Strategic Planning Framework

*Official guidelines based on ${validDocuments.length} expert experiences*

---

## Purpose & Scope

[What this strategic planning framework covers]

## Strategic Planning Process

[Step-by-step approach to strategic planning]

## Environmental Analysis

[Methods for analyzing internal and external environments]

## Goal Setting & Objectives

[Frameworks for setting strategic goals and objectives]

## Strategy Development

[Approaches to developing effective strategies]

## Implementation Planning

[How to create actionable implementation plans]

## Resource Allocation

[Strategic approaches to resource planning]

## Risk Assessment & Mitigation

[Identifying and managing strategic risks]

## Performance Measurement

[Metrics and methods for tracking strategic success]

## Review & Adaptation

[Processes for reviewing and adjusting strategies]

## Communication & Alignment

[Ensuring organizational alignment with strategic plans]

---
*Approved based on strategic experiences by: ${validDocuments.map((d: any) => d.profiles?.full_name).filter(Boolean).join(', ')}*`;
            break;
        }

        sendEvent('status', { message: 'Generating playbook content...' });

        // Use streaming to avoid timeout
        let generatedContent = '';

        const response = await anthropic.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 6000,
          temperature: 0.7,
          system: [
            {
              type: "text",
              text: `You are an expert at synthesizing multiple case studies and best practices into comprehensive, actionable playbooks. You excel at identifying patterns, extracting nuances, and creating practical frameworks.

SOURCE DOCUMENTS:
${combinedContent}`,
              cache_control: { type: "ephemeral" }
            }
          ],
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        // Track progress for status updates
        let chunkCount = 0;
        const statusMessages = [
          'Structuring the playbook...',
          'Writing executive summary...',
          'Generating actionable frameworks...',
          'Adding practical examples...',
          'Finalizing content...',
        ];

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            generatedContent += event.delta.text;
            chunkCount++;

            // Send periodic status updates
            if (chunkCount % 50 === 0) {
              const statusIndex = Math.min(Math.floor(chunkCount / 100), statusMessages.length - 1);
              sendEvent('status', { message: statusMessages[statusIndex] });
            }
          }
        }

        console.log(`Successfully generated ${type} content of length: ${generatedContent.length} characters`);

        sendEvent('status', { message: 'Converting to editor format...' });

        // Convert markdown to BlockNote format
        const convertMarkdownToBlockNote = (markdown: string) => {
          const lines = markdown.split('\n');
          const blocks = [];
          let blockId = 0;

          for (const line of lines) {
            if (!line.trim()) {
              // Empty line - paragraph with empty content
              blocks.push({
                id: `block-${blockId++}`,
                type: 'paragraph',
                content: []
              });
            } else if (line.startsWith('# ')) {
              // H1
              blocks.push({
                id: `block-${blockId++}`,
                type: 'heading',
                props: { level: 1 },
                content: [{ type: 'text', text: line.substring(2), styles: {} }]
              });
            } else if (line.startsWith('## ')) {
              // H2
              blocks.push({
                id: `block-${blockId++}`,
                type: 'heading',
                props: { level: 2 },
                content: [{ type: 'text', text: line.substring(3), styles: {} }]
              });
            } else if (line.startsWith('### ')) {
              // H3
              blocks.push({
                id: `block-${blockId++}`,
                type: 'heading',
                props: { level: 3 },
                content: [{ type: 'text', text: line.substring(4), styles: {} }]
              });
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
              // Bullet list item
              blocks.push({
                id: `block-${blockId++}`,
                type: 'bulletListItem',
                content: [{ type: 'text', text: line.substring(2), styles: {} }]
              });
            } else if (line.match(/^\d+\.\s/)) {
              // Numbered list item
              const text = line.replace(/^\d+\.\s/, '');
              blocks.push({
                id: `block-${blockId++}`,
                type: 'numberedListItem',
                content: [{ type: 'text', text, styles: {} }]
              });
            } else {
              // Regular paragraph - handle bold and italic
              const parts: Array<{ type: string; text: string; styles: Record<string, boolean> }> = [];

              // Simple parsing for bold (**text**) and italic (*text*)
              const boldItalicRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|[^*]+)/g;
              const matches = line.match(boldItalicRegex);

              if (matches) {
                matches.forEach(match => {
                  if (match.startsWith('**') && match.endsWith('**')) {
                    // Bold
                    parts.push({ type: 'text', text: match.slice(2, -2), styles: { bold: true } });
                  } else if (match.startsWith('*') && match.endsWith('*')) {
                    // Italic
                    parts.push({ type: 'text', text: match.slice(1, -1), styles: { italic: true } });
                  } else if (match) {
                    // Plain text
                    parts.push({ type: 'text', text: match, styles: {} });
                  }
                });
              }

              blocks.push({
                id: `block-${blockId++}`,
                type: 'paragraph',
                content: parts.length > 0 ? parts : [{ type: 'text', text: line, styles: {} }]
              });
            }
          }

          return blocks;
        };

        const blockNoteContent = convertMarkdownToBlockNote(generatedContent);

        // Save playbook to database if requested
        let savedPlaybook = null;
        if (savePlaybook && userId) {
          try {
            sendEvent('status', { message: 'Saving playbook...' });

            // Get user's organization using admin client
            const { data: profile } = await supabase
              .from('profiles')
              .select('organization_id')
              .eq('id', userId)
              .single();

            const profileData = profile as { organization_id: string | null } | null;

            // Generate title if not provided
            const playbookTitle = title || `${type.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - ${new Date().toLocaleDateString()}`;

            console.log('Attempting to save playbook:', {
              title: playbookTitle,
              userId,
              organizationId: profileData?.organization_id,
              documentIdsCount: documentIds.length
            });

            // Insert playbook into database using admin client (bypasses RLS)
            // Store as BlockNote JSON format
            const { data: playbook, error: insertError } = await (supabase as any)
              .from('playbooks')
              .insert({
                title: playbookTitle,
                content: JSON.stringify(blockNoteContent),
                type,
                user_id: userId,
                organization_id: profileData?.organization_id || null,
                is_shared: true, // Default to shared
                document_ids: documentIds,
                content_sections: ['all-content']
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error saving playbook:', insertError);
              console.error('Insert error details:', {
                message: insertError.message,
                code: insertError.code,
                details: insertError.details,
                hint: insertError.hint
              });
              // Don't throw - we still want to return the generated content
            } else {
              savedPlaybook = playbook;
              console.log(`Successfully saved playbook with ID: ${(playbook as any)?.id}`);
            }
          } catch (saveError) {
            // Log but don't fail the entire request if saving fails
            console.error('Error in playbook save process:', saveError);
            if (saveError instanceof Error) {
              console.error('Save error details:', {
                message: saveError.message,
                stack: saveError.stack
              });
            }
          }
        } else if (savePlaybook && !userId) {
          console.error('Cannot save playbook: userId not provided in request');
        }

        // Send final success event
        sendEvent('complete', {
          content: generatedContent,
          type,
          sourceDocuments: validDocuments.length,
          generatedAt: new Date().toISOString(),
          playbook: savedPlaybook
        });

        controller.close();

      } catch (error) {
        console.error('Error generating playbook:', error);

        // Log full error details for debugging
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        }

        // Provide more specific error messages
        let errorMessage = 'Failed to generate content. Please try again.';
        if (error instanceof Error) {
          if (error.message.includes('API key')) {
            errorMessage = 'AI service configuration error. Please contact support.';
          } else if (error.message.includes('token')) {
            errorMessage = 'Content too long. Try selecting fewer or shorter documents.';
          } else if (error.message.includes('rate limit')) {
            errorMessage = 'AI service rate limit exceeded. Please try again later.';
          }
        }

        sendEvent('error', { error: errorMessage });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
