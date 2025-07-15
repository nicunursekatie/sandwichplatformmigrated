# Soft Delete Implementation Guide

## Overview

This document describes the comprehensive soft delete system implemented for the Sandwich Project platform. The system provides safe deletion with audit logging, Row Level Security (RLS) protection, and administrative restore capabilities.

## Features

✅ **Soft Delete Columns**: Added `deleted_at` and `deleted_by` columns to all major tables  
✅ **Row Level Security**: Automatic filtering of soft-deleted records  
✅ **Audit Logging**: Complete audit trail with database triggers  
✅ **Admin Interface**: UI for managing soft-deleted records  
✅ **Restore Functionality**: Ability to restore soft-deleted records  
✅ **Permanent Deletion**: Super admin capability for permanent removal  

## Database Schema Changes

### Added Columns

All major tables now include:
```sql
deleted_at TIMESTAMP WITH TIME ZONE
deleted_by VARCHAR(255)
```

### New Tables

#### `deletion_audit`
Tracks all soft deletions with complete audit trail:
```sql
CREATE TABLE deletion_audit (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  record_id VARCHAR(255) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_by VARCHAR(255) NOT NULL,
  deletion_reason TEXT,
  record_data JSONB, -- Complete record data before deletion
  can_restore BOOLEAN DEFAULT true,
  restored_at TIMESTAMP WITH TIME ZONE,
  restored_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Database Functions

#### `get_current_user_id()`
Returns the current user ID from session context.

#### `set_current_user_id(user_id TEXT)`
Sets the current user ID for the session.

#### `is_admin()` / `is_super_admin()`
Check user permissions for administrative operations.

#### `restore_soft_deleted_record(table_name, record_id, user_id)`
Restores a soft-deleted record (admin only).

#### `permanently_delete_record(table_name, record_id)`
Permanently deletes a soft-deleted record (super admin only).

## Setup Instructions

### 1. Run Database Migration

Execute the migration in your Supabase Dashboard SQL Editor:

```bash
# Option 1: Run individual SQL files
# 1. Run scripts/implement-soft-deletes.sql
# 2. Run scripts/setup-rls-policies.sql  
# 3. Run scripts/create-audit-triggers.sql

# Option 2: Use the automated script (if available)
node scripts/execute-soft-delete-migration.js
```

### 2. Update Application Code

Import and use the soft delete helpers:

```typescript
import { softDeleteRecord, getNonDeletedRecords } from '../server/soft-delete-helpers';

// Soft delete a record
await softDeleteRecord(users, userId, { 
  currentUserId: 'current-user-id', 
  reason: 'User requested account deletion' 
});

// Get non-deleted records
const activeUsers = await getNonDeletedRecords(users);
```

### 3. Add Admin Interface

Add the soft delete manager to your admin dashboard:

```typescript
import { AdminSoftDeleteManager } from '../components/admin-soft-delete-manager';

// In your admin dashboard component
<AdminSoftDeleteManager className="mt-6" />
```

## Usage Examples

### Basic Soft Delete

```typescript
// Instead of hard delete
await db.delete(projects).where(eq(projects.id, projectId));

// Use soft delete
await softDeleteRecord(projects, projectId, {
  currentUserId: user.id,
  reason: 'Project cancelled by user'
});
```

### Querying Non-Deleted Records

```typescript
// Manual approach
const activeProjects = await db.select()
  .from(projects)
  .where(isNull(projects.deletedAt));

// Using helper
const activeProjects = await getNonDeletedRecords(projects);

// With additional conditions
const userProjects = await getNonDeletedRecordsWhere(
  projects, 
  eq(projects.userId, userId)
);
```

### Bulk Operations

```typescript
// Bulk soft delete
const result = await bulkSoftDelete(projects, [1, 2, 3], {
  currentUserId: user.id,
  reason: 'Bulk cleanup operation'
});

console.log(`${result.success} deleted, ${result.failed} failed`);
```

### Advanced Query Builder

```typescript
// Include deleted records in query
const allProjects = await softDeleteQuery(projects)
  .withDeleted()
  .select();

// Only deleted records
const deletedProjects = await softDeleteQuery(projects)
  .onlyDeleted();

// With conditions (excludes deleted by default)
const userProjects = await softDeleteQuery(projects)
  .where(eq(projects.userId, userId));
```

## Row Level Security (RLS) Policies

The system automatically filters soft-deleted records through RLS policies:

### Example Policy
```sql
-- Users can only see non-deleted projects
CREATE POLICY "Users can view non-deleted projects" ON projects
  FOR SELECT
  USING (deleted_at IS NULL);

