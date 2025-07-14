#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Check if this is a dry run
const isDryRun = process.argv.includes('--dry-run');

async function migrateGroupsMain() {
  console.log('🚀 Starting migration: Converting "Groups - Main" variations to "Groups"');
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }
  
  try {
    // Step 1: Find all collections with various "Groups - Main" patterns
    console.log('📋 Finding collections with "Groups - Main" variations...');
    
    const { data: collections, error: fetchError } = await supabase
      .from('sandwich_collections')
      .select('id, host_name, collection_date, individual_sandwiches, group_collections')
      .or('host_name.eq.Groups - Main,host_name.eq.Groups-Main,host_name.eq.Groups - main,host_name.eq.Groups-main');
    
    if (fetchError) {
      console.error('❌ Error fetching collections:', fetchError);
      return;
    }
    
    if (!collections || collections.length === 0) {
      console.log('✅ No collections found with "Groups - Main" variations');
      return;
    }
    
    console.log(`📊 Found ${collections.length} collections to migrate`);
    
    // Group by current host_name to show what we're working with
    const hostNameGroups = collections.reduce((acc, collection) => {
      const hostName = collection.host_name;
      if (!acc[hostName]) {
        acc[hostName] = [];
      }
      acc[hostName].push(collection);
      return acc;
    }, {} as Record<string, typeof collections>);
    
    console.log('📋 Breakdown by current host_name:');
    Object.entries(hostNameGroups).forEach(([hostName, count]) => {
      console.log(`   - "${hostName}": ${count.length} collections`);
    });
    
    // Step 2: Show what would be updated (dry run) or actually update
    if (isDryRun) {
      console.log('\n🔍 DRY RUN - Collections that would be updated:');
      collections.forEach(collection => {
        console.log(`   - ID ${collection.id}: "${collection.host_name}" → "Groups" (${collection.collection_date})`);
      });
      console.log(`\n📝 Would update ${collections.length} collections from various "Groups - Main" variations to "Groups"`);
    } else {
      console.log('\n🔄 Updating host_name from "Groups - Main" variations to "Groups"...');
      
      const { data: updatedCollections, error: updateError } = await supabase
        .from('sandwich_collections')
        .update({ host_name: 'Groups' })
        .or('host_name.eq.Groups - Main,host_name.eq.Groups-Main,host_name.eq.Groups - main,host_name.eq.Groups-main')
        .select('id, host_name, collection_date');
      
      if (updateError) {
        console.error('❌ Error updating collections:', updateError);
        return;
      }
      
      console.log(`✅ Successfully migrated ${updatedCollections?.length || 0} collections`);
    }
    
    // Step 3: Verify the migration (or show what would remain)
    console.log('\n🔍 Verifying migration...');
    
    const { data: remainingOldCollections, error: verifyError } = await supabase
      .from('sandwich_collections')
      .select('id, host_name')
      .or('host_name.eq.Groups - Main,host_name.eq.Groups-Main,host_name.eq.Groups - main,host_name.eq.Groups-main');
    
    if (verifyError) {
      console.error('❌ Error verifying migration:', verifyError);
      return;
    }
    
    if (remainingOldCollections && remainingOldCollections.length > 0) {
      console.log(`⚠️  Warning: ${remainingOldCollections.length} collections still have "Groups - Main" variations`);
      if (isDryRun) {
        console.log('   (This is expected in dry run mode)');
      } else {
        console.log('Remaining collections:', remainingOldCollections);
      }
    } else {
      console.log('✅ Verification complete: All "Groups - Main" variations have been migrated');
    }
    
    // Step 4: Show summary
    const { data: newGroupsCollections, error: countError } = await supabase
      .from('sandwich_collections')
      .select('id, host_name')
      .eq('host_name', 'Groups');
    
    if (!countError) {
      console.log(`📈 Total collections now with host_name "Groups": ${newGroupsCollections?.length || 0}`);
      
      if (newGroupsCollections && newGroupsCollections.length > 0) {
        console.log('\n📋 Sample of "Groups" collections:');
        newGroupsCollections.slice(0, 5).forEach(collection => {
          console.log(`   - ID ${collection.id}: ${collection.host_name}`);
        });
        if (newGroupsCollections.length > 5) {
          console.log(`   ... and ${newGroupsCollections.length - 5} more`);
        }
      }
    }
    
    if (isDryRun) {
      console.log('\n🎯 DRY RUN COMPLETE - No changes were made');
      console.log('💡 To run the actual migration, remove the --dry-run flag');
    } else {
      console.log('\n🎉 Migration completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error during migration:', error);
    process.exit(1);
  }
}

// Show usage information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 Groups - Main Migration Script

Usage:
  npm run migrate:groups-main [options]

Options:
  --dry-run     Show what would be changed without making changes
  --help, -h    Show this help message

This script will convert all sandwich collection entries with host_name variations of "Groups - Main" to simply "Groups".

Examples:
  npm run migrate:groups-main --dry-run    # See what would be changed
  npm run migrate:groups-main              # Run the actual migration
`);
  process.exit(0);
}

// Run the migration
migrateGroupsMain()
  .then(() => {
    console.log('\n✨ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  }); 