import React, { useState, useEffect, useMemo, memo } from "react";
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

const MessageNotifications = memo(function MessageNotifications({ user }: MessageNotificationsProps) {
  console.log('🔔 MessageNotifications component mounting...');

  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL LOGIC
  const [lastCheck, setLastCheck] = useState(Date.now());

  // Memoize user ID to prevent unnecessary re-renders
  const userId = useMemo(() => user?.id || null, [user?.id]);
  
  // Early stability check - prevent rendering during user transitions
  const isUserStable = useMemo(() => {
    return user !== undefined; // user can be null (not authenticated) or object (authenticated), but not undefined
  }, [user]);

  // Use a stable query key that doesn't change based on user state
  const { data: unreadCounts, refetch, error, isLoading } = useQuery<UnreadCounts>({
    queryKey: ['message-notifications-unread-counts', userId || 'no-user'],
    queryFn: async () => {
      if (!userId) {
        return {
          general: 0,
          committee: 0,
          hosts: 0,
          drivers: 0,
          recipients: 0,
          core_team: 0,
          direct: 0,
          groups: 0,
          total: 0
        };
      }
      
      // For now, return empty counts until we implement proper message counting
      // TODO: Implement proper unread message counting based on conversation types
      return {
        general: 0,
        committee: 0,
        hosts: 0,
        drivers: 0,
        recipients: 0,
        core_team: 0,
        direct: 0,
        groups: 0,
        total: 0
      };
    },
    enabled: !!userId, // Only enable when we have a user ID
    refetchInterval: !!userId ? 30000 : false, // Check every 30 seconds only when authenticated
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Request notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  console.log('🔔 MessageNotifications: userId=', userId, 'isAuthenticated=', !!userId);
  console.log('🔔 MessageNotifications: user object=', user);

  // Calculate final unread counts - handle all cases
  const finalUnreadCounts = unreadCounts || {
    general: 0, committee: 0, hosts: 0, drivers: 0, recipients: 0,
    core_team: 0, direct: 0, groups: 0, total: 0
  };

  const totalUnread = finalUnreadCounts.total || 0;

  console.log('🔔 MessageNotifications: Query state - isLoading:', isLoading, 'error:', error, 'data:', unreadCounts);
  console.log('🔔 MessageNotifications: Rendering with final unread counts:', finalUnreadCounts);

  const handleMarkAllRead = async () => {
    try {
      await supabase.from('message_reads').insert({ user_id: userId, read_at: new Date().toISOString() });
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

  // Check for stable user state first
  if (!isUserStable) {
    console.log('🔔 MessageNotifications: User state unstable, not rendering');
    return null;
  }

  // NOW we can safely return early after all hooks have been called
  if (!userId) {
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
});

export default MessageNotifications;