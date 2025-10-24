# Session Persistence API Documentation

This document describes the Session Persistence API that allows storing and managing Web Reel replay sessions in a Neon Postgres database.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)

## Overview

The Session Persistence API provides full CRUD (Create, Read, Update, Delete) operations for replay sessions. Sessions are stored in a Neon Postgres database with the following features:

- **Binary Storage**: Zip files (< 20MB) are stored as BYTEA binary data
- **Metadata**: Optional fields for `jira_id`, `platform`, and `device_id`
- **Automatic Timestamps**: `created_at` and `updated_at` are automatically managed
- **Full CRUD Operations**: Create, Read, Update, Delete, and List sessions

## Setup

### 1. Configure Environment Variables

Add your Neon Postgres connection string to `.env.local`:

```bash
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
```

**Alternative**: You can also set the environment variable inline:

```bash
DATABASE_URL=postgresql://... npm run db:init
```

See `env.example` for detailed instructions on obtaining your DATABASE_URL from Neon.

### 2. Initialize Database

Run the database initialization script to create tables:

```bash
npm run db:init
```

The script will:

- Automatically load DATABASE_URL from `.env.local` (or from environment)
- Show you which database it will connect to (with password masked)
- Prompt you to confirm before dropping/recreating tables

**⚠️ WARNING**: This command will drop and recreate all tables. You will be prompted for confirmation.

### 3. Verify Setup

The script will:

- Test the database connection
- Create the `sessions` table
- Create necessary indexes
- Set up the `updated_at` trigger

## Database Schema

### Sessions Table

| Column       | Type         | Nullable | Description                             |
| ------------ | ------------ | -------- | --------------------------------------- |
| `id`         | SERIAL       | No       | Auto-incrementing primary key           |
| `file`       | BYTEA        | No       | Binary zip file data (< 20MB)           |
| `jira_id`    | VARCHAR(255) | Yes      | Associated Jira ticket ID               |
| `platform`   | VARCHAR(100) | Yes      | Platform identifier (e.g., web, mobile) |
| `device_id`  | VARCHAR(255) | Yes      | Device identifier                       |
| `created_at` | TIMESTAMP    | No       | Creation timestamp (auto-generated)     |
| `updated_at` | TIMESTAMP    | No       | Last update timestamp (auto-updated)    |

### Indexes

- `idx_sessions_jira_id`: Index on `jira_id` for filtering
- `idx_sessions_device_id`: Index on `device_id` for filtering
- `idx_sessions_created_at`: Index on `created_at` for sorting

## API Endpoints

### Create Session

**POST** `/api/sessions`

Upload a new session with a zip file.

**Request**: `multipart/form-data`

| Field       | Type   | Required | Description                      |
| ----------- | ------ | -------- | -------------------------------- |
| `file`      | File   | Yes      | Zip file containing session data |
| `jira_id`   | String | No       | Jira ticket ID                   |
| `platform`  | String | No       | Platform identifier              |
| `device_id` | String | No       | Device identifier                |

**Response**: `201 Created`

