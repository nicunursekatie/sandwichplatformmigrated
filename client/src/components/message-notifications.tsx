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

import { useMessaging } from "@/hooks/useMessaging";

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

  const [lastCheck, setLastCheck] = useState(Date.now());
  const userId = useMemo(() => user?.id || null, [user?.id]);
  const isUserStable = useMemo(() => {
    return user !== undefined; // user can be null (not authenticated) or object (authenticated), but not undefined
  }, [user]);

  // Use the messaging hook for unread counts and messages
  const { unreadCounts, unreadMessages, totalUnread, isConnected } = useMessaging();

  // Only render if user state is stable
  if (!isUserStable) {
    console.log('🔔 User state not stable, not rendering MessageNotifications');
    return null;
  }

  // Don't render for unauthenticated users
  if (!userId) {
    console.log('🔔 No authenticated user, not rendering MessageNotifications');
    return null;
  }

  const handleMarkAllAsRead = () => {
    // The useMessaging hook doesn't expose markAllAsRead here, but we could add it
    console.log('Mark all as read clicked');
    setLastCheck(Date.now());
  };

  const getChannelDisplayName = (channel: string) => {
    switch (channel) {
      case 'general': return 'General Chat';
      case 'committee': return 'Committee';
      case 'hosts': return 'Host Chat';
      case 'drivers': return 'Driver Chat';
      case 'recipients': return 'Recipient Chat';
      case 'core_team': return 'Core Team';
      case 'direct': return 'Direct Messages';
      case 'groups': return 'Group Messages';
      default: return channel;
    }
  };

  const renderNotificationItem = (channel: string, count: number) => {
    if (count === 0) return null;
    
    return (
      <DropdownMenuItem key={channel}>
        <div className="flex items-center justify-between w-full">
          <span className="text-sm">{getChannelDisplayName(channel)}</span>
          <Badge variant="destructive" className="ml-2 text-xs">
            {count > 99 ? '99+' : count}
          </Badge>
        </div>
      </DropdownMenuItem>
    );
  };

  // Early return if no unread messages
  if (totalUnread === 0) {
    return (
      <div className="relative">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MessageCircle className="h-4 w-4" />
        </Button>
        {!isConnected && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
            <MessageCircle className="h-4 w-4" />
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
        
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Message Notifications</span>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-500">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          {/* Chat Channel Notifications */}
          {unreadCounts && Object.entries(unreadCounts).map(([channel, count]) => {
            if (channel === 'total' || typeof count !== 'number') return null;
            return renderNotificationItem(channel, count);
          })}
          
          {totalUnread === 0 && (
            <DropdownMenuItem disabled>
              <span className="text-sm text-gray-500">All caught up! 🎉</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleMarkAllAsRead}>
            <Bell className="w-4 h-4 mr-2" />
            Mark all as read
          </DropdownMenuItem>
          
          {/* Recent Messages Preview */}
          {unreadMessages && unreadMessages.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-gray-500">
                Recent Messages
              </DropdownMenuLabel>
              {unreadMessages.slice(0, 3).map((message: any) => (
                <DropdownMenuItem key={message.id} className="flex-col items-start">
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium text-xs">
                      {message.sender?.first_name} {message.sender?.last_name}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {message.conversations?.name && `#${message.conversations.name}`}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600 truncate w-full">
                    {message.content}
                  </span>
                </DropdownMenuItem>
              ))}
              {unreadMessages.length > 3 && (
                <DropdownMenuItem disabled>
                  <span className="text-xs text-gray-500">
                    +{unreadMessages.length - 3} more messages
                  </span>
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export default MessageNotifications;