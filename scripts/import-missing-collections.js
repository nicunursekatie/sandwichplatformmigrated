#!/usr/bin/env node

/**
 * Script to import missing sandwich collections from the backup SQL file
 * This will help restore the missing data that's causing the total discrepancy
 */

import fs from 'fs';
import { storage } from '../server/storage.js';

async function importMissingCollections() {
  console.log('🔍 Analyzing Missing Sandwich Collections');
  console.log('==========================================\n');

  try {
    // Read the SQL backup file
    console.log('📂 Reading SQL backup file...');
    const sqlContent = fs.readFileSync('replit_inserts.sql', 'utf8');
    
    // Extract sandwich collection inserts
    const insertLines = sqlContent
      .split('\n')
      .filter(line => line.includes("INSERT INTO public.sandwich_collections"));
    
    console.log(`📊 Found ${insertLines.length} records in backup file\n`);

    // Get current collections from database
    console.log('📊 Fetching current collections from database...');
    const currentCollections = await storage.getAllSandwichCollections();
    console.log(`✅ Found ${currentCollections.length} collections in database\n`);

    // Create a set of existing IDs for fast lookup
    const existingIds = new Set(currentCollections.map(c => c.id));

    // Parse backup records and find missing ones
    console.log('🔍 Analyzing missing records...');
    let missingRecords = [];
    let totalBackupSandwiches = 0;

    insertLines.forEach(line => {
      // Parse the SQL INSERT line
      // FORMAT: INSERT INTO public.sandwich_collections VALUES (id, 'date', 'host', individual, 'groups', 'submitted_at');
      const match = line.match(/VALUES \((\d+), '([^']+)', '([^']+)', (\d+), '([^']*)', '([^']+)'\)/);
      
      if (match) {
        const [, id, date, host, individual, groups, submittedAt] = match;
        const recordId = parseInt(id);
        const individualCount = parseInt(individual);
        
        // Calculate group total for this record
        let groupTotal = 0;
        if (groups && groups !== '[]') {
          try {
            const groupData = JSON.parse(groups);
            if (Array.isArray(groupData)) {
              groupTotal = groupData.reduce((sum, g) => sum + (g.sandwichCount || g.count || 0), 0);
            }
          } catch (e) {
            // Handle text format
            const matches = groups.match(/(\d+)/g);
            if (matches) {
              groupTotal = matches.reduce((sum, num) => sum + parseInt(num), 0);
            }
          }
        }

        totalBackupSandwiches += individualCount + groupTotal;

        // Check if this record is missing from the database
        if (!existingIds.has(recordId)) {
          missingRecords.push({
            id: recordId,
            collectionDate: date,
            hostName: host,
            individualSandwiches: individualCount,
            groupCollections: groups,
            submittedAt: submittedAt,
            totalSandwiches: individualCount + groupTotal
          });
        }
      }
    });

    // Display analysis results
    console.log('📈 ANALYSIS RESULTS');
    console.log('===================');
    console.log(`Records in backup: ${insertLines.length.toLocaleString()}`);
    console.log(`Records in database: ${currentCollections.length.toLocaleString()}`);
    console.log(`Missing records: ${missingRecords.length.toLocaleString()}`);
    console.log(`Total sandwiches in backup: ${totalBackupSandwiches.toLocaleString()}\n`);

    if (missingRecords.length === 0) {
      console.log('✅ No missing records found! The issue might be with calculation logic only.');
      return;
    }

    // Show sample missing records
    console.log('🔍 SAMPLE MISSING RECORDS');
    console.log('=========================');
    missingRecords.slice(0, 10).forEach(record => {
      console.log(`ID: ${record.id}, Date: ${record.collectionDate}, Host: ${record.hostName}, Total: ${record.totalSandwiches}`);
    });

    console.log(`\n... and ${missingRecords.length - 10} more missing records\n`);

    // Calculate impact of missing records
    const missingSandwiches = missingRecords.reduce((sum, r) => sum + r.totalSandwiches, 0);
    console.log('💥 IMPACT OF MISSING RECORDS');
    console.log('=============================');
    console.log(`Missing sandwiches: ${missingSandwiches.toLocaleString()}`);
    console.log(`Percentage of total: ${((missingSandwiches / totalBackupSandwiches) * 100).toFixed(1)}%\n`);

    // Offer to import missing records
    console.log('🚀 IMPORT OPTIONS');
    console.log('=================');
    console.log('To import missing records, you can:');
    console.log('1. Run this script with --import flag (not implemented yet for safety)');
    console.log('2. Manually restore from backup using database tools');
    console.log('3. Check if the database is missing recent entries\n');

    console.log('⚠️  RECOMMENDATION: Check your database sync process to ensure all data is being captured.');

  } catch (error) {
    console.error('❌ Error analyzing missing collections:', error);
  }
}

// Run the analysis
importMissingCollections().then(() => {
  console.log('\n✅ Analysis complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});