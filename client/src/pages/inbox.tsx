import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMessaging } from "@/hooks/useMessaging";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";

import { formatDistanceToNow } from "date-fns";
import { 
  Inbox as InboxIcon, 
  MessageCircle, 
  Send, 
  Search,
  CheckCheck,
  Circle,
  Lightbulb,
  FolderOpen,
  ListTodo,
  Archive,
  Star,
  MoreVertical,
  Reply,
  Trash2,
  Edit2,
  Plus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageComposer } from "@/components/message-composer";
import { KudosInbox } from "@/components/kudos-inbox";

interface Message {
  id: number;
  senderId: string;
  senderName?: string;
  content: string;
  contextType?: string;
  contextId?: string;
  contextTitle?: string;
  createdAt: string;
  editedAt?: string;
  editedContent?: string;
  read?: boolean;
  readAt?: string;
}

interface MessageFormData {
  senderId: string;
  recipientId: string;
  subject: string;
  content: string;
  messageType: string;
  priority: string;
  status?: string;
}

export default function InboxPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    unreadMessages, 
    markAsRead, 
    markAllAsRead,
    getContextMessages,
    sendMessage,
    isSending 
  } = useMessaging();
  
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [composeData, setComposeData] = useState<MessageFormData>({
    senderId: "",
    recipientId: "",
    subject: "",
    content: "",
    messageType: "direct",
    priority: "normal"
  });

  // Fetch all messages with fresh user data
  const { data: messages = [], isLoading, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["messages"],
    queryFn: async () => {
      // First get messages - only direct messages (no conversation_id)
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .is('conversation_id', null)
        .order('created_at', { ascending: false });
      
      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return [];
      }
      
      if (!messagesData || messagesData.length === 0) {
        return [];
      }
      
      // Get unique user IDs from messages
      const userIds = [...new Set(messagesData.map(msg => msg.user_id))];
      
      // Fetch user data for all senders
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
      }
      
      // Create a map of user data
      const userMap = new Map((usersData || []).map(user => [user.id, user]));
      
      // Transform the data to match the expected Message interface
      return messagesData.map(msg => {
        const senderUser = userMap.get(msg.user_id);
        return {
          id: msg.id,
          senderId: msg.user_id,
          senderName: senderUser 
            ? `${senderUser.first_name || ''} ${senderUser.last_name || ''}`.trim() || senderUser.email
            : msg.sender || msg.user_id || 'Unknown',
          content: msg.content,
          createdAt: msg.created_at,
          editedAt: msg.updated_at,
          read: false, // We don't have a read status in the table yet
          readAt: null
        };
      });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData) => {
      const { data: result, error } = await supabase
        .from('messages')
        .insert({
          sender_id: data.senderId,
          recipient_id: data.recipientId,
          subject: data.subject,
          content: data.content,
          message_type: data.messageType,
          priority: data.priority,
          status: data.status || 'sent'
        });
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      setIsComposing(false);
      setComposeData({
        senderId: "",
        recipientId: "",
        subject: "",
        content: "",
        messageType: "direct",
        priority: "normal"
      });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: (error) => {
      console.error("Send message error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Fetch thread messages when a message is selected with fresh user data
  const { data: threadMessages = [] } = useQuery({
    queryKey: ['messaging-thread', selectedMessage?.contextType, selectedMessage?.contextId],
    queryFn: async () => {
      try {
        if (!selectedMessage?.contextType || !selectedMessage?.contextId) return [];
        // TODO: Implement thread fetching with Supabase
        return [];
      } catch (error) {
        console.error('Failed to fetch thread messages:', error);
        return [];
      }
    },
    enabled: !!selectedMessage?.contextType && !!selectedMessage?.contextId && !!user,
    staleTime: 0, // Always fetch fresh data
    gcTime: 30000, // Cache for 30 seconds only
    refetchOnWindowFocus: true,
  });

  // Handle message selection and mark as read
  const handleSelectMessage = async (message: Message) => {
    setSelectedMessage(message);
    setShowComposer(false); // Close composer when selecting a message
    if (!message.read) {
      await markAsRead(message.id);
      refetchMessages();
    }
  };

  // Handle reply
  const handleReply = async () => {
    if (!replyContent.trim() || !selectedMessage) return;

    try {
      await sendMessageMutation.mutateAsync({
        senderId: user?.id || '',
        recipientId: selectedMessage.senderId,
        subject: `Re: Message`,
        content: replyContent,
        messageType: "direct",
        priority: "normal"
      });
      
      setReplyContent("");
      refetchMessages();
      toast({ description: "Reply sent successfully" });
    } catch (error) {
      toast({ 
        description: "Failed to send reply", 
        variant: "destructive" 
      });
    }
  };

  // Debug logging to understand invalid messages
  console.log('Raw allMessages array:', messages);
  console.log('Invalid allMessages:', messages?.filter(msg => !msg || !msg.senderName));
  
  // Filter out undefined/invalid messages first
  const validMessages = (messages || [])
    .filter(msg => msg && typeof msg === 'object' && msg.senderName && msg.content) || [];
  
  console.log('Valid messages after filtering:', validMessages);
  
  // Debug threadMessages too
  const validThreadMessages = (threadMessages || [])
    .filter((msg: any) => msg && typeof msg === 'object' && msg.senderName) || [];
  
  // Filter messages based on search
  const filteredMessages = validMessages.filter((message: Message) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      (message.content || '').toLowerCase().includes(searchLower) ||
      (message.senderName || '').toLowerCase().includes(searchLower) ||
      (message.contextTitle || '').toLowerCase().includes(searchLower)
    );
  });

  // Get context icon
  const getContextIcon = (contextType?: string) => {
    switch (contextType) {
      case 'suggestion': return <Lightbulb className="h-4 w-4" />;
      case 'project': return <FolderOpen className="h-4 w-4" />;
      case 'task': return <ListTodo className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  // Get context color
  const getContextColor = (contextType?: string) => {
    switch (contextType) {
      case 'suggestion': return 'text-yellow-600 bg-yellow-50';
      case 'project': return 'text-blue-600 bg-blue-50';
      case 'task': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Message List */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <InboxIcon className="h-5 w-5" />
              Inbox
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowComposer(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Compose
              </Button>
              {unreadMessages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsRead()}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {/* Custom Tab Navigation */}
          <div className="px-4 py-3 border-b bg-slate-50">
            <div className="flex gap-2 overflow-x-auto">
              {[
                { id: 'all', label: 'All Messages', icon: InboxIcon, count: validMessages.length },
                { id: 'direct', label: 'Direct', icon: MessageCircle, count: validMessages.filter((m: Message) => m && (m.contextType === 'direct' || !m.contextType)).length },
                { id: 'suggestion', label: 'Suggestions', icon: Lightbulb, count: validMessages.filter((m: Message) => m && m.contextType === 'suggestion').length },
                { id: 'project', label: 'Projects', icon: FolderOpen, count: validMessages.filter((m: Message) => m && m.contextType === 'project').length },
                { id: 'task', label: 'Tasks', icon: ListTodo, count: validMessages.filter((m: Message) => m && m.contextType === 'task').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                    ${selectedTab === tab.id 
                      ? 'bg-white text-[#236383] shadow-sm border border-slate-200' 
                      : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                    }
                  `}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <Badge 
                      variant={selectedTab === tab.id ? "default" : "secondary"}
                      className={`
                        h-5 px-2 text-xs
                        ${selectedTab === tab.id 
                          ? 'bg-[#236383] text-white' 
                          : 'bg-slate-200 text-slate-700'
                        }
                      `}
                    >
                      {tab.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No messages found
                </div>
              ) : (
                filteredMessages.map((message: Message) => (
                  <Card
                    key={message.id}
                    className={`mb-2 cursor-pointer transition-colors ${
                      selectedMessage?.id === message.id 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'hover:bg-gray-50'
                    } ${!message.read ? 'border-l-4 border-l-blue-500' : ''}`}
                    onClick={() => handleSelectMessage(message)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {message?.senderName?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {message?.senderName || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {message?.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true }) : 'Unknown time'}
                            </p>
                          </div>
                        </div>
                        {!message?.read && (
                          <Circle className="h-2 w-2 fill-blue-500 text-blue-500" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                        {message.editedContent || message.content}
                      </p>
                      
                      {message.contextType && (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getContextColor(message.contextType)}`}>
                          {getContextIcon(message.contextType)}
                          <span>{message.contextTitle || message.contextType}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Message Detail */}
      <div className="flex-1 flex flex-col">
        {showComposer ? (
          <div className="p-4">
            <MessageComposer
              contextType="direct"
              onSent={() => {
                setShowComposer(false);
                refetchMessages();
              }}
              onCancel={() => setShowComposer(false)}
            />
          </div>
        ) : selectedMessage ? (
          <>
            {/* Message Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {selectedMessage.senderName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedMessage.senderName || 'Unknown'}</h3>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(selectedMessage.createdAt), { addSuffix: true })}
                      {selectedMessage.editedAt && ' (edited)'}
                    </p>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Star className="h-4 w-4 mr-2" />
                      Star
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {selectedMessage.contextType && (
                <div className="mt-2">
                  <Badge variant="secondary" className="gap-1">
                    {getContextIcon(selectedMessage.contextType)}
                    {selectedMessage.contextTitle || selectedMessage.contextType}
                  </Badge>
                </div>
              )}
            </div>

            {/* Thread Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Original Message */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedMessage.editedContent || selectedMessage.content}
                  </p>
                </div>

                {/* Thread Replies */}
                {((threadMessages || [])
                  .filter((m: any) => m && typeof m === 'object' && m.senderName && m.content && m.id !== selectedMessage?.id)
                ).map((message: Message) => (
                  <div 
                    key={message.id} 
                    className={`rounded-lg p-4 ${
                      message.senderId === user?.id 
                        ? 'bg-blue-50 ml-auto max-w-[80%]' 
                        : 'bg-gray-50 mr-auto max-w-[80%]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium text-sm">{message?.senderName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">
                        {message?.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true }) : 'Unknown time'}
                      </p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {message?.editedContent || message?.content || ''}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Reply Box */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleReply()}
                />
                <Button 
                  onClick={handleReply} 
                  disabled={!replyContent.trim() || isSending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <InboxIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Select a message to view</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowComposer(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Compose New Message
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}