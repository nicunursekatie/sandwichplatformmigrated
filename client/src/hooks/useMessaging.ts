import { useState, useCallback } from "react";
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
  suggestion: number;
  project: number;
  task: number;
}

interface Message {
  id: number;
  conversation_id: string;
  sender_id: string;
  content: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface SendMessageParams {
  recipientIds: string[];
  content: string;
  contextType?: 'suggestion' | 'project' | 'task' | 'direct';
  contextId?: string;
  parentMessageId?: number;
}

export function useMessaging() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // For now, return empty unread counts since we don't have a proper message read tracking system
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
    suggestion: 0,
    project: 0,
    task: 0,
  } as UnreadCounts, refetch: refetchUnreadCounts } = useQuery({
    queryKey: ['unread-counts', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // TODO: Implement proper unread message counting
      // This would require a message_reads table or similar tracking mechanism
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
        suggestion: 0,
        project: 0,
        task: 0,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get unread messages (empty for now)
  const { data: unreadMessages = [], refetch: refetchUnreadMessages } = useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // TODO: Implement proper unread message fetching
      return [];
    },
    enabled: !!user?.id,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (params: SendMessageParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      // For now, we'll create messages without a conversation_id
      // This allows the messaging to work while we figure out the conversation system
      const { data, error } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          content: params.content
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
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

  // Mark message as read mutation (placeholder)
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      // TODO: Implement message read tracking
      return { success: true };
    },
    onSuccess: () => {
      refetchUnreadCounts();
      refetchUnreadMessages();
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  // Mark all messages as read mutation (placeholder)
  const markAllAsReadMutation = useMutation({
    mutationFn: async (contextType?: string) => {
      // TODO: Implement mark all as read
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
    if (!user?.id) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in to send messages',
        variant: 'destructive',
      });
      return;
    }

    return await sendMessageMutation.mutateAsync(params);
  }, [user?.id, sendMessageMutation, toast]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: number) => {
    return await markAsReadMutation.mutateAsync(messageId);
  }, [markAsReadMutation]);

  // Mark all messages as read
  const markAllAsRead = useCallback(async (contextType?: string) => {
    return await markAllAsReadMutation.mutateAsync(contextType);
  }, [markAllAsReadMutation]);

  // Get messages for a specific context
  const getContextMessages = useCallback(async (contextType: string, contextId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!sender_id(
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('conversation_id', `${contextType}-${contextId}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch context messages:', error);
      return [];
    }
  }, []);

  return {
    // Data
    unreadCounts,
    unreadMessages,
    totalUnread: 0, // Always 0 for now until we implement read tracking

    // Actions
    sendMessage,
    markAsRead,
    markAllAsRead,
    getContextMessages,
    refetchUnreadCounts,
    refetchUnreadMessages,

    // Status
    isConnected: true, // Always true since we're not using WebSocket
    isSending: sendMessageMutation.isPending,
  };
}