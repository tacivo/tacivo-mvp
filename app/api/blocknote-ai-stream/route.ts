import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages } from 'ai';
import {
  aiDocumentFormats,
  toolDefinitionsToToolSet,
  injectDocumentStateMessages,
} from '@blocknote/xl-ai/server';

export async function POST(req: Request) {
  try {
    const { messages, toolDefinitions } = await req.json();

    // Inject document state into messages for the LLM
    const messagesWithContext = injectDocumentStateMessages(messages);

    // Convert BlockNote tool definitions to AI SDK tools
    const tools = toolDefinitionsToToolSet(toolDefinitions);

    // Stream response using Anthropic Claude
    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: aiDocumentFormats.html.systemPrompt,
      messages: await convertToModelMessages(messagesWithContext),
      tools,
    });

    // Return as UI message stream (SSE format expected by BlockNote AI)
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('BlockNote AI API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process AI request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
