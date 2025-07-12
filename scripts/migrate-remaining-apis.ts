#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface APIEndpointMapping {
  pattern: RegExp;
  replacement: string;
  imports?: string[];
  notes?: string;
}

// Define mappings for remaining API endpoints
const endpointMappings: APIEndpointMapping[] = [
  // Hosts management
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/hosts['"],\s*([^)]+)\)/g,
    replacement: `supabase.from('hosts').insert($1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/host-contacts['"],\s*([^)]+)\)/g,
    replacement: `supabase.from('host_contacts').insert($1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Bulk operations
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/bulk-map-hosts['"],\s*([^)]+)\)/g,
    replacement: `// TODO: Implement bulk host mapping with Supabase\n      // This requires a custom RPC function or client-side processing`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Sandwich collections
  {
    pattern: /fetch\(['"]\/api\/sandwich-collections\?limit=(\d+)['"]\)/g,
    replacement: `supabase.from('sandwich_collections').select('*').limit($1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /fetch\(['"]\/api\/sandwich-collections\/stats['"]\)/g,
    replacement: `supabase.rpc('get_collection_stats')`,
    imports: [`import { supabase } from '@/lib/supabase';`],
    notes: 'Requires a Supabase RPC function for aggregation'
  },
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/sandwich-collections['"],\s*([^)]+)\)/g,
    replacement: `supabase.from('sandwich_collections').insert($1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Import endpoints
  {
    pattern: /fetch\(['"]\/api\/import-collections['"],\s*\{([^}]+)\}\)/g,
    replacement: `// TODO: Implement bulk import with Supabase\n      // Parse CSV/JSON and use supabase.from('sandwich_collections').insert(parsedData)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /fetch\(['"]\/api\/import-contacts['"],\s*\{([^}]+)\}\)/g,
    replacement: `// TODO: Implement contact import with Supabase\n      // Parse CSV and use supabase.from('contacts').insert(parsedData)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /fetch\(['"]\/api\/recipients\/import['"],\s*\{([^}]+)\}\)/g,
    replacement: `// TODO: Implement recipient import with Supabase\n      // Parse CSV and use supabase.from('recipients').insert(parsedData)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Meetings
  {
    pattern: /fetch\(['"]\/api\/meetings['"],\s*\{([^}]+)method:\s*['"]POST['"][^}]+\}\)/g,
    replacement: `supabase.from('meetings').insert(data)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /fetch\(['"]\/api\/agenda-items['"],\s*\{([^}]+)\}\)/g,
    replacement: `supabase.from('agenda_items').insert(data)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Export
  {
    pattern: /fetch\(['"]\/api\/data\/export\/full-dataset['"]\)/g,
    replacement: `// TODO: Implement data export with Supabase\n      // Fetch all data and format for export`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Google Sheets
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/google-sheets\/sync\/import['"],\s*([^)]+)\)/g,
    replacement: `// TODO: Implement Google Sheets import\n      // Fetch from Google Sheets API and insert to Supabase`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/google-sheets\/sync\/export['"],\s*([^)]+)\)/g,
    replacement: `// TODO: Implement Google Sheets export\n      // Fetch from Supabase and update Google Sheets`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Conversations
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/conversations['"],\s*([^)]+)\)/g,
    replacement: `supabase.from('conversations').insert($1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Messages with query params
  {
    pattern: /['"]\/api\/messages\?chatType=\$\{([^}]+)\}['"]/g,
    replacement: `supabase.from('messages').select('*').eq('chat_type', $1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Debug endpoints (remove these)
  {
    pattern: /fetch\(['"]\/api\/debug\/[^'"]+['"]\)/g,
    replacement: `// Debug endpoint removed - use Supabase dashboard for debugging`,
    imports: []
  },
];

async function processFile(filePath: string, dryRun: boolean = false): Promise<{changed: boolean, changes: string[]}> {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const changes: string[] = [];
  const importsToAdd = new Set<string>();
  
  // Apply each mapping
  for (const mapping of endpointMappings) {
    const matches = content.match(mapping.pattern);
    if (matches) {
      content = content.replace(mapping.pattern, mapping.replacement);
      changes.push(`Applied: ${mapping.pattern} -> ${mapping.replacement}`);
      
      if (mapping.imports) {
        mapping.imports.forEach(imp => importsToAdd.add(imp));
      }
    }
  }
  
  // Add necessary imports if file was changed
  if (content !== originalContent && importsToAdd.size > 0) {
    // Check if supabase is already imported
    const hasSupabaseImport = content.includes("from '@/lib/supabase'") || content.includes('from "@/lib/supabase"');
    
    if (!hasSupabaseImport) {
      // Find the last import statement
      const importRegex = /^import .* from .*;?\s*$/gm;
      const imports = content.match(importRegex);
      if (imports) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length;
        
        const newImports = Array.from(importsToAdd).join('\n');
        content = content.slice(0, insertPosition) + '\n' + newImports + content.slice(insertPosition);
      }
    }
  }
  
  if (!dryRun && content !== originalContent) {
    fs.writeFileSync(filePath, content);
  }
  
  return {
    changed: content !== originalContent,
    changes
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  
  console.log('🔄 Starting remaining API to Supabase migration...');
  if (dryRun) {
    console.log('📝 DRY RUN MODE - No files will be modified');
  }
  
  // Find all TypeScript/TSX files in client/src
  const files = await glob('client/src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
  });
  
  console.log(`📁 Found ${files.length} files to process`);
  
  let totalChanged = 0;
  const fileChanges: Record<string, string[]> = {};
  
  for (const file of files) {
    const result = await processFile(file, dryRun);
    
    if (result.changed) {
      totalChanged++;
      fileChanges[file] = result.changes;
      
      if (verbose || dryRun) {
        console.log(`\n✏️  ${file}:`);
        result.changes.forEach(change => console.log(`   - ${change}`));
      }
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   - Files processed: ${files.length}`);
  console.log(`   - Files changed: ${totalChanged}`);
  
  if (!verbose && totalChanged > 0) {
    console.log('\n📝 Changed files:');
    Object.keys(fileChanges).forEach(file => {
      console.log(`   - ${file} (${fileChanges[file].length} changes)`);
    });
  }
  
  if (dryRun && totalChanged > 0) {
    console.log('\n💡 Run without --dry-run to apply these changes');
  }
  
  console.log('\n⚠️  Note: Some endpoints require manual implementation:');
  console.log('   - Bulk operations (bulk-map-hosts)');
  console.log('   - Import/Export functionality');
  console.log('   - Google Sheets integration');
  console.log('   - Statistics aggregation (may need RPC functions)');
}

// Run the migration
main().catch(console.error);