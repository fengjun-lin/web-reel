/**
 * OpenAI Service
 * Handles communication with OpenAI API for session analysis
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onChunk?: (_chunk: string) => void;
}

export interface AnalysisResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Call OpenAI Chat Completion API via our server proxy
 * This is more secure as the API key never leaves the server
 */
export async function chatCompletion(options: ChatCompletionOptions): Promise<AnalysisResult> {
  const { messages, temperature = 0.7, maxTokens = 2000, stream = false, onChunk } = options;

  try {
    // Call our server-side API proxy instead of OpenAI directly
    const response = await fetch('/api/openai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        temperature,
        maxTokens,
        stream,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API error: ${response.status} ${response.statusText}`);
    }

    // Handle streaming response
    if (stream && onChunk) {
      return await handleStreamResponse(response, onChunk);
    }

    // Handle non-streaming response
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'API call failed');
    }

    return {
      content: data.content || '',
      usage: data.usage,
    };
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    throw error;
  }
}

/**
 * Handle streaming response from OpenAI
 */
async function handleStreamResponse(response: Response, onChunk: (_chunk: string) => void): Promise<AnalysisResult> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch (e) {
            // Skip invalid JSON chunks
            console.debug('Failed to parse SSE chunk:', e);
          }
        }
      }
    }

    return { content: fullContent };
  } finally {
    reader.releaseLock();
  }
}

/**
 * Test OpenAI connection and API key
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await chatCompletion({
      messages: [
        {
          role: 'user',
          content: 'Say "Hello" if you can hear me.',
        },
      ],
      maxTokens: 10,
    });

    return {
      success: true,
      message: `Connection successful! Response: ${result.content}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
