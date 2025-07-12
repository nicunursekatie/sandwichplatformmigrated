import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

// Create a Supabase client for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database types based on your schema
export type Database = {
  public: {
    Tables: {
      hosts: {
        Row: {
          id: number;
          name: string;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['hosts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['hosts']['Insert']>;
      };
      sandwich_collections: {
        Row: {
          id: number;
          host_name: string;
          collection_date: string | null;
          sandwich_count: number | null;
          group_collections: any | null;
          individual_sandwiches: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['sandwich_collections']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['sandwich_collections']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          email: string | null;
          password: string | null;
          first_name: string | null;
          last_name: string | null;
          display_name: string | null;
          profile_image_url: string | null;
          role: string;
          permissions: any;
          metadata: any;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      projects: {
        Row: {
          id: number;
          title: string;
          description: string | null;
          progress: number;
          status: string;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      messages: {
        Row: {
          id: number;
          conversation_id: string;
          sender_id: string;
          content: string;
          metadata: any;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
    };
  };
}; 