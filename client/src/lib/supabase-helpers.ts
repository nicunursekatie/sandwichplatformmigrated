import { supabase } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';

// Error handling helper
export function handleSupabaseError(error: PostgrestError | null): never {
  if (error) {
    console.error('Supabase error:', error);
    throw new Error(error.message || 'Database operation failed');
  }
  throw new Error('Unknown error occurred');
}

// Generic query helpers
export async function fetchAll<T>(table: string, options?: {
  select?: string;
  filter?: Record<string, any>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}): Promise<T[]> {
  let query = supabase.from(table).select(options?.select || '*');

  // Apply filters
  if (options?.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    });
  }

  // Apply ordering
  if (options?.order) {
    query = query.order(options.order.column, { 
      ascending: options.order.ascending ?? true 
    });
  }

  // Apply limit
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchOne<T>(table: string, id: number | string, select?: string): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select(select || '*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
    handleSupabaseError(error);
  }
  return data;
}

export async function create<T>(table: string, data: any): Promise<T> {
  const { data: created, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();

  if (error) handleSupabaseError(error);
  return created;
}

export async function update<T>(table: string, id: number | string, updates: any): Promise<T> {
  const { data: updated, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleSupabaseError(error);
  return updated;
}

export async function remove(table: string, id: number | string): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (error) handleSupabaseError(error);
}

// Authentication helpers
export const auth = {
  async signUp(email: string, password: string, metadata?: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Realtime subscription helpers
export function subscribeToTable<T>(
  table: string,
  callback: (payload: any) => void,
  filter?: Record<string, any>
) {
  let channel = supabase
    .channel(`public:${table}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        filter: filter ? Object.entries(filter).map(([k, v]) => `${k}=eq.${v}`).join(',') : undefined
      },
      callback
    );

  return channel.subscribe();
}

// Specific query patterns for common operations

// Projects
export const projects = {
  async getAll() {
    return fetchAll('projects', {
      order: { column: 'created_at', ascending: false }
    });
  },

  async getById(id: number) {
    return fetchOne('projects', id);
  },

  async create(project: any) {
    return create('projects', project);
  },

  async update(id: number, updates: any) {
    return update('projects', id, updates);
  },

  async delete(id: number) {
    return remove('projects', id);
  },

  async getTasks(projectId: number) {
    return fetchAll('project_tasks', {
      filter: { project_id: projectId },
      order: { column: 'order', ascending: true }
    });
  },

  async createTask(projectId: number, task: any) {
    return create('project_tasks', { ...task, project_id: projectId });
  },

  async updateTask(projectId: number, taskId: number, updates: any) {
    return update('project_tasks', taskId, updates);
  },

  async deleteTask(projectId: number, taskId: number) {
    return remove('project_tasks', taskId);
  }
};

// Messages & Conversations
export const messaging = {
  async getConversations(userId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants!inner(user_id),
        messages(*)
      `)
      .eq('conversation_participants.user_id', userId)
      .order('created_at', { ascending: false });

    if (error) handleSupabaseError(error);
    return data;
  },

  async sendMessage(conversationId: number, userId: string, content: string, metadata?: any) {
    return create('messages', {
      conversation_id: conversationId,
      user_id: userId,
      sender_id: userId,
      content,
      context_type: metadata?.contextType,
      context_id: metadata?.contextId
    });
  },

  async markAsRead(messageIds: number[], userId: string) {
    const { error } = await supabase
      .from('message_recipients')
      .update({ read: true, read_at: new Date().toISOString() })
      .in('message_id', messageIds)
      .eq('recipient_id', userId);

    if (error) handleSupabaseError(error);
  },

  async getUnreadCounts(userId: string) {
    const { data, error } = await supabase
      .from('message_recipients')
      .select('message_id')
      .eq('recipient_id', userId)
      .eq('read', false);

    if (error) handleSupabaseError(error);
    return { count: data?.length || 0 };
  }
};

// Suggestions
export const suggestions = {
  async getAll() {
    return fetchAll('suggestions', {
      order: { column: 'created_at', ascending: false }
    });
  },

  async create(suggestion: any, userId: string) {
    return create('suggestions', {
      ...suggestion,
      submitted_by: userId
    });
  },

  async update(id: number, updates: any) {
    return update('suggestions', id, updates);
  },

  async delete(id: number) {
    return remove('suggestions', id);
  },

  async upvote(id: number) {
    const suggestion = await fetchOne<any>('suggestions', id);
    if (!suggestion) throw new Error('Suggestion not found');
    
    return update('suggestions', id, {
      upvotes: (suggestion.upvotes || 0) + 1
    });
  }
};

// Sandwich Collections
export const sandwichCollections = {
  async getAll(limit?: number) {
    return fetchAll('sandwich_collections', {
      order: { column: 'collection_date', ascending: false },
      limit
    });
  },

  async create(collection: any) {
    return create('sandwich_collections', collection);
  },

  async getStats() {
    const { data, error } = await supabase
      .from('sandwich_collections')
      .select('individual_sandwiches, group_collections');

    if (error) handleSupabaseError(error);

    // Calculate total sandwiches
    let totalSandwiches = 0;
    data?.forEach(collection => {
      totalSandwiches += collection.individual_sandwiches || 0;
      // Parse group collections if it's a JSON string
      if (collection.group_collections) {
        try {
          const groups = JSON.parse(collection.group_collections);
          groups.forEach((group: any) => {
            totalSandwiches += group.count || 0;
          });
        } catch (e) {
          console.error('Failed to parse group collections:', e);
        }
      }
    });

    return {
      totalCollections: data?.length || 0,
      totalSandwiches
    };
  }
};

// Meetings
export const meetings = {
  async getAll() {
    return fetchAll('meetings', {
      order: { column: 'date', ascending: false }
    });
  },

  async create(meeting: any) {
    return create('meetings', meeting);
  },

  async update(id: number, updates: any) {
    return update('meetings', id, updates);
  },

  async getMinutes() {
    return fetchAll('meeting_minutes', {
      order: { column: 'date', ascending: false }
    });
  },

  async uploadMinutes(formData: FormData) {
    // This will need to be handled differently - upload to Supabase Storage
    // For now, we'll just create a record
    const meetingId = formData.get('meetingId');
    const title = formData.get('title');
    const date = formData.get('date');
    const summary = formData.get('summary');
    
    return create('meeting_minutes', {
      meeting_id: meetingId,
      title,
      date,
      summary
    });
  }
};

// Work Logs
export const workLogs = {
  async getAll(userId?: string) {
    return fetchAll('work_logs', {
      filter: userId ? { user_id: userId } : undefined,
      order: { column: 'created_at', ascending: false }
    });
  },

  async create(log: any, userId: string) {
    return create('work_logs', {
      ...log,
      user_id: userId
    });
  },

  async delete(id: number) {
    return remove('work_logs', id);
  }
};

// Hosts, Drivers & Recipients
export const hosts = {
  async getAll() {
    return fetchAll('hosts', {
      filter: { status: 'active' }
    });
  },

  async getAllWithContacts() {
    const { data, error } = await supabase
      .from('hosts')
      .select(`
        *,
        host_contacts(*)
      `)
      .order('name');

    if (error) handleSupabaseError(error);
    return data;
  },

  async create(host: any) {
    return create('hosts', host);
  },

  async update(id: number, updates: any) {
    return update('hosts', id, updates);
  },

  async delete(id: number) {
    return remove('hosts', id);
  }
};

// Users
export const users = {
  async getAll() {
    return fetchAll('users', {
      filter: { is_active: true },
      order: { column: 'display_name' }
    });
  },

  async getById(id: string) {
    return fetchOne('users', id);
  },

  async update(id: string, updates: any) {
    return update('users', id, updates);
  }
};

// Notifications
export const notifications = {
  async create(notification: any) {
    return create('notifications', notification);
  },

  async markAsRead(notificationId: number) {
    return update('notifications', notificationId, { is_read: true });
  },

  async getUnread(userId: string) {
    return fetchAll('notifications', {
      filter: { user_id: userId, is_read: false },
      order: { column: 'created_at', ascending: false }
    });
  }
};