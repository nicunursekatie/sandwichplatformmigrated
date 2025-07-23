/**
 * Project Adapters
 * 
 * This module provides adapter functions to convert between different project data formats
 * used in the application, enabling smooth integration between components from different codebases.
 */

import type { Project, InsertProject } from "@shared/schema";

/**
 * Converts a project from the existing app format to the format expected by imported components
 */
export function adaptToNewFormat(project: any): any {
  if (!project) return null;
  
  // Map fields that have different names or structures
  return {
    ...project,
    // Standard fields - map snake_case to camelCase
    dueDate: project.due_date || project.dueDate,
    startDate: project.start_date || project.startDate,
    completionDate: project.completion_date || project.completionDate,
    progressPercentage: project.progress_percentage !== undefined ? project.progress_percentage : project.progressPercentage,
    estimatedHours: project.estimated_hours !== undefined ? project.estimated_hours : project.estimatedHours,
    actualHours: project.actual_hours !== undefined ? project.actual_hours : project.actualHours,
    assigneeIds: project.assignee_ids || project.assigneeIds || [],
    assigneeNames: project.assignee_names || project.assigneeName || "",
    
    // Ensure all required fields have values
    status: project.status || 'available',
    priority: project.priority || 'medium',
    category: project.category || 'general',
    color: project.color || 'blue',
    
    // Convert dates to ISO strings if they're Date objects
    createdAt: project.created_at ? 
      (typeof project.created_at === 'string' ? project.created_at : project.created_at.toISOString()) : 
      (project.createdAt ? (typeof project.createdAt === 'string' ? project.createdAt : project.createdAt.toISOString()) : new Date().toISOString()),
      
    updatedAt: project.updated_at ? 
      (typeof project.updated_at === 'string' ? project.updated_at : project.updated_at.toISOString()) : 
      (project.updatedAt ? (typeof project.updatedAt === 'string' ? project.updatedAt : project.updatedAt.toISOString()) : new Date().toISOString()),
  };
}

/**
 * Converts a project from the imported component format to the format used by the existing app
 */
export function adaptToExistingFormat(project: any): any {
  if (!project) return null;
  
  return {
    ...project,
    // Standard fields - map camelCase to snake_case
    due_date: project.dueDate || project.due_date,
    start_date: project.startDate || project.start_date,
    completion_date: project.completionDate || project.completion_date,
    progress_percentage: project.progressPercentage !== undefined ? project.progressPercentage : project.progress_percentage,
    estimated_hours: project.estimatedHours !== undefined ? project.estimatedHours : project.estimated_hours,
    actual_hours: project.actualHours !== undefined ? project.actualHours : project.actual_hours,
    assignee_ids: project.assigneeIds || project.assignee_ids || [],
    assignee_names: project.assigneeNames || project.assignee_names || "",
    
    // Convert dates to format expected by existing app
    created_at: project.createdAt || project.created_at || new Date().toISOString(),
    updated_at: project.updatedAt || project.updated_at || new Date().toISOString(),
  };
}

/**
 * Adapts a project for create/insert operations
 */
export function adaptForInsert(project: any): Partial<InsertProject> {
  const adapted = adaptToExistingFormat(project);
  
  // Remove any fields that shouldn't be in an insert operation
  const { id, created_at, updated_at, deleted_at, deleted_by, ...insertable } = adapted;
  
  return insertable;
}

/**
 * Adapts project data from Supabase direct queries to match the API response format
 */
export function adaptSupabaseToApiFormat(supabaseData: any): any {
  if (Array.isArray(supabaseData)) {
    return supabaseData.map(item => adaptSupabaseToApiFormat(item));
  }
  
  if (!supabaseData) return null;
  
  // First convert to new format to get consistent field names
  const newFormat = adaptToNewFormat(supabaseData);
  
  // Then add any API-specific transformations
  return {
    ...newFormat,
    // Add any API-specific fields or transformations here
  };
}

/**
 * Project adapters module with all conversion functions
 */
export const projectAdapters = {
  adaptToNewFormat,
  adaptToExistingFormat,
  adaptForInsert,
  adaptSupabaseToApiFormat
};

export default projectAdapters;
