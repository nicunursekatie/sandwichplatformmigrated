import { db } from "./db";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { deletionAudit } from "../shared/schema";

// Helper interface for soft delete operations
export interface SoftDeleteOptions {
  currentUserId?: string;
  reason?: string;
}

// Helper function to perform soft delete on any table
export async function softDeleteRecord(
  table: any,
  id: string | number,
  options: SoftDeleteOptions = {}
): Promise<boolean> {
  const { currentUserId, reason = 'Soft delete via application' } = options;
  const deletedAt = new Date();
  const deletedBy = currentUserId || 'system';
  
  try {
    // Get the record before deletion for audit
    const [existingRecord] = await db.select().from(table).where(eq(table.id, id)).limit(1);
    
    if (!existingRecord) {
      return false;
    }
    
    // Perform soft delete
    const result = await db
      .update(table)
      .set({ 
        deletedAt, 
        deletedBy 
      })
      .where(eq(table.id, id));
    
    // Log to deletion audit
    if (result.rowCount && result.rowCount > 0) {
      await db.insert(deletionAudit).values({
        tableName: table[Symbol.for('drizzle:Name')] || 'unknown',
        recordId: id.toString(),
        deletedAt,
        deletedBy,
        deletionReason: reason,
        recordData: existingRecord,
        canRestore: true
      });
    }
    
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error performing soft delete:', error);
    return false;
  }
}

// Helper function to restore a soft-deleted record
export async function restoreRecord(
  table: any,
  id: string | number,
  currentUserId?: string
): Promise<boolean> {
  try {
    const result = await db
      .update(table)
      .set({ 
        deletedAt: null, 
        deletedBy: null 
      })
      .where(and(eq(table.id, id), isNotNull(table.deletedAt)));
    
    // Update deletion audit log
    if (result.rowCount && result.rowCount > 0) {
      await db.update(deletionAudit).set({
        restoredAt: new Date(),
        restoredBy: currentUserId || 'system'
      }).where(and(
        eq(deletionAudit.tableName, table[Symbol.for('drizzle:Name')] || 'unknown'),
        eq(deletionAudit.recordId, id.toString()),
        isNull(deletionAudit.restoredAt)
      ));
    }
    
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error restoring record:', error);
    return false;
  }
}

// Helper function to get non-deleted records from any table
export function getNonDeletedRecords(table: any) {
  return db.select().from(table).where(isNull(table.deletedAt));
}

// Helper function to get non-deleted records with additional conditions
export function getNonDeletedRecordsWhere(table: any, whereCondition: any) {
  return db.select().from(table).where(and(isNull(table.deletedAt), whereCondition));
}

// Helper function to check if a record is soft-deleted
export async function isRecordDeleted(table: any, id: string | number): Promise<boolean> {
  const [record] = await db.select({ deletedAt: table.deletedAt })
    .from(table)
    .where(eq(table.id, id))
    .limit(1);
  
  return record ? record.deletedAt !== null : true; // Consider non-existent records as "deleted"
}

// Helper function to get deletion history for a specific table/record
export async function getDeletionHistory(tableName?: string, recordId?: string) {
  let query = db.select().from(deletionAudit);
  
  if (tableName) {
    query = query.where(eq(deletionAudit.tableName, tableName));
  }
  
  if (recordId) {
    query = query.where(eq(deletionAudit.recordId, recordId));
  }
  
  return query.orderBy(desc(deletionAudit.deletedAt));
}

// Helper function to get all soft-deleted records from a table
export function getDeletedRecords(table: any) {
  return db.select().from(table).where(isNull(table.deletedAt) === false);
}

// Helper function to permanently delete a soft-deleted record (admin only)
export async function permanentlyDeleteRecord(
  table: any,
  id: string | number,
  currentUserId?: string
): Promise<boolean> {
  try {
    // Only delete if it's already soft-deleted
    const result = await db
      .delete(table)
      .where(and(eq(table.id, id), isNull(table.deletedAt) === false));
    
    // Update deletion audit log
    if (result.rowCount && result.rowCount > 0) {
      await db.update(deletionAudit).set({
        canRestore: false
      }).where(and(
        eq(deletionAudit.tableName, table[Symbol.for('drizzle:Name')] || 'unknown'),
        eq(deletionAudit.recordId, id.toString())
      ));
    }
    
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error permanently deleting record:', error);
    return false;
  }
}

// Helper function to bulk soft delete multiple records
export async function bulkSoftDelete(
  table: any,
  ids: (string | number)[],
  options: SoftDeleteOptions = {}
): Promise<{ success: number; failed: number }> {
  const { currentUserId, reason = 'Bulk soft delete via application' } = options;
  const deletedAt = new Date();
  const deletedBy = currentUserId || 'system';
  
  let success = 0;
  let failed = 0;
  
  for (const id of ids) {
    try {
      const result = await softDeleteRecord(table, id, { currentUserId, reason });
      if (result) {
        success++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Error soft deleting record ${id}:`, error);
      failed++;
    }
  }
  
  return { success, failed };
}

// Helper function to create a soft-delete aware query builder
export class SoftDeleteQueryBuilder {
  private table: any;
  private includeDeleted: boolean = false;
  
  constructor(table: any) {
    this.table = table;
  }
  
  // Include soft-deleted records in the query
  withDeleted() {
    this.includeDeleted = true;
    return this;
  }
  
  // Only get soft-deleted records
  onlyDeleted() {
    return db.select().from(this.table).where(isNull(this.table.deletedAt) === false);
  }
  
  // Get all records (default behavior excludes deleted)
  select() {
    if (this.includeDeleted) {
      return db.select().from(this.table);
    } else {
      return db.select().from(this.table).where(isNull(this.table.deletedAt));
    }
  }
  
  // Get records with additional where conditions
  where(condition: any) {
    if (this.includeDeleted) {
      return db.select().from(this.table).where(condition);
    } else {
      return db.select().from(this.table).where(and(isNull(this.table.deletedAt), condition));
    }
  }
}

// Factory function to create a soft-delete aware query builder
export function softDeleteQuery(table: any) {
  return new SoftDeleteQueryBuilder(table);
}

// Middleware function to set current user context
export function withCurrentUser(userId: string) {
  return {
    softDelete: (table: any, id: string | number, reason?: string) => 
      softDeleteRecord(table, id, { currentUserId: userId, reason }),
    restore: (table: any, id: string | number) => 
      restoreRecord(table, id, userId),
    permanentDelete: (table: any, id: string | number) => 
      permanentlyDeleteRecord(table, id, userId),
    bulkSoftDelete: (table: any, ids: (string | number)[], reason?: string) => 
      bulkSoftDelete(table, ids, { currentUserId: userId, reason })
  };
}

// Export types for use in other modules
export type SoftDeleteContext = ReturnType<typeof withCurrentUser>; 