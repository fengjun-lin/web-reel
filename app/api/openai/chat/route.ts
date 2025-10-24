/**
 * OpenAI Chat Completion API Proxy
 * Server-side proxy to safely call OpenAI API without exposing API key to client
 */

import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * POST /api/openai/chat
 * Proxy chat completion requests to OpenAI API
 */
export async function POST(request: NextRequest) {
  try {
    // Get API key from environment (server-side only)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'OpenAI API key is not configured on the server',
        },
        { status: 500 },
      );
    }

    // Get request body
    const body: ChatCompletionRequest = await request.json();
    const { messages, temperature = 0.7, maxTokens = 2000, stream = false } = body;

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: messages array is required',
        },
        { status: 400 },
      );
    }

    // Get API configuration
    const apiBase = process.env.NEXT_PUBLIC_OPENAI_API_BASE || 'https://api.openai.com/v1';
    const model = process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';

    // Call OpenAI API
    const apiUrl = `${apiBase}/chat/completions`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: `OpenAI API error: ${response.status} ${response.statusText}`,
          details: error.error?.message || '',
        },
        { status: response.status },
      );
    }

    // Handle streaming response
    if (stream) {
      // For streaming, we need to pass through the response
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle non-streaming response
    const data = await response.json();
    return NextResponse.json({
      success: true,
      content: data.choices[0]?.message?.content || '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    });
  } catch (error) {
    console.error('OpenAI API proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
