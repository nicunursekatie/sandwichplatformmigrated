#!/usr/bin/env node

/**
 * Debug script to analyze sandwich total calculations
 * This script will help identify discrepancies between expected and actual totals
 */

import { storage } from '../server/storage.ts';

async function debugSandwichTotals() {
  console.log('🔍 Debugging Sandwich Total Calculations');
  console.log('==========================================\n');

  try {
    // Get all collections
    console.log('📊 Fetching all sandwich collections...');
    const collections = await storage.getAllSandwichCollections();
    console.log(`✅ Found ${collections.length} collections\n`);

    // Calculate totals
    let individualTotal = 0;
    let groupSandwichCountTotal = 0;
    let groupCountTotal = 0;
    let parseErrors = 0;
    let recentCollections = [];

    collections.forEach((collection) => {
      individualTotal += collection.individualSandwiches || 0;

      // Track recent collections for debugging
      if (recentCollections.length < 5) {
        recentCollections.push({
          id: collection.id,
          date: collection.collectionDate,
          individual: collection.individualSandwiches,
          groups: collection.groupCollections
        });
      }

      // Calculate group collections total
      try {
        const groupData = JSON.parse(collection.groupCollections || "[]");
        if (Array.isArray(groupData)) {
          groupData.forEach(group => {
            if (group.sandwichCount) {
              groupSandwichCountTotal += group.sandwichCount;
            }
            if (group.count) {
              groupCountTotal += group.count;
            }
          });
        }
      } catch (error) {
        parseErrors++;
        // Handle text format like "Marketing Team: 8, Development: 6"
        if (collection.groupCollections && collection.groupCollections !== "[]") {
          const matches = collection.groupCollections.match(/(\d+)/g);
          if (matches) {
            groupSandwichCountTotal += matches.reduce((sum, num) => sum + parseInt(num), 0);
          }
        }
      }
    });

    // Display results
    console.log('📈 CALCULATION RESULTS');
    console.log('======================');
    console.log(`Total Collections: ${collections.length.toLocaleString()}`);
    console.log(`Individual Sandwiches: ${individualTotal.toLocaleString()}`);
    console.log(`Group Sandwiches (sandwichCount): ${groupSandwichCountTotal.toLocaleString()}`);
    console.log(`Group Sandwiches (count): ${groupCountTotal.toLocaleString()}`);
    console.log(`Parse Errors: ${parseErrors}`);
    console.log(`TOTAL SANDWICHES: ${(individualTotal + groupSandwichCountTotal + groupCountTotal).toLocaleString()}\n`);

    console.log('🎯 EXPECTED vs ACTUAL');
    console.log('======================');
    console.log('Expected from SQL backup: 2,183,360');
    console.log(`Actual from database: ${(individualTotal + groupSandwichCountTotal + groupCountTotal).toLocaleString()}`);
    console.log(`Difference: ${(2183360 - (individualTotal + groupSandwichCountTotal + groupCountTotal)).toLocaleString()}\n`);

    console.log('🔍 RECENT COLLECTIONS SAMPLE');
    console.log('=============================');
    recentCollections.forEach(c => {
      console.log(`ID: ${c.id}, Date: ${c.date}, Individual: ${c.individual}, Groups: ${c.groups?.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('❌ Error debugging sandwich totals:', error);
  }
}

// Run the debug script
debugSandwichTotals().then(() => {
  console.log('\n✅ Debug analysis complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});