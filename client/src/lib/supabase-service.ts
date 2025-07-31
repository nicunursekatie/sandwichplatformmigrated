import { supabase } from './supabase';
import type {
  User, InsertUser, UpdateUser,
  Project, InsertProject, UpdateProject,
  Message, InsertMessage, UpdateMessage,
  Host, InsertHost, UpdateHost,
  SandwichCollection, InsertSandwichCollection, UpdateSandwichCollection,
  Suggestion, InsertSuggestion, UpdateSuggestion,
  WorkLog, InsertWorkLog, UpdateWorkLog,
  Conversation, InsertConversation, UpdateConversation,
  Recipient, InsertRecipient, UpdateRecipient,
  Meeting, InsertMeeting, UpdateMeeting,
  WeeklyReport, InsertWeeklyReport, UpdateWeeklyReport,
  DriveLink, InsertDriveLink, UpdateDriveLink
} from './supabase';

// Generic error handler
const handleError = (error: any, operation: string) => {
  console.error(`Supabase ${operation} error:`, error);
  throw new Error(error.message || `Failed to ${operation}`);
};

// User Services
export const userService = {
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) handleError(error, 'get current user');
    return data;
  },

  async updateProfile(userId: string, updates: UpdateUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) handleError(error, 'update profile');
    return data;
  },

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) handleError(error, 'get all users');
    return data || [];
  }
};

// Project Services
export const projectService = {
  async getAllProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) handleError(error, 'get all projects');
    return data || [];
  },

  async getProject(id: number): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) handleError(error, 'get project');
    return data;
  },

  async createProject(project: InsertProject): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
    
    if (error) handleError(error, 'create project');
    return data;
  },

  async updateProject(id: number, updates: UpdateProject): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'update project');
    return data;
  },

  async deleteProject(id: number): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete project');
  }
};

