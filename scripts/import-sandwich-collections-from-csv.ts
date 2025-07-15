#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()
const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA'
if (!supabaseUrl || !supabaseServiceKey) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const supabase = createClient(supabaseUrl, supabaseServiceKey)
async function main() {
  const sql = `ALTER TABLE sandwich_collections ALTER COLUMN submitted_at DROP NOT NULL;`
  const { error } = await supabase.rpc('execute_sql', { sql })
  if (error) { console.error('Error altering table:', error); process.exit(1) }
  console.log('Altered sandwich_collections: submitted_at now allows NULLs')
}
main() 