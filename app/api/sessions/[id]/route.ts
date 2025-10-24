import { NextRequest, NextResponse } from 'next/server';

import { getSessionById, updateSession, deleteSession } from '@/services/session';
import type { GetSessionResponse, UpdateSessionResponse, DeleteSessionResponse } from '@/types/session';

/**
 * GET /api/sessions/[id]
 * Get a single session by ID (includes file data as base64)
 */
export async function GET(request: NextRequest, segmentData: { params: Promise<{ id: string }> }) {
  try {
    // Next.js 16: params is now a Promise
    const params = await segmentData.params;
    const id = parseInt(params.id, 10);

    // Validate ID
    if (isNaN(id) || id < 1) {
      return NextResponse.json<GetSessionResponse>(
        {
          success: false,
          error: 'Invalid session ID',
        },
        { status: 400 },
      );
    }

    // Get session from database
    const session = await getSessionById(id);

    return NextResponse.json<GetSessionResponse>({
      success: true,
      session: {
        id: session.id,
        blob_url: session.blob_url,
        file_size: session.file_size,
        jira_id: session.jira_id,
        platform: session.platform,
        device_id: session.device_id,
        created_at: session.created_at.toISOString(),
        updated_at: session.updated_at.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Sessions API] Get error:', error);

    // Handle not found errors
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json<GetSessionResponse>(
        {
          success: false,
          error: error.message,
        },
        { status: 404 },
      );
    }

    return NextResponse.json<GetSessionResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session',
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/sessions/[id]
 * Update session metadata or replace file
 */
export async function PATCH(request: NextRequest, segmentData: { params: Promise<{ id: string }> }) {
  try {
    // Next.js 16: params is now a Promise
    const params = await segmentData.params;
    const id = parseInt(params.id, 10);

    // Validate ID
    if (isNaN(id) || id < 1) {
      return NextResponse.json<UpdateSessionResponse>(
        {
          success: false,
          error: 'Invalid session ID',
        },
        { status: 400 },
      );
    }

    // Check content type
    const contentType = request.headers.get('content-type') || '';
    let updates: any = {};

    if (contentType.includes('multipart/form-data')) {
      // Parse form data (for file uploads)
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const jira_id = formData.get('jira_id') as string | null;
      const platform = formData.get('platform') as string | null;
      const device_id = formData.get('device_id') as string | null;

      if (file) {
        // Validate file type
        if (!file.name.endsWith('.zip')) {
          return NextResponse.json<UpdateSessionResponse>(
            {
              success: false,
              error: 'File must be a .zip file',
            },
            { status: 400 },
          );
        }

        // Convert file to Buffer
        const arrayBuffer = await file.arrayBuffer();
        updates.file = Buffer.from(arrayBuffer);
      }

      if (jira_id !== null) updates.jira_id = jira_id;
      if (platform !== null) updates.platform = platform;
      if (device_id !== null) updates.device_id = device_id;
    } else {
      // Parse JSON body (for metadata updates only)
      const body = await request.json();
      updates = body;

      // If file is provided as base64, convert to Buffer
      if (updates.file && typeof updates.file === 'string') {
        updates.file = Buffer.from(updates.file, 'base64');
      }
    }

    // Validate that at least one field is being updated
    if (Object.keys(updates).length === 0) {
      return NextResponse.json<UpdateSessionResponse>(
        {
          success: false,
          error: 'No fields to update',
        },
        { status: 400 },
      );
    }

    // Update session in database
    const session = await updateSession(id, updates);

    return NextResponse.json<UpdateSessionResponse>({
      success: true,
      session: {
        id: session.id,
        updated_at: session.updated_at.toISOString(),
        jira_id: session.jira_id,
        platform: session.platform,
        device_id: session.device_id,
      },
    });
  } catch (error) {
    console.error('[Sessions API] Update error:', error);

    // Handle not found errors
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json<UpdateSessionResponse>(
        {
          success: false,
          error: error.message,
        },
        { status: 404 },
      );
    }

    return NextResponse.json<UpdateSessionResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update session',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/sessions/[id]
 * Delete a session by ID
 */
export async function DELETE(request: NextRequest, segmentData: { params: Promise<{ id: string }> }) {
  try {
    // Next.js 16: params is now a Promise
    const params = await segmentData.params;
    const id = parseInt(params.id, 10);

    // Validate ID
    if (isNaN(id) || id < 1) {
      return NextResponse.json<DeleteSessionResponse>(
        {
          success: false,
          error: 'Invalid session ID',
        },
        { status: 400 },
      );
    }

    // Delete session from database
    await deleteSession(id);

    return NextResponse.json<DeleteSessionResponse>({
      success: true,
      message: `Session ${id} deleted successfully`,
    });
  } catch (error) {
    console.error('[Sessions API] Delete error:', error);

    // Handle not found errors
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json<DeleteSessionResponse>(
        {
          success: false,
          error: error.message,
        },
        { status: 404 },
      );
    }

    return NextResponse.json<DeleteSessionResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete session',
      },
      { status: 500 },
    );
  }
}
