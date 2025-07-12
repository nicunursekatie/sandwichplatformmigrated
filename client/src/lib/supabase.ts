import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Database types (we'll generate these from your schema later)
export type Database = {
  public: {
    Tables: {
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
      collections: {
        Row: {
          id: number;
          reporter_name: string | null;
          reporting_phone: string | null;
          collection_date: string | null;
          collection_site: string | null;
          recipient: string | null;
          number_of_sandwiches: number | null;
          volunter_hours: number | null;
          number_of_volunteers: number | null;
          value_of_donation: number | null;
          donated_by: string | null;
          username: string | null;
          location: string | null;
          email: string | null;
          mileage: number | null;
          coordinator: string | null;
          details: string | null;
          created_at: string | null;
          imported_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['collections']['Row'], 'id' | 'created_at' | 'imported_at'>;
        Update: Partial<Database['public']['Tables']['collections']['Insert']>;
      };
    };
  };
};