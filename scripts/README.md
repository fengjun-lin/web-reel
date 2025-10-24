# Scripts Directory

This directory contains utility scripts for the Web Reel project.

## Database Initialization Script

### `init-db.js`

Initializes the Neon Postgres database with required tables for session persistence.

**Usage:**

```bash
npm run db:init
```

**Prerequisites:**

1. Set up your Neon Postgres database at [neon.tech](https://neon.tech)
2. Add `DATABASE_URL` to `.env.local`:
   ```bash
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   ```

**What it does:**

- ✅ Loads environment variables from `.env.local`
- ✅ Connects to your Neon Postgres database
- ✅ Shows you which database it will modify (password masked)
- ✅ Prompts for confirmation before making changes
- ⚠️ Drops existing `sessions` table (if exists)
- ✅ Creates new `sessions` table with proper schema
- ✅ Creates indexes for performance
- ✅ Sets up auto-update trigger for `updated_at`
- ✅ Verifies table creation

**Alternative Usage:**

You can also pass the DATABASE_URL as an environment variable:

```bash
DATABASE_URL=postgresql://... npm run db:init
```

**Safety Features:**

- User confirmation required before dropping tables
- Password masking in output
- Clear error messages with troubleshooting tips
- Graceful error handling

**Example Output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Web Reel Database Initialization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Database URL: postgresql://user:****@host/database

✅ Schema file loaded: /path/to/schema.sql

⚠️  WARNING: This operation will DROP existing tables!
⚠️  All data in the following tables will be PERMANENTLY DELETED:
   - sessions

Do you want to continue? Type "yes" to proceed: yes

✅ Connected to database
✅ Schema applied successfully
✅ Sessions table created and verified

✨ Database initialization completed successfully!
```

**Troubleshooting:**

If you encounter errors:

1. **DATABASE_URL not set**: Make sure `.env.local` exists with valid DATABASE_URL
2. **Connection refused**: Check that your Neon database is active (not paused)
3. **SSL error**: Ensure your connection string includes `?sslmode=require`
4. **Permission denied**: Verify your database credentials are correct
5. **Schema file not found**: Run the script from project root directory

## Other Scripts

This directory is reserved for future utility scripts like:

- Database migration scripts
- Data backup/restore utilities
- Development environment setup
- Testing utilities