```json
{
  "success": true,
  "session": {
    "id": 123,
    "created_at": "2024-01-15T10:30:00.000Z",
    "jira_id": "WR-456",
    "platform": "web",
    "device_id": "user123"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid file or missing required fields
- `500 Internal Server Error`: Database or server error

---

### List Sessions

**GET** `/api/sessions`

List all sessions with optional filtering and pagination.

**Query Parameters**:

| Parameter   | Type   | Default | Description                          |
| ----------- | ------ | ------- | ------------------------------------ |
| `limit`     | Number | 50      | Number of sessions to return (1-100) |
| `offset`    | Number | 0       | Number of sessions to skip           |
| `jira_id`   | String | -       | Filter by Jira ID                    |
| `platform`  | String | -       | Filter by platform                   |
| `device_id` | String | -       | Filter by device ID                  |

**Response**: `200 OK`

```json
{
  "success": true,
  "sessions": [
    {
      "id": 123,
      "jira_id": "WR-456",
      "platform": "web",
      "device_id": "user123",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      "file_size": 1048576
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

**Note**: File data is NOT included in list responses for performance. File size is provided in bytes.

---

### Get Session by ID

**GET** `/api/sessions/[id]`

Retrieve a single session including file data.

**Response**: `200 OK`

```json
{
  "success": true,
  "session": {
    "id": 123,
    "file": "UEsDBBQAAAAIAO...", // Base64-encoded zip file
    "jira_id": "WR-456",
    "platform": "web",
    "device_id": "user123",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid session ID
- `404 Not Found`: Session does not exist
- `500 Internal Server Error`: Database or server error

---

### Update Session

**PATCH** `/api/sessions/[id]`

Update session metadata or replace the file.

**Request**: `multipart/form-data` or `application/json`

**Form Data Fields**:

| Field       | Type   | Required | Description             |
| ----------- | ------ | -------- | ----------------------- |
| `file`      | File   | No       | New zip file (optional) |
| `jira_id`   | String | No       | New Jira ticket ID      |
| `platform`  | String | No       | New platform identifier |
| `device_id` | String | No       | New device identifier   |

**JSON Body** (for metadata-only updates):

```json
{
  "jira_id": "WR-789",
  "platform": "mobile"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "session": {
    "id": 123,
    "updated_at": "2024-01-15T11:00:00.000Z",
    "jira_id": "WR-789",
    "platform": "mobile",
    "device_id": "user123"
  }
}
```

**Error Responses**:

- `400 Bad Request`: No fields to update or invalid data
- `404 Not Found`: Session does not exist
- `500 Internal Server Error`: Database or server error

---

### Delete Session

**DELETE** `/api/sessions/[id]`

Delete a session permanently.

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Session 123 deleted successfully"
}
```

**Error Responses**:

- `400 Bad Request`: Invalid session ID
- `404 Not Found`: Session does not exist
- `500 Internal Server Error`: Database or server error

## Usage Examples

### JavaScript/TypeScript

#### Create a Session

```typescript
const formData = new FormData();
formData.append('file', zipFile); // File object
formData.append('jira_id', 'WR-456');
formData.append('platform', 'web');
formData.append('device_id', 'user123');

const response = await fetch('/api/sessions', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log('Session created:', result.session.id);
```

#### List Sessions with Filtering

```typescript
const params = new URLSearchParams({
  limit: '20',
  offset: '0',
  platform: 'web',
});

const response = await fetch(`/api/sessions?${params}`);
const result = await response.json();

console.log(`Found ${result.total} sessions`);
result.sessions.forEach((session) => {
  console.log(`Session ${session.id}: ${session.file_size} bytes`);
});
```

#### Get Session and Download File

```typescript
const response = await fetch('/api/sessions/123');
const result = await response.json();

if (result.success) {
  // Decode base64 file data
  const binaryString = atob(result.session.file);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create blob and download
  const blob = new Blob([bytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `session-${result.session.id}.zip`;
  a.click();
}
```

#### Update Session Metadata

```typescript
const response = await fetch('/api/sessions/123', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    jira_id: 'WR-789',
    platform: 'mobile',
  }),
});

const result = await response.json();
console.log('Session updated:', result.session);
```

#### Delete Session

```typescript
const response = await fetch('/api/sessions/123', {
  method: 'DELETE',
});

const result = await response.json();
console.log(result.message);
```

### cURL

#### Create Session

```bash
curl -X POST http://localhost:3000/api/sessions \
  -F "file=@session.zip" \
  -F "jira_id=WR-456" \
  -F "platform=web" \
  -F "device_id=user123"
```

#### List Sessions

```bash
curl "http://localhost:3000/api/sessions?limit=10&offset=0&platform=web"
```

#### Get Session

```bash
curl http://localhost:3000/api/sessions/123
```

#### Update Session

```bash
curl -X PATCH http://localhost:3000/api/sessions/123 \
  -H "Content-Type: application/json" \
  -d '{"jira_id":"WR-789","platform":"mobile"}'
```

#### Delete Session

```bash
curl -X DELETE http://localhost:3000/api/sessions/123
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common Error Scenarios

1. **File too large** (400):

   ```json
   {
     "success": false,
     "error": "File size exceeds maximum allowed size of 20MB (got 25.5MB)"
   }
   ```

2. **Session not found** (404):

   ```json
   {
     "success": false,
     "error": "Session with ID 123 not found"
   }
   ```

3. **Invalid file type** (400):

   ```json
   {
     "success": false,
     "error": "File must be a .zip file"
   }
   ```

4. **Database connection error** (500):
   ```json
   {
     "success": false,
     "error": "DATABASE_URL environment variable is not set"
   }
   ```

## Best Practices

1. **File Size**: Always validate file size on the client before upload
2. **Error Handling**: Always check the `success` field in responses
3. **Pagination**: Use reasonable `limit` values (10-50) for list operations
4. **File Downloads**: Use streaming or chunked downloads for large files
5. **Security**: Never expose DATABASE_URL to the client side
6. **Cleanup**: Regularly delete old sessions to manage database size

## Troubleshooting

### Database Connection Issues

If you encounter connection errors:

1. Verify `DATABASE_URL` is set correctly in `.env.local`
2. Check that your Neon database is active (not in suspended state)
3. Ensure SSL mode is configured: `?sslmode=require`
4. Test the connection by running: `npm run db:init`

### File Upload Issues

If file uploads fail:

1. Check file size is under 20MB
2. Verify file is a valid .zip file
3. Ensure Content-Type is `multipart/form-data`
4. Check server logs for detailed error messages

### Performance Issues

For large databases:

1. Use pagination with reasonable `limit` values
2. Add additional indexes if filtering on custom fields
3. Consider archiving old sessions to a separate table
4. Monitor database storage usage in Neon dashboard

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Verify your Neon database is operational
4. Consult the Neon documentation at https://neon.tech/docs
