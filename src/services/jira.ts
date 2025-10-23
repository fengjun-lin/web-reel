/**
 * Jira Service
 * Handles communication with Jira Cloud API for ticket creation
 */

import { Version3Client } from 'jira.js';

import { getJiraConfig } from '@/config/jira';

export interface CreateTicketOptions {
  summary: string;
  description: string;
  issueType?: string;
}

export interface CreateTicketResult {
  success: boolean;
  issueKey?: string;
  issueUrl?: string;
  error?: string;
}

/**
 * Create a Jira client instance
 */
function createJiraClient(): Version3Client {
  // Use Next.js API route proxy to avoid CORS issues and secure credentials
  const host = '/api/jira'; // Next.js API route handles authentication server-side

  return new Version3Client({
    host,
    // Authentication is handled by Next.js API route server-side
    // No need to provide credentials here (more secure)
    authentication: undefined,
  });
}

/**
 * Create a Jira ticket
 */
export async function createJiraTicket(options: CreateTicketOptions): Promise<CreateTicketResult> {
  const { summary, description, issueType = 'Bug' } = options;
  const config = getJiraConfig();

  try {
    const client = createJiraClient();

    // Create the issue
    const issue = await client.issues.createIssue({
      fields: {
        project: {
          key: config.projectKey,
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
    });

    const issueKey = issue.key;
    const issueUrl = `https://${config.domain}/browse/${issueKey}`;

    console.log('Jira ticket created successfully:', issueKey);

    return {
      success: true,
      issueKey,
      issueUrl,
    };
  } catch (error) {
    console.error('Failed to create Jira ticket:', error);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Test Jira connection and API key
 */
export async function testJiraConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const client = createJiraClient();
    const config = getJiraConfig();

    // Try to get project info to verify connection
    const project = await client.projects.getProject({
      projectIdOrKey: config.projectKey,
    });

    return {
      success: true,
      message: `Connection successful! Connected to project: ${project.name}`,
    };
  } catch (error) {
    console.error('Jira connection test failed:', error);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: `Connection failed: ${errorMessage}`,
    };
  }
}

/**
 * Get available issue types for the project
 */
export async function getProjectIssueTypes(): Promise<string[]> {
  try {
    const client = createJiraClient();
    const config = getJiraConfig();

    const project = await client.projects.getProject({
      projectIdOrKey: config.projectKey,
    });

    return project.issueTypes?.map((type) => type.name || 'Bug') || ['Bug'];
  } catch (error) {
    console.error('Failed to get issue types:', error);
    return ['Bug', 'Task', 'Story'];
  }
}
