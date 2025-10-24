#!/usr/bin/env node

/**
 * Database Initialization Script
 * Initializes the Neon Postgres database with required tables
 *
 * Usage: npm run db:init
 *
 * WARNING: This script will DROP existing tables and recreate them.
 * All data will be lost!
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import pgPromise from 'pg-promise';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  // Try .env as fallback
  dotenv.config();
}

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function warn(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
  log('  Web Reel Database Initialization', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.blue);

  // Check for DATABASE_URL environment variable
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    error('DATABASE_URL environment variable is not set');
    log('');
    info('Please set DATABASE_URL using one of these methods:');
    log('');
    info('Method 1: Create a .env.local file in the project root:');
    log('  DATABASE_URL=postgresql://user:pass@host/database?sslmode=require', colors.cyan);
    log('');
    info('Method 2: Set environment variable before running:');
    log('  DATABASE_URL=postgresql://... npm run db:init', colors.cyan);
    log('');
    info('Get your Neon Postgres connection string from:');
    log('  https://neon.tech → Your Project → Connection Details', colors.cyan);
    log('');
    process.exit(1);
  }

  // Mask password in URL for display
  const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
  info(`Database URL: ${maskedUrl}\n`);

  // Read schema file
  const schemaPath = path.join(__dirname, '..', 'src', 'lib', 'schema.sql');
  let schemaSQL;

  try {
    schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    success(`Schema file loaded: ${schemaPath}\n`);
  } catch (err) {
    error(`Failed to read schema file: ${schemaPath}`);
    error(err.message);
    process.exit(1);
  }

  // Warning message
  warn('⚠️  WARNING: This operation will DROP existing tables!');
  warn('⚠️  All data in the following tables will be PERMANENTLY DELETED:');
  warn('   - sessions\n');

  // Ask for confirmation
  const answer = await askQuestion('Do you want to continue? Type "yes" to proceed: ');

  if (answer.toLowerCase() !== 'yes') {
    info('Operation cancelled by user.');
    rl.close();
    process.exit(0);
  }

  log('');
  info('Initializing database...\n');

  // Initialize pg-promise
  const pgp = pgPromise({});
  const db = pgp(databaseUrl);

  try {
    // Execute schema SQL (pg-promise handles connection automatically)
    await db.none(schemaSQL);
    success('Schema applied successfully');

    // Verify tables were created
    const result = await db.one(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'sessions'",
    );

    if (result.count === '1') {
      success('Sessions table created and verified');
    } else {
      warn('Sessions table may not have been created correctly');
    }

    log('');
    success('✨ Database initialization completed successfully!');
    log('');
  } catch (err) {
    log('');
    error('Database initialization failed:');
    error(err.message);

    if (err.code) {
      error(`Error code: ${err.code}`);
    }

    log('');
    info('Common issues:');
    info('  1. Check that DATABASE_URL is correct');
    info('  2. Ensure your database server is running');
    info('  3. Verify network connectivity to Neon');
    info('  4. Check that SSL mode is configured correctly');

    rl.close();
    await pgp.end();
    process.exit(1);
  }

  // Clean up and exit
  rl.close();
  await pgp.end();
  process.exit(0);
}

// Run the script
main().catch((err) => {
  error('Unexpected error:');
  console.error(err);
  process.exit(1);
});
