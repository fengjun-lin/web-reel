import { NextRequest, NextResponse } from 'next/server';

/**
 * Jira API Proxy
 * Replaces Vite's proxy configuration
 * Handles authentication server-side for security
 */

export async function POST(request: NextRequest, segmentData: { params: Promise<{ path: string[] }> }) {
  try {
    // Next.js 16: params is now a Promise
    const params = await segmentData.params;
    const body = await request.json();
    const path = params.path.join('/');

    // Get credentials from server-side environment variables (more secure)
    const email = process.env.JIRA_USER_EMAIL;
    const apiToken = process.env.JIRA_API_KEY;
    const domain = process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'sedna-tech.atlassian.net';

    if (!email || !apiToken) {
      console.error('[Jira API] Missing credentials');
      return NextResponse.json(
        { error: 'Missing Jira credentials. Please configure JIRA_USER_EMAIL and JIRA_API_KEY in .env.local' },
        { status: 500 },
      );
    }

    // Create Basic Auth header
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    console.log(`[Jira API] POST /${path}`);

    // Forward request to Jira
    const response = await fetch(`https://${domain}/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Atlassian-Token': 'no-check',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Jira API] Error:', response.status, data);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Jira API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to Jira', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest, segmentData: { params: Promise<{ path: string[] }> }) {
  try {
    // Next.js 16: params is now a Promise
    const params = await segmentData.params;
    const path = params.path.join('/');

    const email = process.env.JIRA_USER_EMAIL;
    const apiToken = process.env.JIRA_API_KEY;
    const domain = process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'sedna-tech.atlassian.net';

    if (!email || !apiToken) {
      console.error('[Jira API] Missing credentials');
      return NextResponse.json({ error: 'Missing Jira credentials' }, { status: 500 });
    }

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    console.log(`[Jira API] GET /${path}`);

    const response = await fetch(`https://${domain}/${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'X-Atlassian-Token': 'no-check',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Jira API] Error:', response.status, data);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Jira API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to Jira', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
