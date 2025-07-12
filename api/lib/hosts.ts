import { supabase } from './supabase';
import type { Database } from './supabase';

type Host = Database['public']['Tables']['hosts']['Row'];
type InsertHost = Database['public']['Tables']['hosts']['Insert'];
type UpdateHost = Database['public']['Tables']['hosts']['Update'];

export const hostsApi = {
  // Get all hosts
  async getAllHosts(): Promise<Host[]> {
    const { data, error } = await supabase
      .from('hosts')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching hosts:', error);
      throw new Error(`Failed to fetch hosts: ${error.message}`);
    }
    
    return data || [];
  },

  // Get host by ID
  async getHost(id: number): Promise<Host | null> {
    const { data, error } = await supabase
      .from('hosts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching host:', error);
      return null;
    }
    
    return data;
  },

  // Create new host
  async createHost(host: InsertHost): Promise<Host> {
    const { data, error } = await supabase
      .from('hosts')
      .insert(host)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating host:', error);
      throw new Error(`Failed to create host: ${error.message}`);
    }
    
    return data;
  },

  // Update host
  async updateHost(id: number, updates: UpdateHost): Promise<Host | null> {
    const { data, error } = await supabase
      .from('hosts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating host:', error);
      return null;
    }
    
    return data;
  },

  // Delete host
  async deleteHost(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('hosts')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting host:', error);
      return false;
    }
    
    return true;
  },

  // Get active hosts only
  async getActiveHosts(): Promise<Host[]> {
    const { data, error } = await supabase
      .from('hosts')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching active hosts:', error);
      throw new Error(`Failed to fetch active hosts: ${error.message}`);
    }
    
    return data || [];
  }
}; 