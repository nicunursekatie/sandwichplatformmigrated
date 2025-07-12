import { supabase } from './supabase';
import type { Database } from './supabase';

type SandwichCollection = Database['public']['Tables']['sandwich_collections']['Row'];
type InsertSandwichCollection = Database['public']['Tables']['sandwich_collections']['Insert'];
type UpdateSandwichCollection = Database['public']['Tables']['sandwich_collections']['Update'];

export const collectionsApi = {
  // Get all collections
  async getAllCollections(): Promise<SandwichCollection[]> {
    const { data, error } = await supabase
      .from('sandwich_collections')
      .select('*')
      .order('collection_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching collections:', error);
      throw new Error(`Failed to fetch collections: ${error.message}`);
    }
    
    return data || [];
  },

  // Get collections with pagination
  async getCollections(limit: number = 50, offset: number = 0): Promise<SandwichCollection[]> {
    const { data, error } = await supabase
      .from('sandwich_collections')
      .select('*')
      .order('collection_date', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching collections:', error);
      throw new Error(`Failed to fetch collections: ${error.message}`);
    }
    
    return data || [];
  },

  // Get collection by ID
  async getCollection(id: number): Promise<SandwichCollection | null> {
    const { data, error } = await supabase
      .from('sandwich_collections')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching collection:', error);
      return null;
    }
    
    return data;
  },

  // Create new collection
  async createCollection(collection: InsertSandwichCollection): Promise<SandwichCollection> {
    const { data, error } = await supabase
      .from('sandwich_collections')
      .insert(collection)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating collection:', error);
      throw new Error(`Failed to create collection: ${error.message}`);
    }
    
    return data;
  },

  // Update collection
  async updateCollection(id: number, updates: UpdateSandwichCollection): Promise<SandwichCollection | null> {
    const { data, error } = await supabase
      .from('sandwich_collections')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating collection:', error);
      return null;
    }
    
    return data;
  },

  // Delete collection
  async deleteCollection(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('sandwich_collections')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting collection:', error);
      return false;
    }
    
    return true;
  },

  // Get collections by host
  async getCollectionsByHost(hostName: string): Promise<SandwichCollection[]> {
    const { data, error } = await supabase
      .from('sandwich_collections')
      .select('*')
      .eq('host_name', hostName)
      .order('collection_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching collections by host:', error);
      throw new Error(`Failed to fetch collections by host: ${error.message}`);
    }
    
    return data || [];
  },

  // Get collection statistics
  async getCollectionStats(): Promise<{ totalEntries: number; totalSandwiches: number }> {
    const { data, error } = await supabase
      .from('sandwich_collections')
      .select('sandwich_count');
    
    if (error) {
      console.error('Error fetching collection stats:', error);
      throw new Error(`Failed to fetch collection stats: ${error.message}`);
    }
    
    const totalEntries = data?.length || 0;
    const totalSandwiches = data?.reduce((sum, item) => sum + (item.sandwich_count || 0), 0) || 0;
    
    return { totalEntries, totalSandwiches };
  },

  // Get collections count
  async getCollectionsCount(): Promise<number> {
    const { count, error } = await supabase
      .from('sandwich_collections')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error fetching collections count:', error);
      throw new Error(`Failed to fetch collections count: ${error.message}`);
    }
    
    return count || 0;
  }
}; 