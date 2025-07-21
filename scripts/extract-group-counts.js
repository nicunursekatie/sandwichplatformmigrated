#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function extractGroupCounts() {
  console.log('🔧 Extracting Group Counts from CSV');
  console.log('===================================');
  
  // First, let's just get all the lines with sandwichCount and manually parse them
  const csvPath = '/workspace/attached_assets/sandwich-collections-all-2025-07-07 cleaned copy.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  
  // Split into lines and find ones with sandwichCount
  const lines = csvContent.split(/\r?\n/);
  const groupRecords = [];
  
  console.log('🔍 Looking for lines with sandwichCount...');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('sandwichCount')) {
      console.log(`Found line ${i}: ${line.substring(0, 100)}...`);
      
      // Extract ID and sandwich count manually
      const idMatch = line.match(/^(\d+),/);
      const countMatch = line.match(/sandwichCount:(\d+)/);
      
      if (idMatch && countMatch) {
        const id = parseInt(idMatch[1]);
        const count = parseInt(countMatch[1]);
        groupRecords.push({ id, count });
        console.log(`  → ID: ${id}, Count: ${count}`);
      }
    }
  }
  
  console.log(`\n📊 Found ${groupRecords.length} records with group collections`);
  
  let updateCount = 0;
  let totalGroupSandwiches = 0;
  
  // Update each record
  for (const record of groupRecords) {
    const groupCollections = JSON.stringify([{
      groupName: "Unnamed Groups",
      sandwichCount: record.count
    }]);
    
    console.log(`📝 Updating ID ${record.id} with ${record.count} group sandwiches`);
    totalGroupSandwiches += record.count;
    
    try {
      const { error } = await supabase
        .from('sandwich_collections')
        .update({ group_collections: groupCollections })
        .eq('id', record.id);
      
      if (error) {
        console.error(`❌ Error updating ID ${record.id}:`, error.message);
      } else {
        updateCount++;
      }
    } catch (err) {
      console.error(`❌ Update error for ID ${record.id}:`, err.message);
    }
  }
  
  console.log('\n✅ Update Complete:');
  console.log(`📈 Records updated: ${updateCount}`);
  console.log(`💰 Total group sandwiches: ${totalGroupSandwiches.toLocaleString()}`);
  
  // Test the result
  console.log('\n🧪 Testing final result...');
  const { data: stats, error } = await supabase.rpc('get_collection_stats');
  if (error) {
    console.error('❌ Stats error:', error.message);
  } else {
    const total = stats[0]?.complete_total_sandwiches || 0;
    console.log('📊 Final stats:', stats[0]);
    console.log(`\n🎯 FINAL TOTAL: ${total.toLocaleString()}`);
    
    if (total >= 2000000) {
      console.log('🎉 SUCCESS! The sandwich totals are now over 2 million!');
    } else {
      console.log(`Still need: ${(2183360 - total).toLocaleString()} more sandwiches`);
    }
  }
}

// Run the extraction
extractGroupCounts().catch(console.error);