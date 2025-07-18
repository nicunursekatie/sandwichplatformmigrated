import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface UnreadCounts {
  general: number;
  committee: number;
  hosts: number;
  drivers: number;
  recipients: number;
  core_team: number;
  direct: number;
  groups: number;
  total: number;
}

interface Message {
  id: number;
  conversation_id: number | null;
  user_id: string;
  content: string;
  message_type: 'chat' | 'direct' | 'group';
  reply_to_id?: number;
  recipient_id?: string;
  subject?: string;
  priority: 'low' | 'normal' | 'high';
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  is_read?: boolean;
}

interface SendMessageParams {
  content: string;
  conversation_id?: number;
  message_type?: 'chat' | 'direct' | 'group';
  recipient_id?: string;
  subject?: string;
  priority?: 'low' | 'normal' | 'high';
  reply_to_id?: number;
}

export function useMessaging() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);


  // Set up realtime subscriptions
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up realtime messaging connection...');

    const channel = supabase
      .channel('messaging-updates')
      .subscribe((status) => {
        console.log('Realtime connection status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('Cleaning up realtime connection');
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [user?.id, queryClient, toast]);

  // Add polling as backup
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [user?.id, queryClient]);

  // Get unread message counts
  const { data: unreadCounts = {
    general: 0,
    committee: 0,
    hosts: 0,
    drivers: 0,
    recipients: 0,
    core_team: 0,
    direct: 0,
    groups: 0,
    total: 0,
  } as UnreadCounts, refetch: refetchUnreadCounts } = useQuery({
    queryKey: ['unread-counts', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        // Get all messages and read messages separately
        const [messagesResult, readsResult] = await Promise.all([
          // Get all messages for this user
          supabase
            .from('messages')
            .select(`
              id,
              conversation_id,
              message_type,
              recipient_id,
              conversations(name, type)
            `)
            .or(`recipient_id.eq.${user.id},conversation_id.in.(SELECT conversation_id FROM conversation_participants WHERE user_id = '${user.id}')`),
          
          // Get read message IDs
          supabase
            .from('message_reads')
            .select('message_id')
            .eq('user_id', user.id)
        ]);

        if (messagesResult.error || readsResult.error) {
          console.error('Error fetching unread counts:', messagesResult.error || readsResult.error);
          return {
            general: 0,
            committee: 0,
            hosts: 0,
            drivers: 0,
            recipients: 0,
            core_team: 0,
            direct: 0,
            groups: 0,
            total: 0,
          };
        }

        const messages = messagesResult.data || [];
        const readMessageIds = new Set((readsResult.data || []).map(r => r.message_id));

        // Filter unread messages
        const unreadMessages = messages.filter(msg => !readMessageIds.has(msg.id));

        // Calculate counts
        const counts = {
          general: 0,
          committee: 0,
          hosts: 0,
          drivers: 0,
          recipients: 0,
          core_team: 0,
          direct: 0,
          groups: 0,
          total: 0,
        };

        unreadMessages.forEach((msg: any) => {
          if (msg.message_type === 'direct' && msg.recipient_id === user.id) {
            counts.direct++;
          } else if (msg.conversations?.type === 'channel') {
            const channelName = msg.conversations.name;
            if (channelName && counts.hasOwnProperty(channelName)) {
              counts[channelName as keyof typeof counts]++;
            }
          }
        });

        counts.total = Object.values(counts).reduce((sum, count) => sum + count, 0);
        return counts;
      } catch (error) {
        console.error('Error calculating unread counts:', error);
        return {
          general: 0,
          committee: 0,
          hosts: 0,
          drivers: 0,
          recipients: 0,
          core_team: 0,
          direct: 0,
          groups: 0,
          total: 0,
        };
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get unread messages for notifications
  const { data: unreadMessages = [], refetch: refetchUnreadMessages } = useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        // Get messages and read status separately
        const [messagesResult, readsResult] = await Promise.all([
          supabase
            .from('messages')
            .select(`
              *,
              conversations(name, type)
            `)
            .or(`recipient_id.eq.${user.id},conversation_id.in.(SELECT conversation_id FROM conversation_participants WHERE user_id = '${user.id}')`)
            .neq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100),
          
          supabase
            .from('message_reads')
            .select('message_id')
            .eq('user_id', user.id)
        ]);

        if (messagesResult.error || readsResult.error) {
          console.error('Error fetching unread messages:', messagesResult.error || readsResult.error);
          return [];
        }

        const messages = messagesResult.data || [];
        const readMessageIds = new Set((readsResult.data || []).map(r => r.message_id));

        // Filter unread messages and get sender info
        const unreadMessages = messages.filter(msg => !readMessageIds.has(msg.id)).slice(0, 50);
        
        // Fetch sender information for unread messages
        if (unreadMessages.length > 0) {
          const senderIds = [...new Set(unreadMessages.map(msg => msg.user_id))];
          const { data: senders } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', senderIds);
          
          const senderMap = new Map(senders?.map(s => [s.id, s]) || []);
          
          // Add sender info to messages
          unreadMessages.forEach(msg => {
            msg.sender = senderMap.get(msg.user_id) || null;
          });
        }
        
        return unreadMessages;
      } catch (error) {
        console.error('Error fetching unread messages:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (params: SendMessageParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      const messageData = {
        user_id: user.id,
        content: params.content,
        conversation_id: params.conversation_id,
        message_type: params.message_type || 'chat',
        recipient_id: params.recipient_id,
        subject: params.subject,
        priority: params.priority || 'normal',
        reply_to_id: params.reply_to_id,
        status: 'sent'
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:users!user_id(id, first_name, last_name, email)
        `)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-messages'] });
      toast({ description: 'Message sent successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send message',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('message_reads')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          read_at: new Date().toISOString()
        }, { onConflict: 'message_id,user_id' });
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      refetchUnreadCounts();
      refetchUnreadMessages();
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  // Mark all messages as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async (conversationId?: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Get all unread message IDs for this conversation or user
      let query = supabase
        .from('messages')
        .select('id');
        
      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else {
        query = query.or(`recipient_id.eq.${user.id},conversation_id.in.(
          SELECT conversation_id 
          FROM conversation_participants 
          WHERE user_id = '${user.id}'
        )`);
      }
      
      const { data: messages } = await query
        .not('id', 'in', `(
          SELECT message_id 
          FROM message_reads 
          WHERE user_id = '${user.id}'
        )`);
      
      if (!messages || messages.length === 0) return { success: true };
      
      // Mark all as read
      const readRecords = messages.map(msg => ({
        message_id: msg.id,
        user_id: user.id,
        read_at: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('message_reads')
        .upsert(readRecords, { onConflict: 'message_id,user_id' });
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      refetchUnreadCounts();
      refetchUnreadMessages();
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast({ description: 'All messages marked as read' });
    },
  });

  // Send a message
  const sendMessage = useCallback(async (params: SendMessageParams) => {
    return await sendMessageMutation.mutateAsync(params);
  }, [sendMessageMutation]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: number) => {
    return await markAsReadMutation.mutateAsync(messageId);
  }, [markAsReadMutation]);

  // Mark all messages as read
  const markAllAsRead = useCallback(async (conversationId?: number) => {
    return await markAllAsReadMutation.mutateAsync(conversationId);
  }, [markAllAsReadMutation]);

  // Get messages for a specific chat channel
  const getChatMessages = useCallback(async (channelName: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!user_id(id, first_name, last_name, email),
          conversation:conversations!conversation_id(id, name, type)
        `)
        .eq('conversations.name', channelName)
        .eq('conversations.type', 'channel')
        .eq('message_type', 'chat')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Failed to fetch ${channelName} messages:`, error);
      return [];
    }
  }, []);

  // Get inbox messages (direct and group)
  const getInboxMessages = useCallback(async () => {
    if (!user?.id) return [];
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!user_id(id, first_name, last_name, email),
          recipient:users!recipient_id(id, first_name, last_name, email),
          conversation:conversations!conversation_id(id, name, type),
          is_read:message_reads!inner(read_at)
        `)
        .in('message_type', ['direct', 'group'])
        .or(`recipient_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch inbox messages:', error);
      return [];
    }
  }, [user?.id]);

  return {
    // Data
    unreadCounts,
    unreadMessages,
    totalUnread: unreadCounts?.total || 0,

    // Actions
    sendMessage,
    markAsRead,
    markAllAsRead,
    getChatMessages,
    getInboxMessages,
    refetchUnreadCounts,
    refetchUnreadMessages,

    // Status
    isConnected,
    isSending: sendMessageMutation.isPending,
  };
}