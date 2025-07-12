import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Database types based on your actual Supabase schema
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
      sandwich_collections: {
        Row: {
          id: number;
          collection_date: string;
          host_name: string;
          individual_sandwiches: number;
          group_collections: string;
          submitted_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sandwich_collections']['Row'], 'id' | 'submitted_at'>;
        Update: Partial<Database['public']['Tables']['sandwich_collections']['Insert']>;
      };
      suggestions: {
        Row: {
          id: number;
          title: string;
          description: string;
          category: string;
          priority: string;
          status: string;
          submitted_by: string;
          upvotes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['suggestions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['suggestions']['Insert']>;
      };
      work_logs: {
        Row: {
          id: number;
          user_id: string;
          description: string;
          hours: number;
          minutes: number;
          date: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['work_logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['work_logs']['Insert']>;
      };
      conversations: {
        Row: {
          id: number;
          type: string;
          title: string;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      recipients: {
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
        Insert: Omit<Database['public']['Tables']['recipients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['recipients']['Insert']>;
      };
      meetings: {
        Row: {
          id: number;
          title: string;
          description: string | null;
          date: string;
          time: string;
          location: string | null;
          attendees: string[];
          agenda: string | null;
          minutes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['meetings']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['meetings']['Insert']>;
      };
      weekly_reports: {
        Row: {
          id: number;
          week_start: string;
          week_end: string;
          sandwich_count: number;
          volunteer_hours: number;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['weekly_reports']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['weekly_reports']['Insert']>;
      };
      drive_links: {
        Row: {
          id: number;
          title: string;
          url: string;
          description: string | null;
          category: string;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['drive_links']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['drive_links']['Insert']>;
      };
    };
  };
};

// Type exports for use throughout the application
export type User = Database['public']['Tables']['users']['Row'];
export type InsertUser = Database['public']['Tables']['users']['Insert'];
export type UpdateUser = Database['public']['Tables']['users']['Update'];

export type Project = Database['public']['Tables']['projects']['Row'];
export type InsertProject = Database['public']['Tables']['projects']['Insert'];
export type UpdateProject = Database['public']['Tables']['projects']['Update'];

export type Message = Database['public']['Tables']['messages']['Row'];
export type InsertMessage = Database['public']['Tables']['messages']['Insert'];
export type UpdateMessage = Database['public']['Tables']['messages']['Update'];

export type Host = Database['public']['Tables']['hosts']['Row'];
export type InsertHost = Database['public']['Tables']['hosts']['Insert'];
export type UpdateHost = Database['public']['Tables']['hosts']['Update'];

export type SandwichCollection = Database['public']['Tables']['sandwich_collections']['Row'];
export type InsertSandwichCollection = Database['public']['Tables']['sandwich_collections']['Insert'];
export type UpdateSandwichCollection = Database['public']['Tables']['sandwich_collections']['Update'];

export type Suggestion = Database['public']['Tables']['suggestions']['Row'];
export type InsertSuggestion = Database['public']['Tables']['suggestions']['Insert'];
export type UpdateSuggestion = Database['public']['Tables']['suggestions']['Update'];

export type WorkLog = Database['public']['Tables']['work_logs']['Row'];
export type InsertWorkLog = Database['public']['Tables']['work_logs']['Insert'];
export type UpdateWorkLog = Database['public']['Tables']['work_logs']['Update'];

export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type InsertConversation = Database['public']['Tables']['conversations']['Insert'];
export type UpdateConversation = Database['public']['Tables']['conversations']['Update'];

export type Recipient = Database['public']['Tables']['recipients']['Row'];
export type InsertRecipient = Database['public']['Tables']['recipients']['Insert'];
export type UpdateRecipient = Database['public']['Tables']['recipients']['Update'];

export type Meeting = Database['public']['Tables']['meetings']['Row'];
export type InsertMeeting = Database['public']['Tables']['meetings']['Insert'];
export type UpdateMeeting = Database['public']['Tables']['meetings']['Update'];

export type WeeklyReport = Database['public']['Tables']['weekly_reports']['Row'];
export type InsertWeeklyReport = Database['public']['Tables']['weekly_reports']['Insert'];
export type UpdateWeeklyReport = Database['public']['Tables']['weekly_reports']['Update'];

export type DriveLink = Database['public']['Tables']['drive_links']['Row'];
export type InsertDriveLink = Database['public']['Tables']['drive_links']['Insert'];
export type UpdateDriveLink = Database['public']['Tables']['drive_links']['Update'];