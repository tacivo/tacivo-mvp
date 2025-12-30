import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const { documentIds, type } = await req.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 5) {
      return NextResponse.json(
        { error: 'At least 5 documents must be selected' },
        { status: 400 }
      );
    }

    if (!type || !['playbook', 'guide', 'best-practices', 'company-document'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid generation type' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // Fetch all selected documents
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
      throw error;
    }

    console.log(`Fetched ${documents?.length || 0} documents for IDs:`, documentIds);
    console.log('Document details:', documents?.map((d: any) => ({ id: d.id, title: d.title, contentLength: d.content?.length || 0, hasContent: !!(d.content && d.content.trim()) })));

    if (!documents || documents.length === 0) {
      console.error(`No documents found for IDs:`, documentIds);
      return NextResponse.json(
        { error: 'No documents found. Please ensure you have completed interviews and generated documents.' },
        { status: 404 }
      );
    }

    // Check if documents have content and filter out empty ones
    const validDocuments = documents.filter((doc: any) => doc.content && doc.content.trim().length > 0);

    if (validDocuments.length < 5) {
      return NextResponse.json(
        { error: `Only ${validDocuments.length} documents have content. Need at least 5 documents with content.` },
        { status: 400 }
      );
    }

    // Combine all document content with length limits
    const combinedContent = validDocuments.map((doc: any) => {
      const profile = doc.profiles;
      // Limit each document to ~5k characters to prevent token overflow
      const content = doc.content.length > 5000 ? doc.content.substring(0, 5000) + '...' : doc.content;

      return `=== ${doc.title} ===

Author: ${profile?.full_name || 'Unknown'} (${profile?.role || 'Unknown role'})
Type: ${doc.document_type}
Content:
${content}

---`;
    }).join('\n\n');

    console.log(`Generating ${type} from ${validDocuments.length} documents. Total content length: ${combinedContent.length} characters`);

    // Create generation prompt based on type
    let prompt = '';
    switch (type) {
      case 'playbook':
        prompt = `You are creating a comprehensive playbook by synthesizing insights from ${validDocuments.length} different experiences and best practices.

SOURCE DOCUMENTS:
${combinedContent}

=== YOUR TASK ===

Create a detailed playbook that combines the best practices, methodologies, and insights from all these experiences. The playbook should:

1. Identify common patterns and themes across all experiences
2. Create a step-by-step framework that incorporates the most effective approaches
3. Include decision trees for different scenarios
4. Provide templates and checklists
5. Address potential challenges and mitigation strategies

TARGET AUDIENCE: Teams and individuals who need a complete operational guide.

LENGTH: 5-8 pages. Be thorough but practical.

=== PLAYBOOK STRUCTURE ===

# [Generated Title Based on Common Themes]

*Comprehensive playbook synthesized from ${validDocuments.length} expert experiences*

---

## Executive Summary

[Overview of the playbook's scope and key insights]

## Core Framework

[Step-by-step methodology combining best approaches]

## Key Patterns & Best Practices

[Common themes and proven strategies]

## Decision Framework

[When to use different approaches]

## Implementation Templates

[Checklists, templates, and tools]

## Common Challenges & Solutions

[Problems encountered and how to address them]

## Case Studies

[Anonymized examples from the source experiences]

## Resources & Next Steps

[Additional tools and continuous improvement]

---
*Generated from experiences by: ${validDocuments.map((d: any) => d.profiles?.full_name).filter(Boolean).join(', ')}*`;
        break;

      case 'guide':
        prompt = `You are creating a practical guide by synthesizing insights from ${validDocuments.length} different experiences.

SOURCE DOCUMENTS:
${combinedContent}

=== YOUR TASK ===

Create a 3-5 page practical guide that captures the most effective approaches and insights from all these experiences.

TARGET AUDIENCE: Practitioners who need actionable guidance.

LENGTH: 3-5 pages maximum.

=== GUIDE STRUCTURE ===

# Practical Guide: [Generated Title]

*Based on insights from ${validDocuments.length} expert experiences*

---

## Overview

[What this guide covers and why it matters]

## Core Methodology

[Step-by-step approach combining best practices]

## Key Insights & Patterns

[Most important lessons learned]

## Actionable Recommendations

[Specific steps to implement]

## Common Pitfalls to Avoid

[What to watch out for]

---
*Compiled from experiences by: ${validDocuments.map((d: any) => d.profiles?.full_name).filter(Boolean).join(', ')}*`;
        break;

      case 'best-practices':
        prompt = `You are creating a best practices document by synthesizing insights from ${validDocuments.length} different experiences.

SOURCE DOCUMENTS:
${combinedContent}

=== YOUR TASK ===

Create a comprehensive best practices guide that distills the most effective approaches from all these experiences.

TARGET AUDIENCE: Teams looking to establish standards and improve their processes.

LENGTH: 4-6 pages.

=== BEST PRACTICES STRUCTURE ===

# Best Practices Guide

*Distilled from ${validDocuments.length} expert experiences*

---

## Introduction

[Context and importance]

## Essential Best Practices

[Core principles and standards]

## Implementation Guidelines

[How to apply these practices]

## Success Metrics

[How to measure effectiveness]

## Common Mistakes to Avoid

[What not to do]

---
*Based on experiences by: ${documents.map((d: any) => d.profiles?.full_name).filter(Boolean).join(', ')}*`;
        break;

      case 'company-document':
        prompt = `You are creating a company-standard document by synthesizing insights from ${validDocuments.length} different experiences.

SOURCE DOCUMENTS:
${combinedContent}

=== YOUR TASK ===

Create a standardized company document that establishes official guidelines based on the collective experience.

TARGET AUDIENCE: Company-wide standard operating procedures.

LENGTH: 6-10 pages.

=== COMPANY DOCUMENT STRUCTURE ===

# [Company] Standard Operating Procedures

*Official guidelines based on ${validDocuments.length} expert experiences*

---

## Purpose & Scope

[What this document covers]

## Standard Processes

[Official procedures and workflows]

## Quality Standards

[Requirements and expectations]

## Roles & Responsibilities

[Who does what]

## Compliance & Auditing

[How to ensure adherence]

## Training & Development

[How to maintain standards]

---
*Approved based on experiences by: ${validDocuments.map((d: any) => d.profiles?.full_name).filter(Boolean).join(', ')}*`;
        break;
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 6000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const generatedContent = response.content[0].type === 'text' ? response.content[0].text : '';

    console.log(`Successfully generated ${type} content of length: ${generatedContent.length} characters`);

    return NextResponse.json({
      content: generatedContent,
      type,
      sourceDocuments: validDocuments.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating playbook:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service configuration error. Please contact support.' },
          { status: 500 }
        );
      }
      if (error.message.includes('token')) {
        return NextResponse.json(
          { error: 'Content too long. Try selecting fewer or shorter documents.' },
          { status: 400 }
        );
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'AI service rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate content. Please try again.' },
      { status: 500 }
    );
  }
}