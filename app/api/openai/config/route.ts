/**
 * OpenAI Configuration API
 * Server-side API to check OpenAI configuration status
 */

import { NextResponse } from 'next/server';

import { getKeyPool } from '@/utils/openaiKeyPool';

/**
 * GET /api/openai/config
 * Returns the configuration status without exposing the actual API key
 */
export async function GET() {
  try {
    const keyPool = getKeyPool();
    const keyPoolStats = keyPool.getStats();

    const config = {
      hasApiKey: true,
      apiBase: process.env.NEXT_PUBLIC_OPENAI_API_BASE || 'https://api.openai.com/v1',
      model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini',
      keyPoolStats: {
        total: keyPoolStats.total,
        healthy: keyPoolStats.healthy,
        unhealthy: keyPoolStats.unhealthy,
      },
    };

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Failed to get OpenAI config:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get configuration',
      },
      { status: 500 },
    );
  }
}
