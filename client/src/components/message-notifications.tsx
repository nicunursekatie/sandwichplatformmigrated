import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

import { supabase } from '@/lib/supabase';

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

interface MessageNotificationsProps {
  user: any; // User object passed from parent Dashboard
}

export default function MessageNotifications({ user }: MessageNotificationsProps) {
  console.log('🔔 MessageNotifications component mounting...');

  // Always call hooks with stable values to prevent hook order changes
  const [lastCheck, setLastCheck] = useState(Date.now());

  // Use a stable query key that doesn't change based on user state
  const { data: unreadCounts, refetch, error, isLoading } = useQuery<UnreadCounts>({
    queryKey: ['/api/message-notifications/unread-counts', user?.id || 'no-user'],
    enabled: !!user?.id, // Only enable when we have a user ID
    refetchInterval: !!user?.id ? 30000 : false, // Check every 30 seconds only when authenticated
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Listen for WebSocket notifications (to be implemented)
  useEffect(() => {
    console.log('🔔 WebSocket useEffect triggered, user=', user);
    if (!user) {
      console.log('🔔 WebSocket setup skipped - no user');
      return;
    }

    console.log('🔔 Setting up WebSocket for user:', (user as any)?.id);

    // Declare variables in outer scope for cleanup
    let socket: WebSocket | null = null;
    let reconnectTimeoutId: NodeJS.Timeout | null = null;

    // Set up WebSocket connection for real-time notifications
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    // Fix for Replit environment - use the current hostname and port
    let host = window.location.host;
    console.log('🔔 Debug - window.location.host:', window.location.host);
    console.log('🔔 Debug - window.location.hostname:', window.location.hostname);
    console.log('🔔 Debug - window.location.port:', window.location.port);

    if (!host || host === 'localhost:undefined') {
      // Fallback for Replit environment
      host = window.location.hostname + (window.location.port ? `:${window.location.port}` : '');
      console.log('🔔 Debug - Using fallback host:', host);
    }

    const wsUrl = `${protocol}//${host}/notifications`;
    console.log('Connecting to WebSocket:', wsUrl);

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('Notification WebSocket connected successfully');
        console.log('User ID:', (user as any)?.id);
        // Send user identification
        if (socket) {
          socket.send(JSON.stringify({
            type: 'identify',
            userId: (user as any)?.id
          }));
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Don't log the full error object to avoid console spam
        console.log('WebSocket connection failed - will retry');
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed, code:', event.code);
        // Only attempt reconnection if not a normal closure
        if (event.code !== 1000) {
          reconnectTimeoutId = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            // The cleanup function will trigger re-initialization
          }, 5000);
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          if (data.type === 'new_message') {
            console.log('Processing new_message notification');
            // Refetch unread counts when new message arrives
            refetch();

            // Show browser notification if permission granted and available
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              console.log('Showing browser notification');
              new Notification(`New message in ${data.committee}`, {
                body: `${data.sender}: ${data.content.substring(0, 100)}...`,
                icon: '/favicon.ico'
              });
            } else {
              console.log('Browser notifications not available or not granted');
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      // Still allow component to function without real-time updates
    }

    return () => {
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
      }
      if (socket) {
        socket.close(1000, 'Component unmounting');
      }
    };
  }, [user, refetch]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  console.log('🔔 MessageNotifications: user=', (user as any)?.id, 'isAuthenticated=', !!user);
  console.log('🔔 MessageNotifications: user object=', user);

  // Calculate final unread counts - handle all cases
  const finalUnreadCounts = unreadCounts || {
    general: 0, committee: 0, hosts: 0, drivers: 0, recipients: 0,
    core_team: 0, direct: 0, groups: 0, total: 0
  };

  const totalUnread = finalUnreadCounts.total || 0;

  console.log('🔔 MessageNotifications: Query state - isLoading:', isLoading, 'error:', error, 'data:', unreadCounts);
  console.log('🔔 MessageNotifications: Rendering with final unread counts:', finalUnreadCounts);

  // Early return if user is not authenticated - this is now safe after all hooks
  if (!user) {
    console.log('🔔 MessageNotifications: Early return - not authenticated or no user');
    return null;
  }

  // Show loading state
  if (isLoading) {
    console.log('🔔 MessageNotifications: Loading unread counts...');
    return null; // Could show a loading spinner here
  }

  // Show error state
  if (error) {
    console.error('🔔 MessageNotifications: Error loading unread counts:', error);
    return null; // Could show error state here
  }

  const handleMarkAllRead = async () => {
    try {
      await supabase.from('message_reads').insert({ user_id: user.id, read_at: new Date().toISOString() });
      refetch();
    } catch (error) {
      console.error('Failed to mark all messages as read:', error);
    }
  };

  const getChatDisplayName = (committee: string) => {
    const names = {
      general: 'General Chat',
      committee: 'Committee Chat',
      hosts: 'Host Chat',
      drivers: 'Driver Chat',
      recipients: 'Recipient Chat',
      core_team: 'Core Team',
      direct: 'Direct Messages',
      groups: 'Group Messages'
    };
    return names[committee as keyof typeof names] || committee;
  };

  const navigateToChat = () => {
    // Navigate to the appropriate chat page - all chat types go to messages
    window.location.href = '/messages';
  };

  console.log('🔔 MessageNotifications rendering with totalUnread:', totalUnread);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {/* Debug indicator - green dot shows component is mounted */}
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full" title="Notifications Active"></div>
          {totalUnread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="font-semibold">
          <div className="flex items-center justify-between">
            <span>Message Notifications</span>
            {totalUnread > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleMarkAllRead}
                className="text-xs h-6 px-2"
              >
                Mark all read
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {totalUnread === 0 ? (
          <DropdownMenuItem className="text-muted-foreground">
            No unread messages
          </DropdownMenuItem>
        ) : (
          Object.entries(finalUnreadCounts)
            .filter(([key, count]) => key !== 'total' && (count as number) > 0)
            .map(([committee, count]) => (
              <DropdownMenuItem 
                key={committee}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => navigateToChat()}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>{getChatDisplayName(committee)}</span>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {count}
                </Badge>
              </DropdownMenuItem>
            ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}