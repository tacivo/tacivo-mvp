import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('[BlockNote AI] Received request')
    const body = await request.json()
    console.log('[BlockNote AI] Request body:', JSON.stringify(body, null, 2))

    const { prompt, selectedText, operation } = body

    if (!prompt && !operation) {
      console.log('[BlockNote AI] Error: No prompt or operation provided')
      return NextResponse.json(
        { error: 'Prompt or operation is required' },
        { status: 400 }
      )
    }

    // Define system prompts for different operations
    const systemPrompts: Record<string, string> = {
      improve: 'You are a professional editor. Improve the following text to make it clearer, more concise, and more professional. Maintain the original meaning and tone. Return only the improved text without any explanation.',
      fix: 'You are a professional editor. Fix any grammar, spelling, and punctuation errors in the following text. Maintain the original meaning and style. Return only the corrected text without any explanation.',
      simplify: 'You are a professional editor. Simplify the following text to make it easier to understand while maintaining accuracy. Use simpler words and shorter sentences. Return only the simplified text without any explanation.',
      expand: 'You are a professional writer. Expand the following text by adding more detail, examples, or context while maintaining the original message. Return only the expanded text without any explanation.',
      shorten: 'You are a professional editor. Make the following text more concise by removing unnecessary words while keeping the core message intact. Return only the shortened text without any explanation.',
      professional: 'You are a professional business writer. Rewrite the following text in a more professional and formal tone suitable for business documentation. Return only the rewritten text without any explanation.',
      casual: 'You are a conversational writer. Rewrite the following text in a more casual and friendly tone while keeping it professional enough for workplace communication. Return only the rewritten text without any explanation.',
      continue: 'You are a professional writer. Continue the following text in a natural way that maintains the style and context. Write 2-3 sentences that logically follow. Return only the continuation without any introduction.',
    }

    const systemPrompt = operation && systemPrompts[operation]
      ? systemPrompts[operation]
      : 'You are a helpful AI writing assistant. Follow the user\'s instructions precisely and return only the requested content without any explanation or meta-commentary.'

    const userPrompt = operation
      ? selectedText || ''
      : prompt

    console.log('[BlockNote AI] Operation:', operation)
    console.log('[BlockNote AI] User prompt length:', userPrompt?.length)
    console.log('[BlockNote AI] API Key present:', !!process.env.ANTHROPIC_API_KEY)

    if (!userPrompt) {
      console.log('[BlockNote AI] Error: No text provided')
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      )
    }

    // Call Claude API
    console.log('[BlockNote AI] Calling Anthropic API...')
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ],
      system: systemPrompt
    })
    console.log('[BlockNote AI] Anthropic API response received')

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    console.log('[BlockNote AI] Response text length:', responseText.length)
    return NextResponse.json({ text: responseText })

  } catch (error: any) {
    console.error('[BlockNote AI] Error caught:', error)
    console.error('[BlockNote AI] Error name:', error?.name)
    console.error('[BlockNote AI] Error message:', error?.message)
    console.error('[BlockNote AI] Error stack:', error?.stack)

    return NextResponse.json(
      {
        error: 'Failed to process AI request',
        details: error?.message || 'Unknown error',
        errorName: error?.name,
        errorType: typeof error
      },
      { status: 500 }
    )
  }
}