-- Users can manage their own non-deleted projects
CREATE POLICY "Users can manage assigned projects" ON projects
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      assignee_ids::jsonb ? get_current_user_id() OR
      EXISTS (
        SELECT 1 FROM project_assignments pa 
        WHERE pa.project_id = projects.id 
        AND pa.user_id = get_current_user_id() 
        AND pa.deleted_at IS NULL
      )
    )
  );
```

## Audit Triggers

Automatic audit logging is handled by database triggers:

### Trigger Functions

1. **`audit_trigger_function()`**: Logs all INSERT, UPDATE, DELETE operations
2. **`soft_delete_audit_trigger_function()`**: Specialized logging for soft deletes

### What Gets Logged

- **Action Type**: INSERT, UPDATE, DELETE
- **Table Name**: Which table was affected
- **Record ID**: ID of the affected record
- **User ID**: Who performed the action
- **Old/New Data**: Complete record data before/after changes
- **Timestamp**: When the action occurred

## Admin Interface Features

### Deletion History
- View all soft-deleted records across all tables
- Filter by table name
- Search and pagination
- View original record data

### Restore Operations
- One-click restore for soft-deleted records
- Confirmation dialogs for safety
- Automatic audit logging of restores

### Permanent Deletion
- Super admin only capability
- Irreversible hard delete from database
- Updates audit log to mark as non-restorable

### Statistics Dashboard
- Total deletions count
- Restorable records count
- Restored records count
- Breakdown by table

## Security Features

### Permission Levels

1. **Regular Users**: Can soft delete their own records
2. **Admins**: Can restore soft-deleted records
3. **Super Admins**: Can permanently delete records

### RLS Protection
- Automatic filtering of deleted records
- User-specific access controls
- Admin bypass capabilities

### Audit Trail
- Complete history of all deletions
- User attribution for all actions
- Immutable audit log

## Troubleshooting

### Common Issues

#### 1. RLS Policy Conflicts
```sql
-- If you see permission errors, check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table_name';

-- Temporarily disable RLS for debugging (admin only)
ALTER TABLE your_table_name DISABLE ROW LEVEL SECURITY;
```

#### 2. Missing Soft Delete Columns
```sql
-- Check if columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'your_table_name' 
AND column_name IN ('deleted_at', 'deleted_by');

-- Add missing columns
ALTER TABLE your_table_name 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deleted_by VARCHAR(255);
```

#### 3. Trigger Not Firing
```sql
-- Check if triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'your_table_name';

-- Recreate trigger if missing
CREATE TRIGGER your_table_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON your_table_name
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

#### 4. Function Not Found
```sql
-- Check if functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%soft_delete%';

-- Recreate functions if missing (run the create-audit-triggers.sql script)
```

### Performance Considerations

#### Indexes
The migration creates optimized indexes for soft delete queries:
```sql
CREATE INDEX IF NOT EXISTS idx_table_deleted_at ON table_name(deleted_at) 
WHERE deleted_at IS NULL;
```

#### Query Optimization
- Use `getNonDeletedRecords()` helper for better performance
- Avoid `SELECT *` on large tables with soft deletes
- Consider archiving very old soft-deleted records

## Migration Checklist

- [ ] Run database migration scripts
- [ ] Update application queries to use soft delete helpers
- [ ] Test RLS policies with different user roles
- [ ] Verify audit triggers are working
- [ ] Add admin interface to your dashboard
- [ ] Train team on new deletion workflow
- [ ] Update documentation and procedures

## Best Practices

### 1. Always Use Helpers
```typescript
// ❌ Don't do manual soft deletes
await db.update(table).set({ deletedAt: new Date() });

// ✅ Use the helper functions
await softDeleteRecord(table, id, { currentUserId, reason });
```

### 2. Provide Deletion Reasons
```typescript
// ❌ Generic reason
await softDeleteRecord(table, id, { currentUserId });

// ✅ Descriptive reason
await softDeleteRecord(table, id, { 
  currentUserId, 
  reason: 'User requested account deletion via settings page' 
});
```

### 3. Regular Cleanup
Consider implementing periodic cleanup of old soft-deleted records:
```sql
-- Example: Permanently delete records older than 1 year
DELETE FROM table_name 
WHERE deleted_at < NOW() - INTERVAL '1 year'
AND deleted_at IS NOT NULL;
```

### 4. Monitor Performance
- Watch for slow queries on large tables
- Monitor audit table growth
- Consider partitioning for very large audit logs

## Support

For questions or issues with the soft delete implementation:

1. Check the troubleshooting section above
2. Review the audit logs for clues
3. Test with RLS disabled (temporarily, admin only)
4. Check database logs for errors
5. Verify user permissions and roles

The soft delete system is designed to be robust and safe, providing comprehensive audit trails while maintaining data integrity and security. 