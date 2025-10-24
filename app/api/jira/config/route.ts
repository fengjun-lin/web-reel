/**
 * Jira Configuration API
 * Server-side API to check Jira configuration status
 */

import { NextResponse } from 'next/server';

/**
 * GET /api/jira/config
 * Returns the configuration status without exposing the actual API key
 */
export async function GET() {
  try {
    const config = {
      hasApiKey: !!process.env.JIRA_API_KEY,
      hasUserEmail: !!process.env.JIRA_USER_EMAIL,
      domain: process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'web-reel.atlassian.net',
      projectKey: process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || 'WR',
    };

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Failed to get Jira config:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get configuration',
      },
      { status: 500 },
    );
  }
}
