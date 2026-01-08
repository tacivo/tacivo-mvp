import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// Function to filter document content based on selected sections
function filterDocumentContent(content: string, contentSections: string[]): string {
  if (!contentSections || contentSections.includes('all-content')) {
    // Limit each document to ~5k characters to prevent token overflow
    return content.length > 5000 ? content.substring(0, 5000) + '...' : content;
  }

  const lines = content.split('\n');
  const filteredLines: string[] = [];
  let currentSection = '';
  let includeSection = false;

  for (const line of lines) {
    // Check for section headers
    if (line.startsWith('## ')) {
      const sectionTitle = line.substring(3).toLowerCase().trim();
      currentSection = sectionTitle;
      includeSection = false;

      // Check if this section should be included
      if (contentSections.includes('executive-summary') && sectionTitle.includes('executive summary')) {
        includeSection = true;
      } else if (contentSections.includes('key-decisions') && (sectionTitle.includes('key decisions') || sectionTitle.includes('decisions & actions'))) {
        includeSection = true;
      } else if (contentSections.includes('challenges-pivots') && (sectionTitle.includes('challenges') || sectionTitle.includes('pivots'))) {
        includeSection = true;
      } else if (contentSections.includes('results-outcomes') && (sectionTitle.includes('results') || sectionTitle.includes('outcomes'))) {
        includeSection = true;
      } else if (contentSections.includes('lessons-learned') && sectionTitle.includes('lessons learned')) {
        includeSection = true;
      }

      if (includeSection) {
        filteredLines.push(line);
      }
    } else if (line.startsWith('# ') && contentSections.includes('executive-summary') && line.substring(2).toLowerCase().includes('executive summary')) {
      // Handle main headers that might be executive summary
      includeSection = true;
      filteredLines.push(line);
    } else if (includeSection) {
      filteredLines.push(line);
    }
  }

  const filteredContent = filteredLines.join('\n');
  // Limit to ~5k characters even after filtering
  return filteredContent.length > 5000 ? filteredContent.substring(0, 5000) + '...' : filteredContent;
}

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const { documentIds, type, contentSections } = await req.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 documents must be selected' },
        { status: 400 }
      );
    }

    if (!type || !['sales-playbook', 'customer-success-guide', 'operational-procedures', 'strategic-planning-document'].includes(type)) {
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

    if (validDocuments.length < 2) {
      return NextResponse.json(
        { error: `Only ${validDocuments.length} documents have content. Need at least 2 documents with content.` },
        { status: 400 }
      );
    }

    // Combine all document content with length limits
    const combinedContent = validDocuments.map((doc: any) => {
      const profile = doc.profiles;
      // Filter content based on selected sections
      const filteredContent = filterDocumentContent(doc.content, contentSections || ['all-content']);

      return `=== ${doc.title} ===

Author: ${profile?.full_name || 'Unknown'} (${profile?.role || 'Unknown role'})
Type: ${doc.document_type}
Content:
${filteredContent}

---`;
    }).join('\n\n');

    console.log(`Generating ${type} from ${validDocuments.length} documents. Total content length: ${combinedContent.length} characters`);

    // Create generation prompt based on type
    let prompt = '';
    switch (type) {
      case 'sales-playbook':
        prompt = `You are creating a comprehensive sales playbook by synthesizing insights from ${validDocuments.length} different experiences and best practices.

SOURCE DOCUMENTS:
${combinedContent}

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

SOURCE DOCUMENTS:
${combinedContent}

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
        
SOURCE DOCUMENTS:
${combinedContent}

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

SOURCE DOCUMENTS:
${combinedContent}

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