import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  id: number;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  message_type: string;
}

interface Host {
  id: number;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
}

export default function HostChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch hosts
  const { data: hosts = [], isLoading: hostsLoading } = useQuery<Host[]>({
    queryKey: ["hosts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hosts')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching hosts:', error);
        return [];
      }
      
      return data || [];
    }
  });

  // Fetch messages for selected host
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["host-chat", selectedHost?.id],
    queryFn: async () => {
      if (!selectedHost?.id) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('message_type', 'host_chat')
        .eq('context_id', selectedHost.id.toString())
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!selectedHost?.id
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedHost?.id || !user?.id) throw new Error("No host selected");
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          sender_name: `${user.firstName || user.email?.split('@')[0] || 'User'} ${user.lastName || ''}`,
          content: content,
          message_type: 'host_chat',
          context_id: selectedHost.id.toString(),
          context_type: 'host'
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["host-chat", selectedHost?.id] });
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
    if (!message.trim() || !selectedHost) return;
    
    sendMessageMutation.mutate(message);
  };

  const handleHostSelect = (host: Host) => {
    setSelectedHost(host);
  };

  useEffect(() => {
    if (hosts.length > 0 && !selectedHost) {
      setSelectedHost(hosts[0]);
    }
  }, [hosts, selectedHost]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (hostsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading hosts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Hosts List */}
      <div className="w-1/3 border-r border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Host Chat
          </CardTitle>
        </CardHeader>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-2">
            {hosts.map((host) => (
              <div
                key={host.id}
                onClick={() => handleHostSelect(host)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedHost?.id === host.id
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-50"
                }`}
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback>
                    {host.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{host.name}</p>
                  <p className="text-xs text-gray-500 truncate">{host.contact_name}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col">
        {selectedHost ? (
          <>
            {/* Header */}
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    {selectedHost.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{selectedHost.name}</CardTitle>
                  <p className="text-sm text-gray-500">{selectedHost.contact_name}</p>
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
                      <p className="text-sm font-medium mb-1">{msg.sender_name}</p>
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
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a host to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}