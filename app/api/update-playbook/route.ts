import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const body = await req.json();
    const { playbookId, documentIds, newDocumentIds, additionalContext, userId } = body;

    if (!playbookId) {
      return NextResponse.json(
        { error: 'Playbook ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
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

    // Fetch the existing playbook
    const { data: playbook, error: playbookError } = await supabase
      .from('playbooks')
      .select('*')
      .eq('id', playbookId)
      .single();

    if (playbookError || !playbook) {
      console.error('Error fetching playbook:', playbookError);
      return NextResponse.json(
        { error: 'Playbook not found' },
        { status: 404 }
      );
    }

    // Cast to any to avoid TypeScript errors with Supabase types
    const playbookData = playbook as any;

    // Verify ownership
    if (playbookData.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to update this playbook' },
        { status: 403 }
      );
    }

    // If there are no new documents and no additional context, return early
    if ((!newDocumentIds || newDocumentIds.length === 0) && !additionalContext) {
      // Just update the document_ids array
      const { error: updateError } = await supabase
        .from('playbooks')
        .update({
          document_ids: documentIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', playbookId);

      if (updateError) {
        console.error('Error updating playbook:', updateError);
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: 'Playbook document list updated'
      });
    }

    // Fetch new documents if any
    let newDocumentsContent = '';
    if (newDocumentIds && newDocumentIds.length > 0) {
      const { data: newDocuments, error: docsError } = await supabase
        .from('documents')
        .select(`
          *,
          profiles:user_id (
            full_name,
            role,
            years_of_experience
          )
        `)
        .in('id', newDocumentIds);

      if (docsError) {
        console.error('Database error fetching documents:', docsError);
        throw docsError;
      }

      if (!newDocuments || newDocuments.length === 0) {
        return NextResponse.json(
          { error: 'No new documents found' },
          { status: 404 }
        );
      }

      // Filter valid documents and prepare content
      const validDocuments = newDocuments.filter((doc: any) => doc.content && doc.content.trim().length > 0);

      if (validDocuments.length === 0) {
        return NextResponse.json(
          { error: 'Selected new documents have no content' },
          { status: 400 }
        );
      }

      newDocumentsContent = validDocuments.map((doc: any) => {
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
    }

    console.log(`Updating playbook "${playbookData.title}" with ${newDocumentIds?.length || 0} new experiences.`);

    // Create update prompt
    let prompt = `You are updating an existing playbook by incorporating new information.

EXISTING PLAYBOOK:
Title: ${playbookData.title}
Type: ${playbookData.type}

Content:
${playbookData.content}

=== YOUR TASK ===

Update the existing playbook with the following:
`;

    if (newDocumentsContent) {
      prompt += `
NEW EXPERIENCES TO INCORPORATE:
${newDocumentsContent}

Analyze these new experiences for fresh insights, patterns, and best practices.
`;
    }

    if (additionalContext) {
      prompt += `
ADDITIONAL CONTEXT/INSTRUCTIONS:
${additionalContext}

Follow these specific instructions when updating the playbook.
`;
    }

    prompt += `
When updating the playbook:

1. ${newDocumentsContent ? 'Integrate the new experiences into existing sections where relevant' : 'Apply the additional context to enhance the content'}
2. ${newDocumentsContent ? 'Add new sections if the new experiences introduce significant new concepts' : 'Update sections based on the provided context'}
3. Ensure the updated playbook maintains its structure and flow
4. ${newDocumentsContent ? 'Highlight where new experiences enhance or contradict existing guidance' : 'Ensure all updates align with the provided context'}
5. Update any examples, case studies, or recommendations based on the new information
6. Maintain the same professional tone and format

PRESERVE THE EXISTING STRUCTURE as much as possible, but enhance it with the new information.

TARGET AUDIENCE: The same audience as the original playbook (${playbookData.type}).

LENGTH: Maintain similar length to original, expanded only where new content adds significant value.

=== UPDATED PLAYBOOK ===

Return ONLY the complete updated playbook content (not the title, just the content). Maintain the same formatting style as the original.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
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

    // Update the playbook in the database
    const { error: updateError } = await supabase
      .from('playbooks')
      .update({
        content: updatedContent,
        document_ids: documentIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', playbookId);

    if (updateError) {
      console.error('Error updating playbook in database:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      playbookId: playbookId,
      updatedAt: new Date().toISOString(),
      newExperiencesAdded: newDocumentIds?.length || 0
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
          { error: 'Content too long. Try selecting fewer documents or provide less context.' },
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
