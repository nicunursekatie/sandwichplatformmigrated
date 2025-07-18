#!/usr/bin/env node

/**
 * Security Fixes Script
 * 
 * This script helps apply security vulnerability fixes in a controlled manner.
 * Run this to update packages with security issues while preserving functionality.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 Security Fixes Script Starting...\n');

// Backup package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const backupPath = path.join(__dirname, '..', 'package.json.backup');

try {
  console.log('📄 Creating backup of package.json...');
  fs.copyFileSync(packageJsonPath, backupPath);
  console.log('✅ Backup created at package.json.backup\n');

  // Show current vulnerabilities
  console.log('📊 Current security vulnerabilities:');
  execSync('npm audit --json > audit-results.json', { stdio: 'ignore' });
  
  const auditResults = JSON.parse(fs.readFileSync('audit-results.json'));
  const vulnerabilities = auditResults.vulnerabilities || {};
  
  console.log(`Total vulnerabilities: ${Object.keys(vulnerabilities).length}`);
  
  Object.entries(vulnerabilities).forEach(([pkg, details]) => {
    const severity = details.severity;
    const emoji = severity === 'high' ? '🔴' : severity === 'moderate' ? '🟡' : '🟢';
    console.log(`${emoji} ${pkg}: ${severity}`);
  });
  
  console.log('\n🔧 Applying safe security fixes...');
  
  // Apply non-breaking fixes first
  try {
    execSync('npm audit fix', { stdio: 'inherit' });
    console.log('✅ Non-breaking fixes applied successfully\n');
  } catch (error) {
    console.log('⚠️  Some non-breaking fixes failed\n');
  }
  
  // Handle specific vulnerability fixes
  console.log('🎯 Applying specific fixes for high-priority vulnerabilities...\n');
  
  // Fix multer vulnerability (if present)
  try {
    console.log('Checking multer version...');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
    if (packageJson.dependencies.multer) {
      console.log('🔧 Updating multer to safe version...');
      execSync('npm install multer@^1.4.5-lts.1', { stdio: 'inherit' });
      console.log('✅ Multer updated\n');
    }
  } catch (error) {
    console.log('⚠️  Multer update failed:', error.message, '\n');
  }
  
  // Fix on-headers vulnerability (if present)
  try {
    console.log('Checking on-headers dependency...');
    execSync('npm list on-headers', { stdio: 'pipe' });
    console.log('🔧 Updating express-session to fix on-headers...');
    execSync('npm install express-session@^1.18.2', { stdio: 'inherit' });
    console.log('✅ Express-session updated\n');
  } catch (error) {
    console.log('ℹ️  on-headers not found or already fixed\n');
  }
  
  // Show remaining vulnerabilities
  console.log('📊 Checking remaining vulnerabilities...');
  try {
    execSync('npm audit', { stdio: 'inherit' });
  } catch (error) {
    console.log('Some vulnerabilities may remain - check manually\n');
  }
  
  console.log('✅ Security fixes completed!');
  console.log('📝 Recommendations for remaining vulnerabilities:');
  console.log('   • esbuild: Update when Vite releases compatible version');
  console.log('   • xlsx: Consider replacing with safer alternative like "exceljs"');
  console.log('   • path-to-regexp: Will be fixed with @vercel/node update');
  console.log('   • request: Consider replacing with "axios" or "node-fetch"');
  
} catch (error) {
  console.error('❌ Error applying security fixes:', error.message);
  
  // Restore backup if something went wrong
  if (fs.existsSync(backupPath)) {
    console.log('🔄 Restoring package.json backup...');
    fs.copyFileSync(backupPath, packageJsonPath);
    console.log('✅ Backup restored');
  }
} finally {
  // Cleanup
  if (fs.existsSync('audit-results.json')) {
    fs.unlinkSync('audit-results.json');
  }
}

console.log('\n🎉 Security fixes script completed!');
console.log('💡 Run "npm audit" to see current security status');
console.log('💡 Run "npm test" to verify functionality after updates');