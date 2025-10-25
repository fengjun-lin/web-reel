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
 * Convert Wiki Markup style description to ADF (Atlassian Document Format)
 */
function convertToADF(wikiMarkup: string): any {
  const lines = wikiMarkup.split('\n');
  const content: any[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line || line.trim() === '') {
      // Skip empty lines
      i++;
      continue;
    }

    // Heading (h3.)
    if (line.startsWith('h3. ')) {
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [
          {
            type: 'text',
            text: line.substring(4).trim(),
          },
        ],
      });
      i++;
      continue;
    }

    // Ordered list item (# )
    if (line.match(/^#\s+/)) {
      const listItems: any[] = [];
      while (i < lines.length && lines[i]?.match(/^#\s+/)) {
        listItems.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: lines[i]!.substring(2).trim(),
                },
              ],
            },
          ],
        });
        i++;
      }
      content.push({
        type: 'orderedList',
        content: listItems,
      });
      continue;
    }

    // Panel block (e.g., {panel:...}...{panel})
    if (line.startsWith('{panel:')) {
      const panelLines: string[] = [];
      i++; // Skip opening {panel:...} line
      while (i < lines.length && lines[i] !== '{panel}') {
        panelLines.push(lines[i] || '');
        i++;
      }
      i++; // Skip closing {panel} line

      // Create panel content with inline formatting support
      const panelContent: any[] = [];
      for (const panelLine of panelLines) {
        if (panelLine.trim()) {
          // Parse inline formatting in panel lines
          const textContent = parseInlineFormatting(panelLine.trim());
          panelContent.push({
            type: 'paragraph',
            content: textContent,
          });
        }
      }

      content.push({
        type: 'panel',
        attrs: { panelType: 'warning' },
        content: panelContent,
      });
      continue;
    }

    // URL in brackets format: [url] or [text|url]
    const urlBracketMatch = line.match(/^\[(https?:\/\/[^\]]+)\]$/);
    if (urlBracketMatch && urlBracketMatch[1]) {
      const url = urlBracketMatch[1];
      content.push({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: url,
            marks: [
              {
                type: 'link',
                attrs: {
                  href: url,
                },
              },
            ],
          },
        ],
      });
      i++;
      continue;
    }

    // URL (starts with http:// or https://)
    if (line.match(/^https?:\/\//)) {
      content.push({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: line.trim(),
            marks: [
              {
                type: 'link',
                attrs: {
                  href: line.trim(),
                },
              },
            ],
          },
        ],
      });
      i++;
      continue;
    }

    // Complex formatting (bold, code, color, links) in a line
    if (line.includes('*') || line.includes('{{') || line.includes('{color:') || line.includes('[http')) {
      const textContent = parseInlineFormatting(line);
      if (textContent.length > 0) {
        content.push({
          type: 'paragraph',
          content: textContent,
        });
        i++;
        continue;
      }
    }

    // Default: regular paragraph
    content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: line,
        },
      ],
    });
    i++;
  }

  return {
    type: 'doc',
    version: 1,
    content,
  };
}

/**
 * Parse inline formatting (bold, code, color, links) in a line
 */
function parseInlineFormatting(line: string): any[] {
  const textContent: any[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    // Match link: [url]
    const linkMatch = remaining.match(/^(.*?)\[(https?:\/\/[^\]]+)\]/);
    if (linkMatch && linkMatch[1] !== undefined && linkMatch[2] !== undefined) {
      // Add text before link
      if (linkMatch[1]) {
        textContent.push({
          type: 'text',
          text: linkMatch[1],
        });
      }
      // Add link
      textContent.push({
        type: 'text',
        text: linkMatch[2],
        marks: [{ type: 'link', attrs: { href: linkMatch[2] } }],
      });
      remaining = remaining.substring(linkMatch[0].length);
      continue;
    }

    // Match bold text: *text*
    const boldMatch = remaining.match(/^(.*?)\*([^*]+)\*/);
    if (boldMatch && boldMatch[1] !== undefined && boldMatch[2] !== undefined) {
      // Add text before bold
      if (boldMatch[1]) {
        textContent.push({
          type: 'text',
          text: boldMatch[1],
        });
      }
      // Add bold text
      textContent.push({
        type: 'text',
        text: boldMatch[2],
        marks: [{ type: 'strong' }],
      });
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }

    // Match code text: {{text}}
    const codeMatch = remaining.match(/^(.*?)\{\{([^}]+)\}\}/);
    if (codeMatch && codeMatch[1] !== undefined && codeMatch[2] !== undefined) {
      // Add text before code
      if (codeMatch[1]) {
        textContent.push({
          type: 'text',
          text: codeMatch[1],
        });
      }
      // Add code text
      textContent.push({
        type: 'text',
        text: codeMatch[2],
        marks: [{ type: 'code' }],
      });
      remaining = remaining.substring(codeMatch[0].length);
      continue;
    }

    // Match colored text: {color:red}text{color}
    const colorMatch = remaining.match(/^(.*?)\{color:[^}]+\}([^{]+)\{color\}/);
    if (colorMatch && colorMatch[1] !== undefined && colorMatch[2] !== undefined) {
      // Add text before colored text
      if (colorMatch[1]) {
        textContent.push({
          type: 'text',
          text: colorMatch[1],
        });
      }
      // Add colored text (ADF doesn't support colors directly, use emphasis instead)
      textContent.push({
        type: 'text',
        text: colorMatch[2],
        marks: [{ type: 'em' }],
      });
      remaining = remaining.substring(colorMatch[0].length);
      continue;
    }

    // No more special formatting, add remaining text
    textContent.push({
      type: 'text',
      text: remaining,
    });
    break;
  }

  return textContent;
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

    // Convert description to ADF format
    const adfDescription = convertToADF(description);
    console.log('[Jira Tickets] ADF Description:', JSON.stringify(adfDescription, null, 2));

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
          description: adfDescription,
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
