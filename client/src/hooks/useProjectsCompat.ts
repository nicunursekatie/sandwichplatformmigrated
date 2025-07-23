/**
 * Project Compatibility Hooks
 * 
 * These hooks provide a compatibility layer between the two project systems,
 * abstracting away the data source differences (Supabase direct vs API) and
 * ensuring consistent data format between both component sets.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/queryClient';
import { projectAdapters } from '@/lib/project-adapters';
import type { Project, InsertProject } from "@shared/schema";

/**
 * Options for project queries
 */
interface ProjectQueryOptions {
  useNewApi?: boolean;
  includeDeleted?: boolean;
  includeDetails?: boolean;
}

/**
 * Hook to query projects with compatibility between both systems
 */
export function useProjects(options: ProjectQueryOptions = {}) {
  const { useNewApi = false, includeDeleted = false, includeDetails = true } = options;
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['/api/projects', useNewApi, includeDeleted, includeDetails],
    queryFn: async () => {
      try {
        if (useNewApi) {
          // Use the API endpoint (imported component approach)
          const data = await apiRequest('GET', '/api/projects');
          return data;
        } else {
          // Use direct Supabase query (existing approach)
          let query = supabase.from("projects").select("*");
          
          if (!includeDeleted) {
            query = query.is("deleted_at", null);
          }
          
          if (includeDetails) {
            // This is a simplified version - expand with actual joins as needed
            query = query.order("created_at", { ascending: false });
          }
          
          const { data, error } = await query;
          
          if (error) throw error;
          
          // Convert to format expected by imported components
          return data.map(projectAdapters.adaptToNewFormat);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
        throw error;
      }
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to query a single project by ID
 */
export function useProject(id: number | string | null, options: ProjectQueryOptions = {}) {
  const { useNewApi = false, includeDeleted = false } = options;
  
  return useQuery({
    queryKey: ['/api/projects', id, useNewApi, includeDeleted],
    queryFn: async () => {
      if (!id) return null;
      
      try {
        if (useNewApi) {
          // Use the API endpoint
          const data = await apiRequest('GET', `/api/projects/${id}`);
          return data;
        } else {
          // Use direct Supabase query
          let query = supabase.from("projects").select("*").eq("id", id);
          
          if (!includeDeleted) {
            query = query.is("deleted_at", null);
          }
          
          const { data, error } = await query.single();
          
          if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
          }
          
          return projectAdapters.adaptToNewFormat(data);
        }
      } catch (error) {
        console.error(`Error fetching project ${id}:`, error);
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 30000,
  });
}

/**
 * Hook for project mutations (create, update, delete)
 */
export function useProjectMutations(options: ProjectQueryOptions = {}) {
  const { useNewApi = false } = options;
  const queryClient = useQueryClient();
  
  const create = useMutation({
    mutationFn: async (project: Partial<InsertProject>) => {
      // Adapt the project for insertion
      const insertData = projectAdapters.adaptForInsert(project);
      
      if (useNewApi) {
        // Use the API endpoint
        return await apiRequest('POST', '/api/projects', insertData);
      } else {
        // Use direct Supabase query
        const { data, error } = await supabase.from("projects").insert(insertData).select();
        
        if (error) throw error;
        
        return projectAdapters.adaptToNewFormat(data[0]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    }
  });
  
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number | string } & Partial<Project>) => {
      const updateData = projectAdapters.adaptToExistingFormat(updates);
      
      if (useNewApi) {
        // Use the API endpoint
        return await apiRequest('PATCH', `/api/projects/${id}`, updateData);
      } else {
        // Use direct Supabase query
        const { data, error } = await supabase
          .from("projects")
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq("id", id)
          .select();
        
        if (error) throw error;
        
        return projectAdapters.adaptToNewFormat(data[0]);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', variables.id] });
    }
  });
  
  const remove = useMutation({
    mutationFn: async ({ id, userId }: { id: number | string, userId?: string }) => {
      const deleteData = {
        deleted_at: new Date().toISOString(),
        deleted_by: userId
      };
      
      if (useNewApi) {
        // Use the API endpoint
        return await apiRequest('DELETE', `/api/projects/${id}`, userId ? { userId } : undefined);
      } else {
        // Use direct Supabase query (soft delete)
        const { data, error } = await supabase
          .from("projects")
          .update(deleteData)
          .eq("id", id)
          .select();
        
        if (error) throw error;
        
        return projectAdapters.adaptToNewFormat(data[0]);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', variables.id] });
    }
  });
  
  return {
    create,
    update,
    remove
  };
}

export default {
  useProjects,
  useProject,
  useProjectMutations
};