// Sandwich Collection Services
export const sandwichCollectionService = {
  async getAllCollections(limit?: number): Promise<SandwichCollection[]> {
    let query = supabase
      .from('sandwich_collections')
      .select('*')
      .order('collection_date', { ascending: false });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) handleError(error, 'get all collections');
    return data || [];
  },

  async getCollectionsByHost(hostName: string): Promise<SandwichCollection[]> {
    const { data, error } = await supabase
      .from('sandwich_collections')
      .select('*')
      .eq('host_name', hostName)
      .order('collection_date', { ascending: false });
    
    if (error) handleError(error, 'get collections by host');
    return data || [];
  },

  async createCollection(collection: InsertSandwichCollection): Promise<SandwichCollection> {
    const { data, error } = await supabase
      .from('sandwich_collections')
      .insert(collection)
      .select()
      .single();
    
    if (error) handleError(error, 'create collection');
    return data;
  },

  async updateCollection(id: number, updates: UpdateSandwichCollection): Promise<SandwichCollection> {
    const { data, error } = await supabase
      .from('sandwich_collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'update collection');
    return data;
  },

  async deleteCollection(id: number): Promise<void> {
    const { error } = await supabase
      .from('sandwich_collections')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete collection');
  },

  async getCollectionStats() {
    const { data, error } = await supabase.rpc('get_collection_stats');
    if (error) handleError(error, 'get collection stats');
    return data;
  },

  async getFilteredCollectionStats(filters: {
    host_name?: string;
    collection_date_from?: string;
    collection_date_to?: string;
    individual_min?: number;
    individual_max?: number;
  }) {
    console.log('🔍 Filtering with params:', filters);
    
    // Validate and fix date formats
    let collection_date_from = filters.collection_date_from;
    let collection_date_to = filters.collection_date_to;
    
    if (collection_date_from) {
      console.log('🔍 Raw collection_date_from:', collection_date_from, typeof collection_date_from);
      
      // Check if it's already in YYYY-MM-DD format and valid
      if (collection_date_from.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Additional check to ensure it's not a malformed date like "0002-09-15"
        const year = parseInt(collection_date_from.split('-')[0]);
        if (year >= 1900 && year <= 2100) {
          console.log('📅 Collection date from already in correct format:', collection_date_from);
        } else {
          console.warn('Invalid year in collection_date_from:', collection_date_from);
          collection_date_from = undefined;
        }
      } else {
        // Try to parse the date more carefully
        const dateStr = String(collection_date_from).trim();
        
        // Handle common date formats
        let parsedDate: Date | null = null;
        if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          // MM/DD/YYYY or M/D/YYYY format
          const [month, day, year] = dateStr.split('/');
          parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
          // YYYY-MM-DD or similar
          parsedDate = new Date(dateStr);
        } else {
          // Try standard parsing as last resort
          parsedDate = new Date(dateStr);
        }
        
        if (parsedDate && !isNaN(parsedDate.getTime()) && parsedDate.getFullYear() >= 1900) {
          collection_date_from = parsedDate.toISOString().split('T')[0];
          console.log('📅 Converted collection date from:', dateStr, '->', collection_date_from);
        } else {
          console.warn('Failed to parse collection_date_from:', dateStr);
          collection_date_from = undefined;
        }
      }
    }
    
    if (collection_date_to) {
      console.log('🔍 Raw collection_date_to:', collection_date_to, typeof collection_date_to);
      
      // Check if it's already in YYYY-MM-DD format and valid
      if (collection_date_to.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Additional check to ensure it's not a malformed date like "0002-09-15"
        const year = parseInt(collection_date_to.split('-')[0]);
        if (year >= 1900 && year <= 2100) {
          console.log('📅 Collection date to already in correct format:', collection_date_to);
        } else {
          console.warn('Invalid year in collection_date_to:', collection_date_to);
          collection_date_to = undefined;
        }
      } else {
        // Try to parse the date more carefully
        const dateStr = String(collection_date_to).trim();
        
        // Handle common date formats
        let parsedDate: Date | null = null;
        if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          // MM/DD/YYYY or M/D/YYYY format
          const [month, day, year] = dateStr.split('/');
          parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
          // YYYY-MM-DD or similar
          parsedDate = new Date(dateStr);
        } else {
          // Try standard parsing as last resort
          parsedDate = new Date(dateStr);
        }
        
        if (parsedDate && !isNaN(parsedDate.getTime()) && parsedDate.getFullYear() >= 1900) {
          collection_date_to = parsedDate.toISOString().split('T')[0];
          console.log('📅 Converted collection date to:', dateStr, '->', collection_date_to);
        } else {
          console.warn('Failed to parse collection_date_to:', dateStr);
          collection_date_to = undefined;
        }
      }
    }

    // Use direct database queries to calculate stats (skip RPC entirely)
    console.log('🔄 Using direct query for filtering (RPC functions not available)');
    
    try {
      let query = supabase.from('sandwich_collections').select('*');
      
      // Apply filters
      if (filters.host_name && filters.host_name.trim() !== '') {
        query = query.ilike('host_name', `%${filters.host_name.trim()}%`);
        console.log('🏠 Added host name filter:', filters.host_name.trim());
      }
      
      if (collection_date_from && collection_date_from.match(/^\d{4}-\d{2}-\d{2}$/)) {
        query = query.gte('collection_date', collection_date_from);
        console.log('📅 Added collection date from filter:', collection_date_from);
      }
      
      if (collection_date_to && collection_date_to.match(/^\d{4}-\d{2}-\d{2}$/)) {
        query = query.lte('collection_date', collection_date_to);
        console.log('📅 Added collection date to filter:', collection_date_to);
      }
      
      if (filters.individual_min !== undefined && filters.individual_min !== null) {
        query = query.gte('individual_sandwiches', filters.individual_min);
        console.log('📊 Added individual min filter:', filters.individual_min);
      }
      
      if (filters.individual_max !== undefined && filters.individual_max !== null) {
        query = query.lte('individual_sandwiches', filters.individual_max);
        console.log('📊 Added individual max filter:', filters.individual_max);
      }
      
      const { data: collections, error: queryError } = await query;
      
      if (queryError) {
        console.error('❌ Direct query error:', queryError);
        handleError(queryError, 'get filtered collection stats');
      }
      
      // Calculate stats from filtered collections
      let individualTotal = 0;
      let groupTotal = 0;
      
      collections?.forEach((collection) => {
        individualTotal += collection.individual_sandwiches || 0;
        
        // Calculate group collections total
        try {
          if (collection.group_collections && collection.group_collections !== "[]" && collection.group_collections !== "") {
            const groupData = JSON.parse(collection.group_collections);
            if (Array.isArray(groupData)) {
              groupTotal += groupData.reduce((sum: number, group: any) => 
                sum + (Number(group.sandwichCount) || Number(group.sandwich_count) || Number(group.count) || 0), 0
              );
            }
          }
        } catch (e) {
          // Handle text format like "Marketing Team: 8, Development: 6"
          if (collection.group_collections && collection.group_collections !== "[]") {
            const matches = collection.group_collections.match(/(\d+)/g);
            if (matches) {
              groupTotal += matches.reduce((sum: number, num: string) => sum + parseInt(num), 0);
            }
          }
        }
      });
      
      const result = [{
        complete_total_sandwiches: individualTotal + groupTotal,
        individual_sandwiches: individualTotal,
        group_sandwiches: groupTotal
      }];
      
      console.log('✅ Direct query filtered results:', { count: result.length, data: result });
      return result;
      
    } catch (error) {
      console.error('❌ Error in getFilteredCollectionStats:', error);
      handleError(error, 'get filtered collection stats');
      return [];
    }
  },

  async batchUpdateCollections(ids: number[], updates: UpdateSandwichCollection): Promise<{ updatedCount: number }> {
    const { data, error } = await supabase
      .from('sandwich_collections')
      .update(updates)
      .in('id', ids)
      .select('id');
    
    if (error) handleError(error, 'batch update collections');
    return { updatedCount: data?.length || 0 };
  },

  async batchDeleteCollections(ids: number[]): Promise<{ deletedCount: number }> {
    const { data, error } = await supabase
      .from('sandwich_collections')
      .delete()
      .in('id', ids)
      .select('id');
    
    if (error) handleError(error, 'batch delete collections');
    return { deletedCount: data?.length || 0 };
  }
};

