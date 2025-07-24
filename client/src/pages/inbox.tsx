import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMessaging } from "@/hooks/useMessaging";
import { supabase } from "@/lib/supabase";

import { formatDistanceToNow } from "date-fns";
import { groupMessagesIntoThreads, ThreadedMessage } from "@/lib/message-threads";
import { InboxMessageThread } from "@/components/inbox-message-thread";
import { InboxMessageDetail } from "@/components/inbox-message-detail";
import { 
  Inbox as InboxIcon, 
  MessageCircle, 
  Send, 
  Search,
  CheckCheck,
  Circle,
  Plus,
  Reply,
  Trash2,
  MoreVertical,
  Users
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InboxMessage {
  id: number;
  user_id: string;
  recipient_id?: string;
  conversation_id?: number;
  content: string;
  subject?: string;
  message_type: 'direct' | 'group';
  priority: 'low' | 'normal' | 'high';
  status: string;
  created_at: string;
  reply_to_id?: number; // Add missing property for threading
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  recipient?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  conversation?: {
    id: number;
    name: string;
    type: string;
  };
  is_read?: boolean;
  is_sent_by_user?: boolean;
}

interface ComposeData {
  recipients: string[];
  subject: string;
  content: string;
  priority: 'low' | 'normal' | 'high';
  message_type: 'direct' | 'group';
}

export default function InboxPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendMessage, markAsRead, isConnected } = useMessaging();
  
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [selectedThread, setSelectedThread] = useState<ThreadedMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [composeData, setComposeData] = useState<ComposeData>({
    recipients: [],
    subject: "",
    content: "",
    priority: "normal",
    message_type: "direct"
  });

  // Fetch all users for recipient selection
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .neq('id', user?.id || '');
      
      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch inbox messages
  const { data: messages = [], isLoading, refetch } = useQuery<InboxMessage[]>({
    queryKey: ["inbox-messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Simplified query for existing schema
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!user_id(id, first_name, last_name, email),
          recipient:users!recipient_id(id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching inbox messages:', error);
        return [];
      }

      console.log('Fetched inbox messages:', data?.length, 'messages');
      console.log('User ID:', user.id);
      
      // Process messages with proper read status tracking
      return (data || []).map(msg => {
        const isSentByUser = msg.user_id === user.id;
        
        return {
          ...msg,
          message_type: msg.message_type || 'direct' as const,
          priority: msg.priority || 'normal' as const,
          status: 'sent', // Default for compatibility
          is_read: msg.is_read || false, // Use actual read status from database
          is_sent_by_user: isSentByUser,
          recipient_id: msg.recipient_id, // Include recipient_id for proper filtering
          // Fix array issue for sender and recipient from Supabase joins
          sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
          recipient: Array.isArray(msg.recipient) ? msg.recipient[0] : msg.recipient
        };
      });
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('inbox-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  // Filter messages based on selected tab and search query
  const filteredMessages = messages.filter(msg => {
    // Apply search filter first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchMatch = 
        msg.content.toLowerCase().includes(query) ||
        msg.subject?.toLowerCase().includes(query) ||
        getUserDisplayName(msg.sender).toLowerCase().includes(query);
      if (!searchMatch) return false;
    }

    // For threading, we need to include messages that are part of a conversation
    // even if they were sent by the user
    const isPartOfThread = msg.reply_to_id || messages.some(m => m.reply_to_id === msg.id);

    // Apply tab filter
    switch (selectedTab) {
      case "sent":
        return msg.is_sent_by_user;
      case "unread":
        return !msg.is_read && !msg.is_sent_by_user; // Show only received unread messages
      case "direct":
        return msg.message_type === 'direct' && (!msg.is_sent_by_user || isPartOfThread);
      case "group":
        return msg.message_type === 'group' && (!msg.is_sent_by_user || isPartOfThread);
      default: // "all"
        // Include sent messages if they're part of a thread
        return !msg.is_sent_by_user || isPartOfThread;
    }
  });

  // Group filtered messages into threads
  const threadedMessages = groupMessagesIntoThreads(filteredMessages);
  
  // Update selected thread when messages change
  useEffect(() => {
    if (selectedThread) {
      // Find if the selected thread still exists in the current messages
      const threadStillExists = messages.some(m => m.id === selectedThread.id);
      if (!threadStillExists) {
        // Thread was deleted, clear selection
        setSelectedThread(null);
      }
    }
  }, [messages, selectedThread?.id]); // Re-run when messages change
  
  // Sort threads: threads with unread messages first, then by most recent activity
  const sortedThreads = [...threadedMessages].sort((a, b) => {
    const aHasUnread = hasUnreadInThread(a);
    const bHasUnread = hasUnreadInThread(b);
    
    // If one has unread and the other doesn't, unread comes first
    if (aHasUnread && !bHasUnread) return -1;
    if (!aHasUnread && bHasUnread) return 1;
    
    // Otherwise sort by most recent message time
    const aMostRecent = getMostRecentMessageTime(a);
    const bMostRecent = getMostRecentMessageTime(b);
    return bMostRecent.getTime() - aMostRecent.getTime();
  });
  
  // Helper function to check if thread has unread messages
  function hasUnreadInThread(thread: ThreadedMessage): boolean {
    if (!thread.is_read && !thread.is_sent_by_user) return true;
    return thread.replies.some(reply => hasUnreadInThread(reply));
  }
  
  // Helper function to get most recent message time in thread
  function getMostRecentMessageTime(thread: ThreadedMessage): Date {
    let mostRecent = new Date(thread.created_at);
    thread.replies.forEach(reply => {
      const replyTime = getMostRecentMessageTime(reply);
      if (replyTime > mostRecent) {
        mostRecent = replyTime;
      }
    });
    return mostRecent;
  }

  // Calculate unread count for RECEIVED messages only (exclude sent messages)
  const unreadMessages = messages.filter(msg => 
    !msg.is_read && // Message is not read
    !msg.is_sent_by_user && // Message was not sent by this user
    (msg.recipient_id === user?.id || !msg.recipient_id) // Message is for this user
  );
  
  const unreadCount = unreadMessages.length;
  
  console.log('Unread messages in inbox:', unreadMessages.length);
  console.log('Total messages:', unreadCount);
  console.log('Messages sent by user:', messages.filter(msg => msg.is_sent_by_user).length);
  console.log('Messages received by user:', messages.filter(msg => !msg.is_sent_by_user).length);

  const handleSendMessage = async () => {
    if (!composeData.content.trim() || composeData.recipients.length === 0) return;

    try {
      if (composeData.message_type === 'direct' && composeData.recipients.length === 1) {
        // Send direct message with proper fields
        const messageData = {
          user_id: user?.id,
          content: composeData.content,
          recipient_id: composeData.recipients[0],
          subject: composeData.subject,
          message_type: 'direct',
          priority: composeData.priority,
          is_read: false // New messages start as unread
        };

        const { error } = await supabase
          .from('messages')
          .insert(messageData);
        
        if (error) throw error;
      } else {
        // Create group conversation and send message
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            type: 'group',
            name: composeData.subject || 'Group Message'
          })
          .select()
          .single();

        if (convError) throw convError;

        // Add participants
        const participants = [
          ...composeData.recipients.map(id => ({ conversation_id: conversation.id, user_id: id })),
          { conversation_id: conversation.id, user_id: user?.id }
        ];

        await supabase.from('conversation_participants').insert(participants);

        // Send message
        await sendMessage({
          content: composeData.content,
          message_type: 'group',
          conversation_id: conversation.id,
          subject: composeData.subject,
          priority: composeData.priority
        });
      }

      // Reset form
      setComposeData({
        recipients: [],
        subject: "",
        content: "",
        priority: "normal",
        message_type: "direct"
      });
      setShowComposer(false);
      toast({ title: "Message sent", description: "Your message has been delivered." });
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || (!selectedMessage && !selectedThread)) return;

    const messageToReply = selectedThread || selectedMessage;
    if (!messageToReply) return;

    try {
      // Get the most recent message in the thread to reply to
      const getMostRecentId = (msg: any): number => {
        if (!msg.replies || msg.replies.length === 0) return msg.id;
        let mostRecent = msg;
        const findMostRecent = (m: any) => {
          if (new Date(m.created_at) > new Date(mostRecent.created_at)) {
            mostRecent = m;
          }
          m.replies?.forEach(findMostRecent);
        };
        msg.replies.forEach(findMostRecent);
        return mostRecent.id;
      };

      const replyToId = getMostRecentId(messageToReply);

      if (messageToReply.message_type === 'direct') {
        // Determine the correct recipient for the reply
        let recipientId;
        if (messageToReply.is_sent_by_user) {
          // If replying to our own message, send to the same recipient
          recipientId = messageToReply.recipient_id;
        } else {
          // If replying to a received message, send back to the sender
          recipientId = messageToReply.user_id;
        }
        
        console.log('Sending reply to recipient:', recipientId, 'with reply_to_id:', replyToId);
        
        await sendMessage({
          content: replyContent,
          message_type: 'direct',
          recipient_id: recipientId,
          subject: messageToReply.subject ? `Re: ${messageToReply.subject}` : undefined,
          priority: messageToReply.priority,
          reply_to_id: replyToId // Reply to the most recent message in thread
        });
      } else if (messageToReply.conversation_id) {
        await sendMessage({
          content: replyContent,
          message_type: 'group',
          conversation_id: messageToReply.conversation_id,
          priority: messageToReply.priority,
          reply_to_id: replyToId // Reply to the most recent message in thread
        });
      }

      setReplyContent("");
      toast({ title: "Reply sent", description: "Your reply has been delivered." });
      
      // Refetch messages to show the new reply
      await refetch();
      console.log('Reply sent and messages refetched');
      
    } catch (error) {
      console.error('Failed to send reply:', error);
      toast({
        title: "Failed to send reply",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      await markAsRead(messageId);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const getUserDisplayName = (user: any) => {
    if (!user) return 'Unknown';
    const name = (user.first_name || user.last_name) 
      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
      : '';
    const email = user.email || '';
    
    // If we have both name and email, show both
    if (name && email) {
      return `${name} (${email})`;
    }
    // If only email, show email
    if (email) {
      return email;
    }
    // If only name, show name
    if (name) {
      return name;
    }
    // Fallback to user id
    return user.id || 'Unknown';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  // Mark message as read when selected (only for received messages)
  useEffect(() => {
    if (selectedMessage && !selectedMessage.is_read && !selectedMessage.is_sent_by_user) {
      handleMarkAsRead(selectedMessage.id);
    }
  }, [selectedMessage, user?.id]);

  return (
    <div className="space-y-6">
      {/* Header with TSP Brand Styling */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-main-heading text-primary flex items-center gap-2">
            <InboxIcon className="h-6 w-6 text-brand-teal" />
            Inbox
          </h1>
          <p className="text-sm sm:text-base font-body text-muted-foreground">
            Direct and group messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-body text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Message List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Controls with TSP Branding */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 font-body"
              />
            </div>
            <Dialog open={showComposer} onOpenChange={setShowComposer}>
              <DialogTrigger asChild>
                <Button className="btn-tsp-primary font-sub-heading">
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="font-main-heading text-xl text-foreground">
                    Compose Message
                  </DialogTitle>
                  <DialogDescription className="font-body text-muted-foreground">
                    Send a direct message or create a group conversation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-sub-heading text-sm">Message Type</Label>
                      <Select
                        value={composeData.message_type}
                        onValueChange={(value: 'direct' | 'group') => 
                          setComposeData(prev => ({ ...prev, message_type: value }))
                        }
                      >
                        <SelectTrigger className="font-body">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direct Message</SelectItem>
                          <SelectItem value="group">Group Message</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-sub-heading text-sm">Priority</Label>
                      <Select
                        value={composeData.priority}
                        onValueChange={(value: 'low' | 'normal' | 'high') => 
                          setComposeData(prev => ({ ...prev, priority: value }))
                        }
                      >
                        <SelectTrigger className="font-body">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="font-sub-heading text-sm">Recipients</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (value && !composeData.recipients.includes(value)) {
                          setComposeData(prev => ({
                            ...prev,
                            recipients: [...prev.recipients, value]
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="font-body">
                        <SelectValue placeholder="Select recipients..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {getUserDisplayName(user)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {composeData.recipients.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {composeData.recipients.map(recipientId => {
                          const recipient = users.find(u => u.id === recipientId);
                          return (
                            <Badge key={recipientId} variant="secondary" className="flex items-center gap-1 font-body text-xs">
                              {getUserDisplayName(recipient)}
                              <button
                                onClick={() => setComposeData(prev => ({
                                  ...prev,
                                  recipients: prev.recipients.filter(id => id !== recipientId)
                                }))}
                                className="ml-1 hover:bg-gray-200 rounded"
                              >
                                ×
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="font-sub-heading text-sm">Subject</Label>
                    <Input
                      placeholder="Subject (optional)"
                      value={composeData.subject}
                      onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                      className="font-body"
                    />
                  </div>

                  <div>
                    <Label className="font-sub-heading text-sm">Message</Label>
                    <Textarea
                      placeholder="Type your message..."
                      value={composeData.content}
                      onChange={(e) => setComposeData(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                      className="font-body"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowComposer(false)} className="font-body">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!composeData.content.trim() || composeData.recipients.length === 0}
                      className="btn-tsp-primary font-sub-heading"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabs with TSP Branding */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-5 bg-muted">
              <TabsTrigger value="all" className="text-xs font-sub-heading data-[state=active]:bg-brand-teal data-[state=active]:text-white">
                All
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs font-sub-heading data-[state=active]:bg-brand-teal data-[state=active]:text-white">
                Unread
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="text-xs font-sub-heading data-[state=active]:bg-brand-teal data-[state=active]:text-white">Sent</TabsTrigger>
              <TabsTrigger value="direct" className="text-xs font-sub-heading data-[state=active]:bg-brand-teal data-[state=active]:text-white">Direct</TabsTrigger>
              <TabsTrigger value="group" className="text-xs font-sub-heading data-[state=active]:bg-brand-teal data-[state=active]:text-white">Group</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-4">
              <ScrollArea className="h-[calc(100vh-400px)]">
                <div className="space-y-2">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal mx-auto"></div>
                      <p className="font-body text-muted-foreground mt-4">Loading messages...</p>
                    </div>
                  ) : sortedThreads.length === 0 ? (
                    <div className="text-center py-8">
                      <InboxIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-sub-heading text-lg text-foreground mb-2">No messages</h3>
                      <p className="font-body text-muted-foreground">
                        {selectedTab === 'unread' ? 'All caught up!' : 'Your inbox is empty'}
                      </p>
                    </div>
                  ) : (
                    sortedThreads.map((thread) => (
                      <InboxMessageThread
                        key={thread.id}
                        thread={thread}
                        selectedMessageId={selectedMessage?.id || null}
                        onSelectMessage={(msg) => {
                          setSelectedMessage(msg as any);
                          setSelectedThread(thread);
                        }}
                        getUserDisplayName={getUserDisplayName}
                        currentUserId={user?.id || ''}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedThread ? (
            <InboxMessageDetail
              thread={selectedThread}
              replyContent={replyContent}
              onReplyContentChange={setReplyContent}
              onReply={handleReply}
              onMarkAsRead={handleMarkAsRead}
              getUserDisplayName={getUserDisplayName}
              currentUserId={user?.id || ''}
            />
          ) : selectedMessage ? (
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-sub-heading text-lg text-foreground">
                      {selectedMessage.subject || 'No Subject'}
                    </CardTitle>
                    <CardDescription className="font-body text-muted-foreground">
                      From: {getUserDisplayName(selectedMessage.sender)} • {' '}
                      {formatDistanceToNow(new Date(selectedMessage.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="hover:bg-brand-teal-light">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleMarkAsRead(selectedMessage.id)}>
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Mark as Read
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 mb-4">
                  <div className="whitespace-pre-wrap text-sm font-body text-foreground">
                    {selectedMessage.content}
                  </div>
                </div>
                
                {/* Reply Area */}
                <div className="border-t pt-4">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={3}
                      className="font-body"
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleReply}
                        disabled={!replyContent.trim()}
                        size="sm"
                        className="btn-tsp-primary font-sub-heading"
                      >
                        <Reply className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-sub-heading text-lg text-foreground mb-2">Select a message</h3>
                <p className="font-body text-muted-foreground">Choose a message to read and reply</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
