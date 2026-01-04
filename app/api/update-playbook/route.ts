import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const formData = await req.formData();
    const playbookFile = formData.get('playbook') as File;
    const documentIdsString = formData.get('documentIds') as string;

    if (!playbookFile) {
      return NextResponse.json(
        { error: 'No playbook file provided' },
        { status: 400 }
      );
    }

    let documentIds: string[];
    try {
      documentIds = JSON.parse(documentIdsString);
    } catch {
      return NextResponse.json(
        { error: 'Invalid document IDs' },
        { status: 400 }
      );
    }

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'At least 1 document must be selected' },
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

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents found. Please ensure you have completed interviews and generated documents.' },
        { status: 404 }
      );
    }

    // Check if documents have content and filter out empty ones
    const validDocuments = documents.filter((doc: any) => doc.content && doc.content.trim().length > 0);

    if (validDocuments.length === 0) {
      return NextResponse.json(
        { error: 'Selected documents have no content.' },
        { status: 400 }
      );
    }

    // Extract text from uploaded playbook file
    let existingPlaybookContent = '';
    try {
      if (playbookFile.type === 'text/plain') {
        existingPlaybookContent = await playbookFile.text();
      } else if (playbookFile.name.endsWith('.txt')) {
        existingPlaybookContent = await playbookFile.text();
      } else {
        // For PDF/DOCX, we'd need additional libraries like pdf-parse or mammoth
        // For now, return an error
        return NextResponse.json(
          { error: 'File format not supported. Please upload a TXT file for now.' },
          { status: 400 }
        );
      }
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return NextResponse.json(
        { error: 'Failed to read uploaded file' },
        { status: 400 }
      );
    }

    // Combine new document content with length limits
    const newExperiencesContent = validDocuments.map((doc: any) => {
      const profile = doc.profiles;
      // Limit each document to ~3k characters to prevent token overflow
      const content = doc.content.length > 3000 ? doc.content.substring(0, 3000) + '...' : doc.content;

      return `=== ${doc.title} ===

Author: ${profile?.full_name || 'Unknown'} (${profile?.role || 'Unknown role'})
Type: ${doc.document_type}
Content:
${content}

---`;
    }).join('\n\n');

    console.log(`Updating playbook with ${validDocuments.length} new experiences. Existing content length: ${existingPlaybookContent.length}, New content length: ${newExperiencesContent.length}`);

    // Create update prompt
    const prompt = `You are updating an existing playbook by incorporating new experiences and insights.

EXISTING PLAYBOOK:
${existingPlaybookContent}

NEW EXPERIENCES TO INCORPORATE:
${newExperiencesContent}

=== YOUR TASK ===

Update the existing playbook by integrating the new experiences. You should:

1. Analyze the new experiences for fresh insights, patterns, and best practices
2. Update existing sections with new information where relevant
3. Add new sections if the new experiences introduce significant new concepts
4. Ensure the updated playbook maintains its structure and flow
5. Highlight where new experiences contradict or enhance existing guidance
6. Update any examples, case studies, or recommendations based on the new data

PRESERVE THE EXISTING STRUCTURE as much as possible, but enhance it with the new insights.

TARGET AUDIENCE: The same audience as the original playbook.

LENGTH: Maintain similar length to original, expanded only where new content adds significant value.

=== UPDATED PLAYBOOK ===

Return the complete updated playbook with all original content integrated with the new experiences.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const updatedContent = response.content[0].type === 'text' ? response.content[0].text : '';

    console.log(`Successfully updated playbook. New length: ${updatedContent.length} characters`);

    return NextResponse.json({
      content: updatedContent,
      updatedAt: new Date().toISOString(),
      newExperiencesAdded: validDocuments.length
    });

  } catch (error) {
    console.error('Error updating playbook:', error);

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
          { error: 'Content too long. Try selecting fewer documents or a shorter playbook.' },
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
      { error: 'Failed to update playbook. Please try again.' },
      { status: 500 }
    );
  }
}