import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { 
  Inbox as InboxIcon, 
  MessageCircle, 
  Send, 
  Search,
  CheckCheck,
  Circle,
  Plus,
  Reply,
  Forward,
  Trash2,
  Archive,
  MoreVertical,
  Users,
  User
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
  const { sendMessage, markAsRead, markAllAsRead, isConnected } = useMessaging();
  
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
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

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!user_id(id, first_name, last_name, email),
          recipient:users!recipient_id(id, first_name, last_name, email),
          conversation:conversations!conversation_id(id, name, type),
          message_reads!left(user_id, read_at)
        `)
        .in('message_type', ['direct', 'group'])
        .or(`recipient_id.eq.${user.id},user_id.eq.${user.id},conversation_id.in.(
          SELECT conversation_id 
          FROM conversation_participants 
          WHERE user_id = '${user.id}'
        )`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching inbox messages:', error);
        return [];
      }

      // Process read status
      return (data || []).map(msg => ({
        ...msg,
        is_read: msg.message_reads?.some((read: any) => read.user_id === user.id) || false
      }));
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
          table: 'messages',
          filter: `or(recipient_id.eq.${user.id},user_id.eq.${user.id})`
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

  // Filter messages based on tab
  const filteredMessages = messages.filter(msg => {
    if (searchQuery && !msg.content.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !msg.subject?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    switch (selectedTab) {
      case "unread":
        return !msg.is_read && msg.user_id !== user?.id;
      case "sent":
        return msg.user_id === user?.id;
      case "direct":
        return msg.message_type === 'direct';
      case "group":
        return msg.message_type === 'group';
      default:
        return true;
    }
  });

  const unreadCount = messages.filter(msg => !msg.is_read && msg.user_id !== user?.id).length;

  const handleSendMessage = async () => {
    if (!composeData.content.trim() || composeData.recipients.length === 0) return;

    try {
      if (composeData.message_type === 'direct' && composeData.recipients.length === 1) {
        // Send direct message
        await sendMessage({
          content: composeData.content,
          message_type: 'direct',
          recipient_id: composeData.recipients[0],
          subject: composeData.subject,
          priority: composeData.priority
        });
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
    if (!replyContent.trim() || !selectedMessage) return;

    try {
      if (selectedMessage.message_type === 'direct') {
        await sendMessage({
          content: replyContent,
          message_type: 'direct',
          recipient_id: selectedMessage.user_id === user?.id ? selectedMessage.recipient_id : selectedMessage.user_id,
          subject: selectedMessage.subject ? `Re: ${selectedMessage.subject}` : undefined,
          priority: selectedMessage.priority
        });
      } else if (selectedMessage.conversation_id) {
        await sendMessage({
          content: replyContent,
          message_type: 'group',
          conversation_id: selectedMessage.conversation_id,
          priority: selectedMessage.priority
        });
      }

      setReplyContent("");
      toast({ title: "Reply sent", description: "Your reply has been delivered." });
      
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
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email || user.id;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  // Mark message as read when selected
  useEffect(() => {
    if (selectedMessage && !selectedMessage.is_read && selectedMessage.user_id !== user?.id) {
      handleMarkAsRead(selectedMessage.id);
    }
  }, [selectedMessage, user?.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-main-heading text-primary flex items-center gap-2">
            <InboxIcon className="h-6 w-6" />
            Inbox
          </h1>
          <p className="text-sm sm:text-base font-body text-muted-foreground">
            Direct and group messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Message List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Controls */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={showComposer} onOpenChange={setShowComposer}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Compose Message</DialogTitle>
                  <DialogDescription>
                    Send a direct message or create a group conversation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Message Type</Label>
                      <Select
                        value={composeData.message_type}
                        onValueChange={(value: 'direct' | 'group') => 
                          setComposeData(prev => ({ ...prev, message_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direct Message</SelectItem>
                          <SelectItem value="group">Group Message</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select
                        value={composeData.priority}
                        onValueChange={(value: 'low' | 'normal' | 'high') => 
                          setComposeData(prev => ({ ...prev, priority: value }))
                        }
                      >
                        <SelectTrigger>
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
                    <Label>Recipients</Label>
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
                      <SelectTrigger>
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
                            <Badge key={recipientId} variant="secondary" className="flex items-center gap-1">
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
                    <Label>Subject</Label>
                    <Input
                      placeholder="Subject (optional)"
                      value={composeData.subject}
                      onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Message</Label>
                    <Textarea
                      placeholder="Type your message..."
                      value={composeData.content}
                      onChange={(e) => setComposeData(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowComposer(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!composeData.content.trim() || composeData.recipients.length === 0}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="text-xs">
                All
                {messages.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {messages.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Unread
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="text-xs">Sent</TabsTrigger>
              <TabsTrigger value="direct" className="text-xs">Direct</TabsTrigger>
              <TabsTrigger value="group" className="text-xs">Group</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-4">
              <ScrollArea className="h-[calc(100vh-400px)]">
                <div className="space-y-2">
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading messages...</div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <InboxIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <div className="text-lg font-medium mb-2">No messages</div>
                      <div className="text-sm">
                        {selectedTab === 'unread' ? 'All caught up!' : 'Your inbox is empty'}
                      </div>
                    </div>
                  ) : (
                    filteredMessages.map((message) => (
                      <Card 
                        key={message.id}
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                          selectedMessage?.id === message.id ? 'ring-2 ring-primary' : ''
                        } ${!message.is_read && message.user_id !== user?.id ? 'bg-blue-50 border-blue-200' : ''}`}
                        onClick={() => setSelectedMessage(message)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">
                                {getUserDisplayName(message.sender).substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {message.user_id === user?.id ? (
                                    <>To: {getUserDisplayName(message.recipient)}</>
                                  ) : (
                                    getUserDisplayName(message.sender)
                                  )}
                                </span>
                                
                                <div className="flex items-center gap-1">
                                  {message.message_type === 'group' && (
                                    <Users className="h-3 w-3 text-gray-400" />
                                  )}
                                  {message.priority !== 'normal' && (
                                    <Badge variant="outline" className={`text-xs ${getPriorityColor(message.priority)}`}>
                                      {message.priority}
                                    </Badge>
                                  )}
                                  {!message.is_read && message.user_id !== user?.id && (
                                    <Circle className="h-2 w-2 fill-blue-500 text-blue-500" />
                                  )}
                                </div>
                              </div>
                              
                              {message.subject && (
                                <div className="font-medium text-sm text-gray-900 mb-1">
                                  {message.subject}
                                </div>
                              )}
                              
                              <div className="text-sm text-gray-600 line-clamp-2">
                                {message.content}
                              </div>
                              
                              <div className="text-xs text-gray-400 mt-2">
                                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {selectedMessage.subject || 'No Subject'}
                    </CardTitle>
                    <CardDescription>
                      From: {getUserDisplayName(selectedMessage.sender)} • {' '}
                      {formatDistanceToNow(new Date(selectedMessage.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleMarkAsRead(selectedMessage.id)}>
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Mark as Read
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 mb-4">
                  <div className="whitespace-pre-wrap text-sm">
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
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleReply}
                        disabled={!replyContent.trim()}
                        size="sm"
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
              <div className="text-center text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium mb-2">Select a message</div>
                <div className="text-sm">Choose a message to read and reply</div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}