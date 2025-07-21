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
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(true);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Setting up realtime subscriptions for messaging...');

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('📨 New message event:', payload);
          
          // Invalidate relevant queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['unread-counts', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-messages', user.id] });
          queryClient.invalidateQueries({ queryKey: ['messages'] });
          queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
          queryClient.invalidateQueries({ queryKey: ['inbox-messages', user.id] });
        }
      )
      .subscribe((status) => {
        console.log('📡 Messages subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Cleanup subscriptions
    return () => {
      console.log('🧹 Cleaning up messaging subscriptions...');
      supabase.removeChannel(messagesChannel);
    };
  }, [user?.id, queryClient]);

  // Get unread message counts - simplified for existing schema
  const { data: unreadCounts, refetch: refetchUnreadCounts } = useQuery({
    queryKey: ['unread-counts', user?.id],
    queryFn: async (): Promise<UnreadCounts> => {
      if (!user?.id) {
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

      try {
        // Fetch all messages and filter for unread received messages
        const { data: allMessages } = await supabase
          .from('messages')
          .select('*');

        // Filter for unread messages received by this user (not sent by them)
        const unreadReceivedMessages = (allMessages || []).filter(msg =>
          !msg.is_read && // Message is unread
          msg.user_id !== user.id && // Message was not sent by this user
          (msg.recipient_id === user.id || !msg.recipient_id) // Message is for this user (handle both schemas)
        );

        const unreadCount = unreadReceivedMessages.length;
        
        console.log('📊 Calculated unread count:', unreadCount, 'for user:', user.id);
        console.log('📊 Total messages:', allMessages?.length || 0);
        console.log('📊 Messages sent by user:', (allMessages || []).filter(msg => msg.user_id === user.id).length);
        console.log('📊 Messages received by user:', (allMessages || []).filter(msg => msg.user_id !== user.id).length);
        
        return {
          general: 0,
          committee: 0,
          hosts: 0,
          drivers: 0,
          recipients: 0,
          core_team: 0,
          direct: unreadCount, // Put unread count in direct messages
          groups: 0,
          total: unreadCount,
        };
      } catch (error) {
        console.error('Error in unread counts query:', error);
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
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
    staleTime: 1000 * 60 * 2, // Data considered fresh for 2 minutes
  });

  // Get unread messages for notifications - simplified for existing schema
  const { data: unreadMessages = [], refetch: refetchUnreadMessages } = useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        // Fetch all messages with sender info and filter for unread received messages
        const { data: allMessages } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!user_id(id, first_name, last_name, email)
          `)
          .order('created_at', { ascending: false });

        // Filter for unread messages received by this user (not sent by them)
        const unreadReceivedMessages = (allMessages || []).filter(msg =>
          !msg.is_read && // Message is unread
          msg.user_id !== user.id && // Message was not sent by this user
          (msg.recipient_id === user.id || !msg.recipient_id) // Message is for this user (handle both schemas)
        ).slice(0, 10); // Limit to recent unread messages for notifications

        console.log('📭 Fetched unread messages:', unreadReceivedMessages.length, 'for user:', user.id);
        
        return unreadReceivedMessages;
      } catch (error) {
        console.error('Error fetching unread messages:', error);
        return [];
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
    staleTime: 1000 * 60 * 2, // Data considered fresh for 2 minutes
  });

  // Send message mutation - simplified for existing schema
  const sendMessageMutation = useMutation({
    mutationFn: async (params: SendMessageParams) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const messageData = {
        user_id: user.id,
        content: params.content,
        conversation_id: params.conversation_id || null,
      };

      console.log('Sending message with data:', messageData);

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Send message error:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      refetchUnreadCounts();
      refetchUnreadMessages();
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', user.id] });
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
      
      // Update message as read in the database
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .neq('user_id', user.id); // Only update messages not sent by this user
      
      if (error) {
        console.error('Error marking message as read:', error);
        throw error;
      }
      
      console.log('Message marked as read:', messageId);
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
      
      // Update all unread messages as read for this user (only messages not sent by them)
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .neq('user_id', user.id) // Only update messages not sent by this user
        .eq('is_read', false);
      
      if (error) {
        console.error('Error marking all messages as read:', error);
        throw error;
      }
      
      console.log('All messages marked as read for user:', user.id);
      return { success: true };
    },
    onSuccess: () => {
      refetchUnreadCounts();
      refetchUnreadMessages();
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', user.id] });
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

  // Get messages for a specific chat channel - simplified for existing schema
  const getChatMessages = useCallback(async (channelName: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!user_id(id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Failed to fetch ${channelName} messages:`, error);
      return [];
    }
  }, []);

  // Get inbox messages - simplified for existing schema
  const getInboxMessages = useCallback(async () => {
    if (!user?.id) return [];
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!user_id(id, first_name, last_name, email)
        `)
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
