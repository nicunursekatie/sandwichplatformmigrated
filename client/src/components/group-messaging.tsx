
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMessageReads } from "@/hooks/useMessageReads";
import { Send, Edit, Trash2, MoreVertical, Users, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

// Define types locally to avoid import issues
interface Message {
  id: number;
  conversationId?: number;
  userId: string;
  sender?: string;
  content: string;
  createdAt: string;
  created_at?: string;
  timestamp?: string;
}

// Interface compatible with useMessageReads hook
interface MessageReadsCompatible {
  id: number;
  userId?: string;
  timestamp: string;
}

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

interface GroupConversationProps {
  groupId: number;
  groupName: string;
  groupDescription?: string;
  onBack: () => void;
  currentUser?: User;
}

export function GroupConversation({ groupId, groupName, groupDescription, onBack, currentUser }: GroupConversationProps) {
  const [newMessage, setNewMessage] = useState("");
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const { useAutoMarkAsRead } = useMessageReads();

  // Use the current user from auth if not provided as prop
  const effectiveCurrentUser = currentUser || user;

  // Fetch group members (participants)
  const { data: groupMembers = [], isLoading: participantsLoading, error: participantsError } = useQuery<Array<{
    userId: string;
    role: string;
    firstName: string;
    lastName: string;
    email: string;
  }>>({
    queryKey: ["/api/conversations", groupId, "participants"],
    queryFn: async () => {
      console.log(`[FRONTEND] Fetching participants for conversation ${groupId}`);
      const response = await fetch(`/api/conversations/${groupId}/participants`, {
        credentials: 'include'
      });
      console.log(`[FRONTEND] Participants response status: ${response.status}`);
      if (!response.ok) {
        console.error(`[FRONTEND] Failed to fetch participants: ${response.status}`);
        throw new Error(`Failed to fetch participants: ${response.status}`);
      }
      const data = await response.json();
      console.log(`[FRONTEND] Participants data:`, data);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!groupId,
    retry: 2,
    retryDelay: 1000,
  });

  // Debug logging for participants
  useEffect(() => {
    console.log(`[FRONTEND] Group members state:`, groupMembers);
    console.log(`[FRONTEND] Participants loading:`, participantsLoading);
    console.log(`[FRONTEND] Participants error:`, participantsError);
  }, [groupMembers, participantsLoading, participantsError]);

  // Fetch messages for group conversation
  const { data: messages = [], isLoading: messagesLoading, error: messagesError } = useQuery<Message[]>({
    queryKey: ["/api/conversations", groupId, "messages"],
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${groupId}/messages`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 3000,
    enabled: !!groupId,
    retry: 2,
    retryDelay: 1000,
  });

  const [optimisticMessages, setOptimisticMessages] = useState<Message[] | null>(null);
  const displayedMessages = optimisticMessages || messages;

  useEffect(() => {
    setOptimisticMessages(null);
    if (groupId) {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", groupId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", groupId, "participants"] });
    }
  }, [groupId, queryClient]);

  // Auto-mark group messages as read when viewing group
  const messagesForReads: MessageReadsCompatible[] = displayedMessages.map(msg => ({
    id: msg.id,
    userId: msg.userId,
    timestamp: msg.timestamp || msg.createdAt || msg.created_at || new Date().toISOString()
  }));
  useAutoMarkAsRead("groups", messagesForReads, true);

  // Helper functions for user display
  const getUserDisplayName = (userId: string) => {
    const userFound = groupMembers.find((u: any) => u.userId === userId);
    if (userFound) {
      if (userFound.firstName && userFound.lastName) {
        return `${userFound.firstName} ${userFound.lastName}`;
      }
      if (userFound.firstName) return userFound.firstName;
      if (userFound.email) return userFound.email.split('@')[0];
    }
    return 'Member';
  };

  const getUserInitials = (userId: string) => {
    const userFound = groupMembers.find((u: any) => u.userId === userId);
    if (userFound) {
      if (userFound.firstName && userFound.lastName) {
        return (userFound.firstName[0] + userFound.lastName[0]).toUpperCase();
      }
      if (userFound.firstName) {
        return userFound.firstName[0].toUpperCase();
      }
      if (userFound.email) {
        return userFound.email[0].toUpperCase();
      }
    }
    return 'M';
  };

  // Send message mutation  
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      return await apiRequest('POST', `/api/conversations/${groupId}/messages`, {
        content: data.content
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", groupId, "messages"] });
      setNewMessage("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number; content: string }) => {
      return await apiRequest('PATCH', `/api/messages/${messageId}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", groupId, "messages"] });
      setEditingMessage(null);
      setEditedContent("");
      toast({ title: "Message updated successfully!" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest('DELETE', `/api/messages/${messageId}`);
    },
    onMutate: async (messageId: number) => {
      setOptimisticMessages((prev) => {
        const base = prev || messages;
        return base.filter((m) => m.id !== messageId);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", groupId, "messages"] });
      setOptimisticMessages(null);
      toast({
        title: "Message deleted",
        description: "The message has been removed",
      });
    },
    onError: () => {
      setOptimisticMessages(null);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", groupId, "messages"] });
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      content: newMessage,
    });
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setEditedContent(message.content);
  };

  const handleSaveEdit = () => {
    if (!editingMessage || !editedContent.trim()) return;
    
    editMessageMutation.mutate({
      messageId: editingMessage.id,
      content: editedContent,
    });
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditedContent("");
  };

  const handleDeleteMessage = (messageId: number) => {
    if (confirm("Are you sure you want to delete this message?")) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  const canEditMessage = (message: Message) => {
    return message.userId === effectiveCurrentUser?.id;
  };

  // Show error states
  if (participantsError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-red-400" />
          <p className="text-red-500">Failed to load group members</p>
          <p className="text-sm text-gray-500 mt-1">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-red-400" />
          <p className="text-red-500">Failed to load messages</p>
          <p className="text-sm text-gray-500 mt-1">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  if (messagesLoading || participantsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Group header */}
      <div className="p-4 border-b bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                {groupName}
              </h3>
              {groupDescription && (
                <p className="text-sm text-gray-500">{groupDescription}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {groupMembers.length} members
                </Badge>
              </div>
              
              {/* Member List */}
              {groupMembers.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Members:</div>
                  <div className="flex flex-wrap gap-2">
                    {groupMembers.map((member) => (
                      <div key={member.userId} className="flex items-center gap-1.5 bg-white dark:bg-gray-600 px-2 py-1 rounded-md text-xs">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-xs">
                            {member.firstName?.[0] || member.email?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-gray-700 dark:text-gray-200">
                          {member.firstName && member.lastName 
                            ? `${member.firstName} ${member.lastName}`
                            : member.firstName || member.email?.split('@')[0] || 'Member'
                          }
                        </span>
                        {member.role && member.role !== 'member' && (
                          <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                            {member.role}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {displayedMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          ) : (
            displayedMessages.map((message) => (
              <div key={message.id} className="group relative">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {message.sender ? message.sender.charAt(0).toUpperCase() : getUserInitials(message.userId)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{message.sender || getUserDisplayName(message.userId)}</span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(message.createdAt || message.created_at || message.timestamp || ''), { addSuffix: true })}
                      </span>
                      {canEditMessage(message) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditMessage(message)}>
                              <Edit className="h-3 w-3 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteMessage(message.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {editingMessage?.id === message.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="text-sm"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={handleSaveEdit}
                            disabled={editMessageMutation.isPending}
                          >
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Message input */}
      <div className="p-4 border-t bg-white dark:bg-gray-800">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={sendMessageMutation.isPending}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Export the component with the correct name
export { GroupConversation as GroupMessaging };
