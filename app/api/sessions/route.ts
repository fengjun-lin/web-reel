import { NextRequest, NextResponse } from 'next/server';

import { createSession, listSessions } from '@/services/session';
import type { CreateSessionResponse, ListSessionsResponse } from '@/types/session';

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * OPTIONS /api/sessions
 * Handle preflight CORS requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/sessions
 * Create a new session with uploaded file
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const jira_id = formData.get('jira_id') as string | null;
    const platform = formData.get('platform') as string | null;
    const device_id = formData.get('device_id') as string | null;

    // Validate file
    if (!file) {
      return NextResponse.json<CreateSessionResponse>(
        {
          success: false,
          error: 'File is required',
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Validate file type (should be zip)
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json<CreateSessionResponse>(
        {
          success: false,
          error: 'File must be a .zip file',
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return NextResponse.json<CreateSessionResponse>(
        {
          success: false,
          error: `File size exceeds maximum allowed size of 20MB (got ${(buffer.length / 1024 / 1024).toFixed(2)}MB)`,
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Create session in database
    const session = await createSession({
      file: buffer,
      jira_id: jira_id || undefined,
      platform: platform || undefined,
      device_id: device_id || undefined,
    });

    return NextResponse.json<CreateSessionResponse>(
      {
        success: true,
        session: {
          id: session.id,
          file_size: session.file_size,
          created_at: session.created_at.toISOString(),
          jira_id: session.jira_id,
          platform: session.platform,
          device_id: session.device_id,
        },
      },
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    console.error('[Sessions API] Create error:', error);
    return NextResponse.json<CreateSessionResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session',
      },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * GET /api/sessions
 * List all sessions with optional filtering and pagination
 * Query params:
 *   - limit: number of sessions to return (default: 50)
 *   - offset: number of sessions to skip (default: 0)
 *   - jira_id: filter by Jira ID
 *   - platform: filter by platform
 *   - device_id: filter by device ID
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;
    const jira_id = searchParams.get('jira_id') || undefined;
    const platform = searchParams.get('platform') || undefined;
    const device_id = searchParams.get('device_id') || undefined;

    // Validate pagination parameters
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json<ListSessionsResponse>(
        {
          success: false,
          error: 'Invalid limit parameter (must be between 1 and 100)',
        },
        { status: 400, headers: corsHeaders },
      );
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json<ListSessionsResponse>(
        {
          success: false,
          error: 'Invalid offset parameter (must be >= 0)',
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Get sessions from database
    const result = await listSessions({
      limit,
      offset,
      jira_id,
      platform,
      device_id,
    });

    return NextResponse.json<ListSessionsResponse>(
      {
        success: true,
        sessions: result.sessions,
        total: result.total,
        limit,
        offset,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[Sessions API] List error:', error);
    return NextResponse.json<ListSessionsResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list sessions',
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
