#!/usr/bin/env node

/**
 * Execute Migration Script
 *
 * Executes SQL migration file against Supabase database using service role key.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase credentials
const SUPABASE_URL = 'https://ebgqtikmwwnwubcjvcba.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ3F0aWttd3dud3ViY2p2Y2JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg5OTgzNCwiZXhwIjoyMDgwNDc1ODM0fQ.PCOxmZ85HmCyK4J-axIiAj-rqA4N1ap4gi6DfY7aZJA'

// Migration file path
const migrationFile = process.argv[2] || join(__dirname, 'supabase/migrations/007_fix_agrupador_architecture.sql')

async function executeMigration() {
  console.log('🚀 Starting migration execution...')
  console.log(`📄 Migration file: ${migrationFile}`)

  // Read migration SQL
  let sql
  try {
    sql = readFileSync(migrationFile, 'utf8')
    console.log(`✅ Migration file loaded (${sql.length} characters)`)
  } catch (error) {
    console.error('❌ Failed to read migration file:', error.message)
    process.exit(1)
  }

  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔌 Connected to Supabase')

  // Execute migration
  try {
    console.log('⚙️  Executing migration...')

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration executed successfully!')
    if (data) {
      console.log('📊 Result:', data)
    }

  } catch (error) {
    console.error('❌ Unexpected error during migration:', error.message)
    process.exit(1)
  }
}

executeMigration()
