import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface AISummary {
  executive_summary: string;
  key_insights: string;
  tactical_details: string;
  challenges_solutions: string;
  topics?: string[];
  skill_areas?: string[];
}

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // Fetch the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Database error fetching document:', docError);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Type assertion for document since TypeScript doesn't know the shape yet
    const doc = document as any;

    if (!doc.content || doc.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document has no content to summarize' },
        { status: 400 }
      );
    }

    console.log(`Generating AI summary for document: ${doc.id} (${doc.content.length} chars)`);

    // Generate AI-optimized summary using Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 3000,
      temperature: 0.5,
      messages: [{
        role: 'user',
        content: `Extract key information from this document for efficient AI retrieval and playbook generation.

DOCUMENT TITLE: ${doc.title}

DOCUMENT CONTENT:
${doc.content}

YOUR TASK:
Extract and structure this content into intelligent summaries that preserve ALL critical nuances, insights, and tactical details. Focus on information density and actionability.

OUTPUT (JSON):
{
  "executive_summary": "500-character overview focusing on WHAT happened and the core outcome",
  "key_insights": "1000 characters of CRITICAL NUANCES and lessons - the subtle details, counterintuitive insights, and wisdom that made the difference. This is the most valuable section.",
  "tactical_details": "1500 characters of HOW they did it - specific actions, methods, frameworks, and step-by-step approaches they used",
  "challenges_solutions": "1000 characters of problems encountered and how they solved them - include the thought process and pivots",
  "topics": ["keyword1", "keyword2", "keyword3"],
  "skill_areas": ["skill1", "skill2", "skill3"]
}

CRITICAL REQUIREMENTS:
1. Preserve ALL nuances and counterintuitive insights - these are gold for playbooks
2. Include specific tactics and methods, not generic advice
3. Capture the "why" behind decisions, not just the "what"
4. Focus on actionable, transferable knowledge
5. Maintain the expert's voice and perspective
6. Topics should be 2-3 word phrases (e.g., "champion-departure", "stakeholder-mapping")
7. Skill areas should be clear competencies (e.g., "relationship-building", "crisis-management")

Return ONLY valid JSON, no other text.`
      }]
    });

    const summaryText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse the JSON response
    let summary: AISummary;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = summaryText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
                       summaryText.match(/(\{[\s\S]*\})/);
      const jsonText = jsonMatch ? jsonMatch[1] : summaryText;
      summary = JSON.parse(jsonText) as AISummary;
    } catch {
      console.error('Failed to parse AI summary response:', summaryText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate required fields
    if (!summary.executive_summary || !summary.key_insights ||
        !summary.tactical_details || !summary.challenges_solutions) {
      throw new Error('AI summary missing required fields');
    }

    // Calculate importance scores based on content density
    const importanceScores = {
      nuance_density: Math.min(1, summary.key_insights.length / 1000),
      actionability: Math.min(1, summary.tactical_details.length / 1500),
      challenge_coverage: Math.min(1, summary.challenges_solutions.length / 1000)
    };

    // Check if summary already exists
    // Type assertion needed until migration is run and types are regenerated
    const { data: existingSummary } = await (supabase as any)
      .from('document_ai_summaries')
      .select('id')
      .eq('document_id', documentId)
      .single();

    if (existingSummary) {
      // Update existing summary
      const { error: updateError } = await (supabase as any)
        .from('document_ai_summaries')
        .update({
          executive_summary: summary.executive_summary,
          key_insights: summary.key_insights,
          tactical_details: summary.tactical_details,
          challenges_solutions: summary.challenges_solutions,
          topics: summary.topics || [],
          skill_areas: summary.skill_areas || [],
          importance_scores: importanceScores,
          updated_at: new Date().toISOString()
        })
        .eq('document_id', documentId);

      if (updateError) {
        console.error('Error updating AI summary:', updateError);
        throw updateError;
      }

      console.log(`Updated AI summary for document ${documentId}`);
    } else {
      // Insert new summary
      const { error: insertError } = await (supabase as any)
        .from('document_ai_summaries')
        .insert({
          document_id: documentId,
          executive_summary: summary.executive_summary,
          key_insights: summary.key_insights,
          tactical_details: summary.tactical_details,
          challenges_solutions: summary.challenges_solutions,
          topics: summary.topics || [],
          skill_areas: summary.skill_areas || [],
          importance_scores: importanceScores
        });

      if (insertError) {
        console.error('Error inserting AI summary:', insertError);
        throw insertError;
      }

      console.log(`Created AI summary for document ${documentId}`);
    }

    return NextResponse.json({
      success: true,
      documentId,
      summary: {
        ...summary,
        importance_scores: importanceScores
      }
    });

  } catch (error) {
    console.error('Error generating AI summary:', error);

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service configuration error. Please contact support.' },
          { status: 500 }
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
      { error: 'Failed to generate AI summary. Please try again.' },
      { status: 500 }
    );
  }
}
