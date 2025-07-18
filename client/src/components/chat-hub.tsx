import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ChatChannel from "@/components/chat-channel";
import { useAuth } from "@/hooks/useAuth";
import { useMessaging } from "@/hooks/useMessaging";
import { hasPermission, USER_ROLES, PERMISSIONS } from "@shared/auth-utils";
import {
  MessageSquare,
  Users,
  Building2,
  Truck,
  Heart,
  Shield,
  Hash,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ChatChannel {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  badge?: string;
  color: string;
  permission: string;
}

export default function ChatHub() {
  const { user } = useAuth();
  const { unreadCounts, isConnected } = useMessaging();
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Define available chat channels based on user permissions
  const allChannels: ChatChannel[] = [
    {
      value: "general",
      label: "General Chat",
      description: "Open discussion for all team members",
      icon: <MessageSquare className="h-4 w-4" />,
      component: (
        <ChatChannel 
          channelName="general" 
          channelType="general"
          placeholder="Share with the team..."
        />
      ),
      color: "bg-primary/10 text-primary",
      permission: PERMISSIONS.GENERAL_CHAT,
    },
    {
      value: "committee",
      label: "Committee Chat",
      description: "Specific committee discussions",
      icon: <Users className="h-4 w-4" />,
      component: (
        <ChatChannel 
          channelName="committee" 
          channelType="committee"
          placeholder="Discuss committee matters..."
        />
      ),
      color: "bg-blue-100 text-blue-800",
      permission: PERMISSIONS.COMMITTEE_CHAT,
    },
    {
      value: "hosts",
      label: "Host Chat",
      description: "Coordination with sandwich collection hosts",
      icon: <Building2 className="h-4 w-4" />,
      component: (
        <ChatChannel 
          channelName="hosts" 
          channelType="hosts"
          placeholder="Coordinate with hosts..."
        />
      ),
      color: "bg-green-100 text-green-800",
      permission: PERMISSIONS.HOST_CHAT,
    },
    {
      value: "drivers",
      label: "Driver Chat",
      description: "Delivery and transportation coordination",
      icon: <Truck className="h-4 w-4" />,
      component: (
        <ChatChannel 
          channelName="drivers" 
          channelType="drivers"
          placeholder="Coordinate deliveries..."
        />
      ),
      color: "bg-orange-100 text-orange-800",
      permission: PERMISSIONS.DRIVER_CHAT,
    },
    {
      value: "recipients",
      label: "Recipient Chat",
      description: "Communication with receiving organizations",
      icon: <Heart className="h-4 w-4" />,
      component: (
        <ChatChannel 
          channelName="recipients" 
          channelType="recipients"
          placeholder="Connect with recipients..."
        />
      ),
      color: "bg-purple-100 text-purple-800",
      permission: PERMISSIONS.RECIPIENT_CHAT,
    },
    {
      value: "core_team",
      label: "Core Team",
      description: "Private administrative discussions",
      icon: <Shield className="h-4 w-4" />,
      component: (
        <ChatChannel 
          channelName="core_team" 
          channelType="core_team"
          placeholder="Admin discussions..."
        />
      ),
      badge: "Admin",
      color: "bg-amber-100 text-amber-800",
      permission: PERMISSIONS.CORE_TEAM_CHAT,
    },
  ];

  // Filter channels based on user permissions
  const availableChannels = allChannels.filter(channel => 
    hasPermission(user, channel.permission)
  );

  // Auto-select first channel if none selected
  useEffect(() => {
    if (!activeChannel && availableChannels.length > 0) {
      setActiveChannel(availableChannels[0].value);
    }
  }, [activeChannel, availableChannels]);

  const renderActiveChannel = () => {
    if (!activeChannel) return null;
    const channel = availableChannels.find((ch) => ch.value === activeChannel);
    return channel?.component;
  };

  const getUnreadCount = (channelValue: string) => {
    return unreadCounts?.[channelValue as keyof typeof unreadCounts] || 0;
  };

  if (availableChannels.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-main-heading text-primary">
              Team Communication
            </h1>
            <p className="text-sm sm:text-base font-body text-muted-foreground">
              Stay connected with your team and committees
            </p>
          </div>
        </div>
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              No Chat Channels Available
            </p>
            <p className="text-sm">
              You don't have access to any chat channels yet.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-main-heading text-primary">
            Team Communication
          </h1>
          <p className="text-sm sm:text-base font-body text-muted-foreground">
            Real-time chat channels for team coordination
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex h-[calc(100vh-250px)] gap-4">
        {/* Sidebar with Channel List */}
        <div
          className={`${sidebarCollapsed ? "w-16" : "w-80"} transition-all duration-300 flex-shrink-0`}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                {!sidebarCollapsed && (
                  <div>
                    <CardTitle className="text-lg font-sub-heading flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Channels
                    </CardTitle>
                    <p className="text-xs font-body text-muted-foreground">
                      Select a channel to join
                    </p>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="h-8 w-8 p-0"
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-350px)]">
              {availableChannels.map((channel) => {
                const unreadCount = getUnreadCount(channel.value);
                
                return (
                  <Button
                    key={channel.value}
                    variant={activeChannel === channel.value ? "default" : "ghost"}
                    className={`w-full justify-start h-auto p-3 ${sidebarCollapsed ? "px-2 min-h-[50px]" : "min-h-[70px]"}`}
                    onClick={() => setActiveChannel(channel.value)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className={`p-2 rounded-md ${channel.color}`}>
                        {channel.icon}
                      </div>
                      {!sidebarCollapsed && (
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {channel.label}
                            </span>
                            {channel.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {channel.badge}
                              </Badge>
                            )}
                            {unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs min-w-[1.5rem] h-5">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {channel.description}
                          </p>
                        </div>
                      )}
                      {sidebarCollapsed && unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs min-w-[1.2rem] h-4 absolute top-1 right-1">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                      )}
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1">
          <Card className="h-full">
            <CardContent className="p-0 h-full">
              {renderActiveChannel()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
