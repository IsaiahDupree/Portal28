/**
 * Script to apply the templates migration directly to the database
 * Run with: npx tsx scripts/apply-templates-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function applyMigration() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  console.log('Reading migration file...')
  const migrationPath = join(
    process.cwd(),
    'supabase/migrations/20260207000006_templates_vault.sql'
  )
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  console.log('Applying migration...')

  // Split the migration into individual statements
  const statements = migrationSQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'

    // Skip comment-only lines
    if (statement.trim().startsWith('--')) {
      continue
    }

    console.log(`Executing statement ${i + 1}/${statements.length}...`)

    const { error } = await supabase.rpc('exec_sql', {
      sql_string: statement,
    })

    // If exec_sql doesn't exist, try direct execution via PostgREST
    if (error && error.message?.includes('exec_sql')) {
      console.log('exec_sql function not available, migration needs manual application')
      console.log('')
      console.log('Please apply the migration manually by:')
      console.log('1. Opening Supabase Studio at http://127.0.0.1:54823')
      console.log('2. Navigate to SQL Editor')
      console.log('3. Copy and paste the contents of:')
      console.log('   supabase/migrations/20260207000006_templates_vault.sql')
      console.log('4. Execute the SQL')
      process.exit(1)
    } else if (error) {
      console.error(`Error executing statement ${i + 1}:`, error)
      throw error
    }
  }

  console.log('Migration applied successfully!')
}

applyMigration().catch((error) => {
  console.error('Failed to apply migration:', error)
  process.exit(1)
})
