/**
 * OpenAI Chat Completion API Proxy
 * Server-side proxy to safely call OpenAI API without exposing API key to client
 */

import { NextRequest, NextResponse } from 'next/server';

import { getKeyPool } from '@/utils/openaiKeyPool';

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
 * Call OpenAI API with retry and key pool support
 */
async function callOpenAIWithRetry(
  apiUrl: string,
  body: string,
  apiKey: string,
  accountId: string,
  maxRetries = 2,
): Promise<Response> {
  let lastError: string = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body,
      });

      if (response.ok) {
        return response;
      }

      // Handle rate limiting (429)
      if (response.status === 429) {
        lastError = `Rate limited on ${accountId}`;

        // Mark this key as failed and try next key
        const keyPool = getKeyPool();
        keyPool.markKeyFailed(apiKey, 'Rate limit exceeded');

        // Get next available key
        const { apiKey: nextKey, accountId: nextAccountId } = keyPool.getNextKeyWithInfo();
        console.log(`Switching to ${nextAccountId} due to rate limit`);

        if (attempt < maxRetries) {
          return callOpenAIWithRetry(apiUrl, body, nextKey, nextAccountId, maxRetries - attempt - 1);
        }
      }

      // Handle authentication errors (401)
      if (response.status === 401) {
        lastError = `Authentication failed on ${accountId}`;
        const keyPool = getKeyPool();
        keyPool.markKeyFailed(apiKey, 'Authentication failed');

        const { apiKey: nextKey, accountId: nextAccountId } = keyPool.getNextKeyWithInfo();
        if (attempt < maxRetries) {
          return callOpenAIWithRetry(apiUrl, body, nextKey, nextAccountId, maxRetries - attempt - 1);
        }
      }

      // Other errors
      const error = await response.json().catch(() => ({}));
      lastError = error.error?.message || `HTTP ${response.status}`;

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw error;
    }
  }

  throw new Error(lastError || 'API call failed');
}

/**
 * POST /api/openai/chat
 * Proxy chat completion requests to OpenAI API
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize key pool
    const keyPool = getKeyPool();
    const { apiKey, accountId } = keyPool.getNextKeyWithInfo();

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

    // Call OpenAI API with retry logic
    const apiUrl = `${apiBase}/chat/completions`;
    const requestBody = JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
    });

    console.log(`[OpenAI] Using ${accountId} for API call`);
    const response = await callOpenAIWithRetry(apiUrl, requestBody, apiKey, accountId);

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
