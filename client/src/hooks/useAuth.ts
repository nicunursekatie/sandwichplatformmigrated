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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch additional user data from the users table
  const { data: userData } = useQuery({
    queryKey: ['user-data', supabaseUser?.id],
    queryFn: async () => {
      if (!supabaseUser) return null;
      
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
    enabled: !!supabaseUser,
  });

  // Combine Supabase auth user with database user data
  const user: UserData | null = supabaseUser && userData ? {
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
    isLoading,
    isAuthenticated: !!session,
    error: null,
  };
}