// Host Services
export const hostService = {
  async getAllHosts(): Promise<Host[]> {
    const { data, error } = await supabase
      .from('hosts')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) handleError(error, 'get all hosts');
    return data || [];
  },

  async getActiveHosts(): Promise<Host[]> {
    const { data, error } = await supabase
      .from('hosts')
      .select('*')
      .eq('status', 'active')
      .order('name', { ascending: true });
    
    if (error) handleError(error, 'get active hosts');
    return data || [];
  },

  async getHost(id: number): Promise<Host | null> {
    const { data, error } = await supabase
      .from('hosts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) handleError(error, 'get host');
    return data;
  },

  async createHost(host: InsertHost): Promise<Host> {
    const { data, error } = await supabase
      .from('hosts')
      .insert(host)
      .select()
      .single();
    
    if (error) handleError(error, 'create host');
    return data;
  },

  async updateHost(id: number, updates: UpdateHost): Promise<Host> {
    const { data, error } = await supabase
      .from('hosts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'update host');
    return data;
  },

  async deleteHost(id: number): Promise<void> {
    const { error } = await supabase
      .from('hosts')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete host');
  }
};

// Message Services
export const messageService = {
  async getAllMessages(chatType?: string): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (chatType) {
      query = query.eq('conversation_id', chatType);
    }
    
    const { data, error } = await query;
    if (error) handleError(error, 'get all messages');
    return data || [];
  },

  async createMessage(message: InsertMessage): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();
    
    if (error) handleError(error, 'create message');
    return data;
  },

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) handleError(error, 'get messages by conversation');
    return data || [];
  }
};

