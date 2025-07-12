#!/usr/bin/env tsx

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Migration mappings from API endpoints to Supabase service calls
const API_TO_SUPABASE_MAPPINGS = [
  // Sandwich Collections
  {
    pattern: /apiRequest\(['"]GET['"],\s*['"]\/api\/sandwich-collections['"]\)/g,
    replacement: 'supabaseService.sandwichCollection.getAllCollections()',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/sandwich-collections['"],\s*([^)]+)\)/g,
    replacement: 'supabaseService.sandwichCollection.createCollection($1)',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  {
    pattern: /apiRequest\(['"]PATCH['"],\s*[`'"]\/api\/sandwich-collections\/\$\{([^}]+)\}[`'"],\s*([^)]+)\)/g,
    replacement: 'supabaseService.sandwichCollection.updateCollection($1, $2)',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  {
    pattern: /apiRequest\(['"]DELETE['"],\s*[`'"]\/api\/sandwich-collections\/\$\{([^}]+)\}[`'"]\)/g,
    replacement: 'supabaseService.sandwichCollection.deleteCollection($1)',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  
  // Hosts
  {
    pattern: /apiRequest\(['"]GET['"],\s*['"]\/api\/hosts['"]\)/g,
    replacement: 'supabaseService.host.getAllHosts()',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/hosts['"],\s*([^)]+)\)/g,
    replacement: 'supabaseService.host.createHost($1)',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  {
    pattern: /apiRequest\(['"]PATCH['"],\s*[`'"]\/api\/hosts\/\$\{([^}]+)\}[`'"],\s*([^)]+)\)/g,
    replacement: 'supabaseService.host.updateHost($1, $2)',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  
  // Projects
  {
    pattern: /apiRequest\(['"]GET['"],\s*['"]\/api\/projects['"]\)/g,
    replacement: 'supabaseService.project.getAllProjects()',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/projects['"],\s*([^)]+)\)/g,
    replacement: 'supabaseService.project.createProject($1)',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  
  // Messages
  {
    pattern: /apiRequest\(['"]GET['"],\s*['"]\/api\/messages['"]\)/g,
    replacement: 'supabaseService.message.getAllMessages()',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/messages['"],\s*([^)]+)\)/g,
    replacement: 'supabaseService.message.createMessage($1)',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  
  // Suggestions
  {
    pattern: /apiRequest\(['"]GET['"],\s*['"]\/api\/suggestions['"]\)/g,
    replacement: 'supabaseService.suggestion.getAllSuggestions()',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/suggestions['"],\s*([^)]+)\)/g,
    replacement: 'supabaseService.suggestion.createSuggestion($1)',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  
  // Work Logs
  {
    pattern: /apiRequest\(['"]GET['"],\s*['"]\/api\/work-logs['"]\)/g,
    replacement: 'supabaseService.workLog.getAllWorkLogs()',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  {
    pattern: /apiRequest\(['"]POST['"],\s*['"]\/api\/work-logs['"],\s*([^)]+)\)/g,
    replacement: 'supabaseService.workLog.createWorkLog($1)',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  
  // Users
  {
    pattern: /apiRequest\(['"]GET['"],\s*['"]\/api\/users['"]\)/g,
    replacement: 'supabaseService.user.getAllUsers()',
    imports: ['import { supabaseService } from "@/lib/supabase-service";']
  },
  
  // Query key updates
  {
    pattern: /queryKey:\s*\[['"]\/api\/sandwich-collections['"]\]/g,
    replacement: 'queryKey: ["sandwich-collections"]'
  },
  {
    pattern: /queryKey:\s*\[['"]\/api\/hosts['"]\]/g,
    replacement: 'queryKey: ["hosts"]'
  },
  {
    pattern: /queryKey:\s*\[['"]\/api\/projects['"]\]/g,
    replacement: 'queryKey: ["projects"]'
  },
  {
    pattern: /queryKey:\s*\[['"]\/api\/messages['"]\]/g,
    replacement: 'queryKey: ["messages"]'
  },
  {
    pattern: /queryKey:\s*\[['"]\/api\/suggestions['"]\]/g,
    replacement: 'queryKey: ["suggestions"]'
  },
  {
    pattern: /queryKey:\s*\[['"]\/api\/work-logs['"]\]/g,
    replacement: 'queryKey: ["work-logs"]'
  },
  {
    pattern: /queryKey:\s*\[['"]\/api\/users['"]\]/g,
    replacement: 'queryKey: ["users"]'
  },
  
  // Field name updates for sandwich collections
  {
    pattern: /\.hostName/g,
    replacement: '.host_name'
  },
  {
    pattern: /\.collectionDate/g,
    replacement: '.collection_date'
  },
  {
    pattern: /\.individualSandwiches/g,
    replacement: '.individual_sandwiches'
  },
  {
    pattern: /\.groupCollections/g,
    replacement: '.group_collections'
  },
  {
    pattern: /\.submittedAt/g,
    replacement: '.submitted_at'
  },
  
  // Remove apiRequest import
  {
    pattern: /import\s*\{\s*apiRequest[^}]*\}\s*from\s*['"]@\/lib\/queryClient['"];?/g,
    replacement: ''
  },
  
  // Add supabaseService import
  {
    pattern: /import\s*\{\s*queryClient[^}]*\}\s*from\s*['"]@\/lib\/queryClient['"];?/g,
    replacement: 'import { queryClient } from "@/lib/queryClient";\nimport { supabaseService } from "@/lib/supabase-service";'
  }
];

// Field name mappings for type updates
const FIELD_NAME_MAPPINGS = [
  { old: 'hostName', new: 'host_name' },
  { old: 'collectionDate', new: 'collection_date' },
  { old: 'individualSandwiches', new: 'individual_sandwiches' },
  { old: 'groupCollections', new: 'group_collections' },
  { old: 'submittedAt', new: 'submitted_at' },
  { old: 'firstName', new: 'first_name' },
  { old: 'lastName', new: 'last_name' },
  { old: 'displayName', new: 'display_name' },
  { old: 'profileImageUrl', new: 'profile_image_url' },
  { old: 'lastLoginAt', new: 'last_login_at' },
  { old: 'createdAt', new: 'created_at' },
  { old: 'updatedAt', new: 'updated_at' },
  { old: 'createdBy', new: 'created_by' },
  { old: 'conversationId', new: 'conversation_id' },
  { old: 'senderId', new: 'sender_id' },
  { old: 'contactName', new: 'contact_name' },
  { old: 'contactPhone', new: 'contact_phone' },
  { old: 'contactEmail', new: 'contact_email' },
  { old: 'isActive', new: 'is_active' },
  { old: 'submittedBy', new: 'submitted_by' },
  { old: 'userId', new: 'user_id' },
  { old: 'weekStart', new: 'week_start' },
  { old: 'weekEnd', new: 'week_end' },
  { old: 'sandwichCount', new: 'sandwich_count' },
  { old: 'volunteerHours', new: 'volunteer_hours' },
  { old: 'driveLinks', new: 'drive_links' },
  { old: 'createdBy', new: 'created_by' }
];

function migrateFile(filePath: string): boolean {
  try {
    let content = readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Apply API to Supabase mappings
    for (const mapping of API_TO_SUPABASE_MAPPINGS) {
      const newContent = content.replace(mapping.pattern, mapping.replacement);
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
        
        // Add imports if needed
        if (mapping.imports) {
          for (const importStatement of mapping.imports) {
            if (!content.includes(importStatement)) {
              // Find the last import statement and add after it
              const importMatch = content.match(/import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm);
              if (importMatch) {
                const lastImport = importMatch[importMatch.length - 1];
                content = content.replace(lastImport, lastImport + '\n' + importStatement);
              } else {
                // Add at the top if no imports found
                content = importStatement + '\n' + content;
              }
            }
          }
        }
      }
    }
    
    // Apply field name mappings
    for (const mapping of FIELD_NAME_MAPPINGS) {
      const pattern = new RegExp(`\\.${mapping.old}\\b`, 'g');
      const newContent = content.replace(pattern, `.${mapping.new}`);
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Migrated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error);
    return false;
  }
}

function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  
  function scanDirectory(currentDir: string) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .git
        if (item !== 'node_modules' && item !== '.git' && !item.startsWith('.')) {
          scanDirectory(fullPath);
        }
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDirectory(dir);
  return files;
}

function main() {
  console.log('🚀 Starting Supabase migration...');
  
  const clientDir = join(process.cwd(), 'client', 'src');
  const files = findTypeScriptFiles(clientDir);
  
  let migratedCount = 0;
  
  for (const file of files) {
    if (migrateFile(file)) {
      migratedCount++;
    }
  }
  
  console.log(`\n✅ Migration complete! Migrated ${migratedCount} files.`);
  console.log('\n📝 Next steps:');
  console.log('1. Review the migrated files for any remaining issues');
  console.log('2. Update any remaining field names manually');
  console.log('3. Test the application to ensure everything works');
  console.log('4. Remove the server directory if no longer needed');
}

main(); 