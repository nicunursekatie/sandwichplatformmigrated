import { useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  role: string;
  permissions: string[];
  isActive: boolean;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use a ref to track if we've completed the initial auth check
  // This prevents the user object from changing during the component lifecycle
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      setIsLoading(false);
      hasInitialized.current = true;
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      setIsLoading(false);
      hasInitialized.current = true;
    });

    return () => subscription.unsubscribe();
  }, []);

  // Always call useQuery, but with a stable query key
  const { data: userData, isLoading: userDataLoading } = useQuery({
    queryKey: ['user-data', supabaseUser?.email || 'no-user'],
    queryFn: async () => {
      if (!supabaseUser?.email) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', supabaseUser.email)
        .single();
      
      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!supabaseUser?.email,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Combine Supabase auth user with database user data
  // Only return user data when we have BOTH supabaseUser AND userData AND we've initialized
  const user: UserData | null = (hasInitialized.current && supabaseUser && userData) ? {
    id: supabaseUser.id,
    email: supabaseUser.email!,
    firstName: userData.first_name || supabaseUser.user_metadata.first_name || '',
    lastName: userData.last_name || supabaseUser.user_metadata.last_name || '',
    displayName: userData.display_name || supabaseUser.user_metadata.display_name,
    role: userData.role || supabaseUser.user_metadata.role || 'viewer',
    permissions: userData.permissions || [],
    isActive: userData.is_active ?? true,
  } : null;

  return {
    user,
    session,
    isLoading: isLoading || userDataLoading,
    isAuthenticated: !!session,
    error: null,
  };
}