import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// Extend timeout for playbook update
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

        const body = await req.json();
        const { playbookId, uploadedContent, uploadedTitle, documentIds, newDocumentIds, additionalContext, userId } = body;

        sendEvent('status', { message: 'Validating request...' });

        // Handle uploaded file case - create new playbook from uploaded content
        const isUploadedFile = !!uploadedContent;

        if (!isUploadedFile && !playbookId) {
          sendEvent('error', { error: 'Playbook ID is required' });
          controller.close();
          return;
        }

        if (!userId) {
          sendEvent('error', { error: 'User ID is required' });
          controller.close();
          return;
        }

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
          sendEvent('error', { error: 'At least 1 document must be selected' });
          controller.close();
          return;
        }

        const supabase = supabaseAdmin;

        let playbookData: any = null;

        if (isUploadedFile) {
          sendEvent('status', { message: 'Processing uploaded file...' });
          // For uploaded files, create a temporary playbook data object
          playbookData = {
            title: uploadedTitle || 'Uploaded Playbook',
            type: 'sales-playbook', // Default type for uploaded playbooks
            content: uploadedContent,
            user_id: userId
          };
        } else {
          sendEvent('status', { message: 'Fetching playbook...' });
          // Fetch the existing playbook
          const { data: playbook, error: playbookError } = await supabase
            .from('playbooks')
            .select('*')
            .eq('id', playbookId)
            .single();

          if (playbookError || !playbook) {
            console.error('Error fetching playbook:', playbookError);
            sendEvent('error', { error: 'Playbook not found' });
            controller.close();
            return;
          }

          // Cast to any to avoid TypeScript errors with Supabase types
          playbookData = playbook as any;

          // Verify ownership
          if (playbookData.user_id !== userId) {
            sendEvent('error', { error: 'Unauthorized to update this playbook' });
            controller.close();
            return;
          }

          // If there are no new documents and no additional context, return early
          if ((!newDocumentIds || newDocumentIds.length === 0) && !additionalContext) {
            // Just update the document_ids array
            const { error: updateError } = await (supabase as any)
              .from('playbooks')
              .update({
                document_ids: documentIds,
                updated_at: new Date().toISOString()
              })
              .eq('id', playbookId);

            if (updateError) {
              console.error('Error updating playbook:', updateError);
              sendEvent('error', { error: 'Failed to update playbook document list' });
              controller.close();
              return;
            }

            sendEvent('complete', {
              success: true,
              message: 'Playbook document list updated',
              playbookId: playbookId
            });
            controller.close();
            return;
          }
        }

        sendEvent('status', { message: 'Fetching documents...' });

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
            sendEvent('error', { error: 'Failed to fetch documents' });
            controller.close();
            return;
          }

          if (!newDocuments || newDocuments.length === 0) {
            sendEvent('error', { error: 'No new documents found' });
            controller.close();
            return;
          }

          // Filter valid documents (those with plain_text) and prepare content
          const validDocuments = newDocuments.filter((doc: any) => doc.plain_text && doc.plain_text.trim().length > 0);

          if (validDocuments.length === 0) {
            sendEvent('error', { error: 'Selected new documents have no content' });
            controller.close();
            return;
          }

          newDocumentsContent = validDocuments.map((doc: any) => {
            const profile = doc.profiles;

            return `=== ${doc.title} ===

Author: ${profile?.full_name || 'Unknown'} (${profile?.role || 'Unknown role'})
Type: ${doc.document_type}

Content:
${doc.plain_text}

---`;
          }).join('\n\n');
        }

        console.log(`Updating playbook "${playbookData.title}" with ${newDocumentIds?.length || 0} new experiences.`);

        sendEvent('status', { message: 'Analyzing content...' });

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

        sendEvent('status', { message: 'Generating updated content...' });

        // Use streaming to avoid timeout
        let updatedContent = '';

        const response = await anthropic.messages.stream({
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

        // Track progress for status updates
        let chunkCount = 0;
        const statusMessages = [
          'Integrating new insights...',
          'Updating sections...',
          'Enhancing examples...',
          'Finalizing content...',
        ];

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            updatedContent += event.delta.text;
            chunkCount++;

            // Send periodic status updates
            if (chunkCount % 50 === 0) {
              const statusIndex = Math.min(Math.floor(chunkCount / 100), statusMessages.length - 1);
              sendEvent('status', { message: statusMessages[statusIndex] });
            }
          }
        }

        console.log(`Successfully updated playbook. New length: ${updatedContent.length} characters`);

        sendEvent('status', { message: 'Saving playbook...' });

        if (isUploadedFile) {
          // Create a new playbook from uploaded content
          const { data: newPlaybook, error: insertError } = await (supabase as any)
            .from('playbooks')
            .insert({
              title: playbookData.title,
              type: playbookData.type,
              content: updatedContent,
              document_ids: documentIds,
              user_id: userId,
              is_shared: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating playbook in database:', insertError);
            sendEvent('error', { error: 'Failed to save playbook' });
            controller.close();
            return;
          }

          sendEvent('complete', {
            success: true,
            playbookId: newPlaybook.id,
            updatedAt: new Date().toISOString(),
            newExperiencesAdded: documentIds?.length || 0
          });
        } else {
          // Update the existing playbook in the database
          const { error: updateError } = await (supabase as any)
            .from('playbooks')
            .update({
              content: updatedContent,
              document_ids: documentIds,
              updated_at: new Date().toISOString()
            })
            .eq('id', playbookId);

          if (updateError) {
            console.error('Error updating playbook in database:', updateError);
            sendEvent('error', { error: 'Failed to save playbook' });
            controller.close();
            return;
          }

          sendEvent('complete', {
            success: true,
            playbookId: playbookId,
            updatedAt: new Date().toISOString(),
            newExperiencesAdded: newDocumentIds?.length || 0
          });
        }

        controller.close();

      } catch (error) {
        console.error('Error updating playbook:', error);

        // Provide more specific error messages
        let errorMessage = 'Failed to update playbook. Please try again.';
        if (error instanceof Error) {
          if (error.message.includes('API key')) {
            errorMessage = 'AI service configuration error. Please contact support.';
          } else if (error.message.includes('token')) {
            errorMessage = 'Content too long. Try selecting fewer documents or provide less context.';
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