// Suggestion Services
export const suggestionService = {
  async getAllSuggestions(): Promise<Suggestion[]> {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) handleError(error, 'get all suggestions');
    return data || [];
  },

  async createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion> {
    const { data, error } = await supabase
      .from('suggestions')
      .insert(suggestion)
      .select()
      .single();
    
    if (error) handleError(error, 'create suggestion');
    return data;
  },

  async updateSuggestion(id: number, updates: UpdateSuggestion): Promise<Suggestion> {
    const { data, error } = await supabase
      .from('suggestions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'update suggestion');
    return data;
  },

  async deleteSuggestion(id: number): Promise<void> {
    const { error } = await supabase
      .from('suggestions')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete suggestion');
  },

  async upvoteSuggestion(id: number): Promise<Suggestion> {
    const { data, error } = await supabase
      .from('suggestions')
      .update({ upvotes: supabase.rpc('increment') })
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'upvote suggestion');
    return data;
  }
};

// Work Log Services
export const workLogService = {
  async getAllWorkLogs(): Promise<WorkLog[]> {
    const { data, error } = await supabase
      .from('work_logs')
      .select(`
        *,
        user:users!work_logs_user_id_fkey(
          id,
          email,
          first_name,
          last_name,
          role
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) handleError(error, 'get all work logs');
    return data || [];
  },

  async createWorkLog(workLog: InsertWorkLog): Promise<WorkLog> {
    const { data, error } = await supabase
      .from('work_logs')
      .insert(workLog)
      .select()
      .single();
    
    if (error) handleError(error, 'create work log');
    return data;
  },

  async updateWorkLog(id: number, updates: UpdateWorkLog): Promise<WorkLog> {
    const { data, error } = await supabase
      .from('work_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'update work log');
    return data;
  },

  async deleteWorkLog(id: number): Promise<void> {
    const { error } = await supabase
      .from('work_logs')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete work log');
  }
};

// Conversation Services
export const conversationService = {
  async getAllConversations(): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) handleError(error, 'get all conversations');
    return data || [];
  },

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .insert(conversation)
      .select()
      .single();
    
    if (error) handleError(error, 'create conversation');
    return data;
  }
};

// Recipient Services
export const recipientService = {
  async getAllRecipients(): Promise<Recipient[]> {
    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) handleError(error, 'get all recipients');
    return data || [];
  },

  async createRecipient(recipient: InsertRecipient): Promise<Recipient> {
    const { data, error } = await supabase
      .from('recipients')
      .insert(recipient)
      .select()
      .single();
    
    if (error) handleError(error, 'create recipient');
    return data;
  }
};

// Meeting Services
export const meetingService = {
  async getAllMeetings(): Promise<Meeting[]> {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) handleError(error, 'get all meetings');
    return data || [];
  },

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const { data, error } = await supabase
      .from('meetings')
      .insert(meeting)
      .select()
      .single();
    
    if (error) handleError(error, 'create meeting');
    return data;
  }
};

// Weekly Report Services
export const weeklyReportService = {
  async getAllWeeklyReports(): Promise<WeeklyReport[]> {
    const { data, error } = await supabase
      .from('weekly_reports')
      .select('*')
      .order('week_start', { ascending: false });
    
    if (error) handleError(error, 'get all weekly reports');
    return data || [];
  },

  async createWeeklyReport(report: InsertWeeklyReport): Promise<WeeklyReport> {
    const { data, error } = await supabase
      .from('weekly_reports')
      .insert(report)
      .select()
      .single();
    
    if (error) handleError(error, 'create weekly report');
    return data;
  }
};

// Drive Link Services
export const driveLinkService = {
  async getAllDriveLinks(): Promise<DriveLink[]> {
    const { data, error } = await supabase
      .from('drive_links')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) handleError(error, 'get all drive links');
    return data || [];
  },

  async createDriveLink(link: InsertDriveLink): Promise<DriveLink> {
    const { data, error } = await supabase
      .from('drive_links')
      .insert(link)
      .select()
      .single();
    
    if (error) handleError(error, 'create drive link');
    return data;
  }
};

// Export all services
export const supabaseService = {
  user: userService,
  project: projectService,
  sandwichCollection: sandwichCollectionService,
  host: hostService,
  message: messageService,
  suggestion: suggestionService,
  workLog: workLogService,
  conversation: conversationService,
  recipient: recipientService,
  meeting: meetingService,
  weeklyReport: weeklyReportService,
  driveLink: driveLinkService
}