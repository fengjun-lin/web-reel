/**
 * Jira Ticket Creation API
 * Server-side API to create Jira tickets
 */

import { NextRequest, NextResponse } from 'next/server';

interface CreateTicketRequest {
  summary: string;
  description: string;
  issueType?: string;
}

/**
 * POST /api/jira/tickets
 * Create a new Jira ticket
 */
export async function POST(request: NextRequest) {
  try {
    // Get credentials from server-side environment variables
    const email = process.env.JIRA_USER_EMAIL;
    const apiToken = process.env.JIRA_API_KEY;
    const domain = process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'web-reel.atlassian.net';
    const projectKey = process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || 'WR';

    if (!email || !apiToken) {
      console.error('[Jira Tickets] Missing credentials');
      return NextResponse.json(
        {
          success: false,
          error: 'Jira credentials not configured on server',
        },
        { status: 500 },
      );
    }

    // Get request body
    const body: CreateTicketRequest = await request.json();
    const { summary, description, issueType = 'Bug' } = body;

    // Validate request
    if (!summary || !description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Summary and description are required',
        },
        { status: 400 },
      );
    }

    // Create Basic Auth header
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    console.log(`[Jira Tickets] Creating ticket: ${summary}`);

    // Call Jira API to create issue
    const response = await fetch(`https://${domain}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: {
            key: projectKey,
          },
          summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: description,
                  },
                ],
              },
            ],
          },
          issuetype: {
            name: issueType,
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Jira Tickets] Error:', response.status, data);
      return NextResponse.json(
        {
          success: false,
          error: data.errorMessages?.join(', ') || data.errors || 'Failed to create ticket',
        },
        { status: response.status },
      );
    }

    const issueKey = data.key;
    const issueUrl = `https://${domain}/browse/${issueKey}`;

    console.log('[Jira Tickets] Ticket created successfully:', issueKey);

    return NextResponse.json({
      success: true,
      issueKey,
      issueUrl,
    });
  } catch (error) {
    console.error('[Jira Tickets] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
