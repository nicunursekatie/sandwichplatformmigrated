import { useEffect, useState } from 'react';
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
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Get initial session
    console.log('useAuth: Initializing auth and fetching session');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('useAuth: Session fetch complete', session ? 'Session exists' : 'No session');
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      setIsLoading(false);
      setHasInitialized(true);
    }).catch(error => {
      console.error('useAuth: Error fetching session:', error);
      setIsLoading(false);
      setHasInitialized(true);
    });

    // Listen for auth changes
    console.log('useAuth: Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('useAuth: Auth state changed:', _event, session ? 'Session exists' : 'No session');
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      setIsLoading(false);
      setHasInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Always call useQuery, but with a stable query key
  const { data: userData, isLoading: userDataLoading, error: userDataError } = useQuery({
    queryKey: ['user-data', supabaseUser?.id || 'no-user'],
    queryFn: async () => {
      if (!supabaseUser?.id) {
        console.log("useAuth: No Supabase user ID available for user data query");
        return null;
      }
      
      console.log("useAuth: Fetching user data for Supabase user ID:", supabaseUser.id);
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();
        
        if (error) {
          console.error('useAuth: Error fetching user data:', error);
          // Handle specific error cases
          if (error.code === 'PGRST116') {
            console.log('useAuth: User not found in database - might need to create user record');
            return null;
          }
          throw error;
        }
        
        console.log("useAuth: Fetched user data from database:", data);
        return data;
      } catch (err) {
        console.error('useAuth: Exception in user data query:', err);
        throw err;
      }
    },
    enabled: !!supabaseUser?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1, // Only retry once to avoid infinite loops
  });

  // Combine Supabase auth user with database user data
  // Only return user data when we have BOTH supabaseUser AND userData AND we've initialized
  const user: UserData | null = (hasInitialized && supabaseUser && userData) ? {
    id: supabaseUser.id,
    email: supabaseUser.email!,
    firstName: userData.first_name || supabaseUser.user_metadata.first_name || '',
    lastName: userData.last_name || supabaseUser.user_metadata.last_name || '',
    displayName: userData.display_name || supabaseUser.user_metadata.display_name,
    role: userData.role || supabaseUser.user_metadata.role || 'viewer',
    permissions: userData.permissions || [],
    isActive: userData.is_active ?? true,
  } : null;

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Debug the current state
  console.log('useAuth: Current state:', { 
    hasInitialized, 
    isLoading, 
    userDataLoading, 
    sessionExists: !!session,
    userIdExists: !!supabaseUser?.id,
    userDataExists: !!userData,
    userDataError
  });

  return {
    user,
    session,
    isLoading: isLoading || userDataLoading || !hasInitialized,
    isAuthenticated: !!session,
    error: userDataError,
    signOut,
  };
}