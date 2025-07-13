import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";

interface Message {
  id: number;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function DirectMessaging() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch users
  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
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

  // Fetch messages for selected user
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["messages", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id || !user?.id) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!selectedUser?.id && !!user?.id
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedUser?.id || !user?.id) throw new Error("No user selected");
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: selectedUser.id,
          content: content,
          message_type: 'direct'
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedUser?.id] });
      setMessage("");
      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser) return;
    
    sendMessageMutation.mutate(message);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  useEffect(() => {
    if (allUsers.length > 0 && !selectedUser) {
      setSelectedUser(allUsers[0]);
    }
  }, [allUsers, selectedUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Users List */}
      <div className="w-1/3 border-r border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Direct Messages
          </CardTitle>
        </CardHeader>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-2">
            {allUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedUser?.id === user.id
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-50"
                }`}
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback>
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Header */}
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </CardTitle>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender_id === user?.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_id === user?.id ? "text-blue-100" : "text-gray-500"
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {messagesLoading && (
                  <div className="text-center text-gray-500">
                    Loading messages...
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sendMessageMutation.isPending}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a user to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}