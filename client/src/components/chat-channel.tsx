import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, User, Clock, Reply, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMessaging } from "@/hooks/useMessaging";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { ensureChannelExists } from "@/lib/initialize-chat-channels";

interface Message {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  reply_to_id?: number;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ChatChannelProps {
  channelName: string;
  channelType?: 'general' | 'committee' | 'hosts' | 'drivers' | 'recipients' | 'core_team';
  placeholder?: string;
}

export default function ChatChannel({ 
  channelName, 
  channelType = 'general',
  placeholder = "Type your message..." 
}: ChatChannelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendMessage, markAsRead, isConnected } = useMessaging();
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get conversation ID for this channel
  const { data: conversation } = useQuery({
    queryKey: ['conversation', channelName],
    queryFn: async () => {
      // Try to get existing conversation
      const { data, error } = await supabase
        .from('conversations')
        .select('id, name, type')
        .eq('name', channelName)
        .eq('type', 'channel')
        .single();
      
      if (error && error.code === 'PGRST116') {
        // Channel doesn't exist, create it
        console.log(`Channel ${channelName} not found, creating...`);
        const newChannel = await ensureChannelExists(channelName);
        return newChannel;
      }
      
      if (error) {
        console.error('Error fetching conversation:', error);
        return null;
      }
      
      return data;
    }
  });

  // Get messages for this channel
  const { data: messages = [], isLoading, refetch } = useQuery<Message[]>({
    queryKey: ['chat-messages', channelName, conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          user_id,
          content,
          created_at,
          reply_to_id,
          sender:users!user_id(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('conversation_id', conversation.id)
        .eq('message_type', 'chat')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
      
      // Transform the data to match the Message interface
      return (data || []).map(msg => ({
        ...msg,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender
      }));
    },
    enabled: !!conversation?.id,
    refetchInterval: 5000, // Fallback polling every 5 seconds
  });

  // Set up realtime subscription for this channel
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`chat-${channelName}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          console.log('New message in channel:', payload);
          refetch(); // Refresh messages
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, channelName, refetch]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when user views them
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      const unreadMessages = messages.filter(msg => 
        msg.user_id !== user.id // Don't mark own messages as read
      );
      
      unreadMessages.forEach(msg => {
        markAsRead(msg.id);
      });
    }
  }, [messages, user?.id, markAsRead]);

  const handleSendMessage = async () => {
    if (!message.trim() || !conversation?.id || !user) return;

    try {
      await sendMessage({
        content: message,
        conversation_id: conversation.id,
        message_type: 'chat',
        reply_to_id: replyingTo?.id
      });

      setMessage("");
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getUserDisplayName = (msg: Message) => {
    if (msg.sender?.first_name || msg.sender?.last_name) {
      return `${msg.sender.first_name || ''} ${msg.sender.last_name || ''}`.trim();
    }
    return msg.sender?.email || msg.user_id;
  };

  const getReplyToMessage = (replyToId: number) => {
    return messages.find(m => m.id === replyToId);
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-500">
            Channel not found
          </div>
          <div className="text-sm text-gray-400">
            The {channelName} channel hasn't been set up yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-medium"># {channelName}</span>
          {!isConnected && (
            <Badge variant="secondary" className="text-xs">
              Reconnecting...
            </Badge>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {messages.length} messages
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium mb-2">Welcome to #{channelName}!</div>
              <div className="text-sm">This is the beginning of your conversation.</div>
            </div>
          ) : (
            messages.map((msg) => {
              const replyTo = msg.reply_to_id ? getReplyToMessage(msg.reply_to_id) : null;
              
              return (
                <div key={msg.id} className="group">
                  {/* Reply context */}
                  {replyTo && (
                    <div className="ml-8 mb-1 p-2 bg-gray-50 rounded text-sm border-l-2 border-gray-300">
                      <div className="font-medium text-gray-600">
                        Replying to {getUserDisplayName(replyTo)}
                      </div>
                      <div className="text-gray-500 truncate">
                        {replyTo.content}
                      </div>
                    </div>
                  )}
                  
                  {/* Message */}
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarFallback className="text-xs">
                        {getUserDisplayName(msg).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {getUserDisplayName(msg)}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-900 whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>

                    {/* Message actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setReplyingTo(msg)}>
                            <Reply className="w-4 h-4 mr-2" />
                            Reply
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      <div className="p-4 border-t">
        {replyingTo && (
          <div className="mb-2 p-2 bg-blue-50 rounded text-sm border-l-2 border-blue-300">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">Replying to {getUserDisplayName(replyingTo)}</span>
                <div className="text-gray-600 truncate">{replyingTo.content}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="flex-1"
            disabled={!isConnected}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim() || !isConnected}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {!isConnected && (
          <div className="mt-2 text-xs text-amber-600">
            Connection lost. Attempting to reconnect...
          </div>
        )}
      </div>
    </div>
  );
}