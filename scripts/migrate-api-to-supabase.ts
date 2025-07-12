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

// Define mappings from old API endpoints to Supabase queries
const endpointMappings: APIEndpointMapping[] = [
  // Authentication endpoints
  {
    pattern: /apiRequest\(['"]GET['"],\s*['"]\/api\/auth\/profile['"]\)/g,
    replacement: `supabase.from('users').select('*').eq('id', user.id).single()`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]PUT['"],\s*['"]\/api\/auth\/profile['"],\s*([^)]+)\)/g,
    replacement: `supabase.from('users').update($1).eq('id', user.id)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Suggestions endpoints
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/suggestions['"],\s*([^)]+)\)/g,
    replacement: `supabase.from('suggestions').insert($1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /queryKey:\s*\[['"]\/api\/suggestions['"]\]/g,
    replacement: `queryKey: ['suggestions']`,
  },
  {
    pattern: /apiRequest\(['"]GET['"],\s*['"]\/api\/suggestions['"]\)/g,
    replacement: `supabase.from('suggestions').select('*').order('created_at', { ascending: false })`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]PATCH['"],\s*[`'"]\/api\/suggestions\/\$\{([^}]+)\}[`'"],\s*([^)]+)\)/g,
    replacement: `supabase.from('suggestions').update($2).eq('id', $1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]DELETE['"],\s*[`'"]\/api\/suggestions\/\$\{([^}]+)\}[`'"]\)/g,
    replacement: `supabase.from('suggestions').delete().eq('id', $1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Projects endpoints
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/projects['"],\s*([^)]+)\)/g,
    replacement: `supabase.from('projects').insert($1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]PATCH['"],\s*[`'"]\/api\/projects\/\$\{([^}]+)\}[`'"],\s*([^)]+)\)/g,
    replacement: `supabase.from('projects').update($2).eq('id', $1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]DELETE['"],\s*[`'"]\/api\/projects\/\$\{([^}]+)\}[`'"]\)/g,
    replacement: `supabase.from('projects').delete().eq('id', $1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Tasks endpoints
  {
    pattern: /apiRequest\(['"]POST['"],\s*[`'"]\/api\/projects\/\$\{([^}]+)\}\/tasks[`'"],\s*([^)]+)\)/g,
    replacement: `supabase.from('project_tasks').insert({ ...$2, project_id: $1 })`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]PATCH['"],\s*[`'"]\/api\/projects\/\$\{[^}]+\}\/tasks\/\$\{([^}]+)\}[`'"],\s*([^)]+)\)/g,
    replacement: `supabase.from('project_tasks').update($2).eq('id', $1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Messages endpoints
  {
    pattern: /apiRequest\(['"]POST['"],\s*[`'"]\/api\/conversations\/\$\{([^}]+)\}\/messages[`'"],\s*([^)]+)\)/g,
    replacement: `supabase.from('messages').insert({ ...$2, conversation_id: $1 })`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]PATCH['"],\s*[`'"]\/api\/messages\/\$\{([^}]+)\}[`'"],\s*([^)]+)\)/g,
    replacement: `supabase.from('messages').update($2).eq('id', $1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]DELETE['"],\s*[`'"]\/api\/messages\/\$\{([^}]+)\}[`'"]\)/g,
    replacement: `supabase.from('messages').delete().eq('id', $1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Notifications
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/notifications['"],\s*([^)]+)\)/g,
    replacement: `supabase.from('notifications').insert($1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Work logs
  {
    pattern: /apiRequest\(['"]GET['"],\s*['"]\/api\/work-logs['"]\)/g,
    replacement: `supabase.from('work_logs').select('*').order('created_at', { ascending: false })`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Weekly reports
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/weekly-reports['"],\s*([^)]+)\)/g,
    replacement: `supabase.from('weekly_reports').insert($1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Meetings
  {
    pattern: /fetch\(['"]\/api\/meetings['"]\)/g,
    replacement: `supabase.from('meetings').select('*')`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/agenda-items['"],\s*([^)]+)\)/g,
    replacement: `supabase.from('agenda_items').insert($1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Query key updates
  {
    pattern: /queryKey:\s*\[['"]\/api\/auth\/user['"]\]/g,
    replacement: `queryKey: ['user-data', user?.id]`,
  },
  {
    pattern: /queryKey:\s*\[['"]\/api\/auth\/profile['"]\]/g,
    replacement: `queryKey: ['user-profile', user?.id]`,
  },
  
  // Sandwich collections
  {
    pattern: /fetch\(['"]\/api\/sandwich-collections['"]\)/g,
    replacement: `supabase.from('sandwich_collections').select('*')`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/import-collections['"],\s*([^)]+)\)/g,
    replacement: `supabase.from('sandwich_collections').insert($1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Reports
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/reports\/generate['"],\s*([^)]+)\)/g,
    replacement: `supabase.from('reports').insert($1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/reports\/schedule['"],\s*([^)]+)\)/g,
    replacement: `supabase.from('scheduled_reports').insert($1)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Project assignments
  {
    pattern: /apiRequest\(['"]POST['"],\s*[`'"]\/api\/projects\/\$\{([^}]+)\}\/assignments[`'"],\s*([^)]+)\)/g,
    replacement: `supabase.from('project_assignments').insert({ ...$2, project_id: $1 })`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]DELETE['"],\s*[`'"]\/api\/projects\/\$\{[^}]+\}\/assignments\/\$\{([^}]+)\}[`'"],\s*([^)]+)\)/g,
    replacement: `supabase.from('project_assignments').delete().eq('user_id', $1).eq('project_id', project.id)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  {
    pattern: /apiRequest\(['"]PATCH['"],\s*[`'"]\/api\/projects\/\$\{[^}]+\}\/assignments\/\$\{([^}]+)\}[`'"],\s*([^)]+)\)/g,
    replacement: `supabase.from('project_assignments').update($2).eq('user_id', $1).eq('project_id', project.id)`,
    imports: [`import { supabase } from '@/lib/supabase';`]
  },
  
  // Message notifications
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/message-notifications\/mark-all-read['"]\)/g,
    replacement: `supabase.from('message_reads').insert({ user_id: user.id, read_at: new Date().toISOString() })`,
    imports: [`import { supabase } from '@/lib/supabase';`]
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
  
  console.log('🔄 Starting API to Supabase migration...');
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
}

// Run the migration
main().catch(console.error);