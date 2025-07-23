/**
 * Wrapper for the imported ProjectAssigneeSelector component
 * Adapts the component to work with the existing application
 */

import { ProjectAssigneeSelector as ImportedProjectAssigneeSelector } from '../projectsfromnewapp/projects/project-assignee-selector';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface ProjectAssigneeSelectorProps {
  value: string;
  onChange: (value: string, userIds?: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  multiple?: boolean;
}

export function ProjectAssigneeSelector(props: ProjectAssigneeSelectorProps) {
  // Set up a compatible data source for users if the imported component
  // expects users from an API endpoint but we're using Supabase directly
  useEffect(() => {
    // Register a temporary query client handler for the '/api/users' endpoint
    // that the imported component expects
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      // If this is a request to our specific API endpoint
      if (typeof input === 'string' && input.includes('/api/users')) {
        // Use Supabase instead
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, email, first_name, last_name, role')
            .is('deleted_at', null);
            
          if (error) throw error;
          
          // Convert to the expected format
          const adaptedData = data.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role
          }));
          
          // Return a mock response
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(adaptedData),
            text: () => Promise.resolve(JSON.stringify(adaptedData)),
            status: 200,
            statusText: 'OK',
            headers: new Headers()
          } as Response);
        } catch (err) {
          console.error('Error fetching users:', err);
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Error',
            json: () => Promise.resolve([]),
            text: () => Promise.resolve('[]'),
            headers: new Headers()
          } as Response);
        }
      }
      
      // Otherwise, proceed with the original fetch
      return originalFetch(input, init);
    };
    
    // Clean up
    return () => {
      window.fetch = originalFetch;
    };
  }, []);
  
  // Pass all props to the imported component
  return <ImportedProjectAssigneeSelector {...props} />;
}

export default ProjectAssigneeSelector;
