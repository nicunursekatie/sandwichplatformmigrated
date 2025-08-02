import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Reply, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ThreadedMessage } from "@/lib/message-threads";

interface MessageThreadProps {
  message: ThreadedMessage;
  currentUserId: string;
  onReply: (message: ThreadedMessage) => void;
  depth?: number;
  maxDepth?: number;
}

export function MessageThread({ 
  message, 
  currentUserId, 
  onReply,
  depth = 0,
  maxDepth = 3
}: MessageThreadProps) {
  const isOwnMessage = message.user_id === currentUserId;
  
  const getUserDisplayName = (msg: ThreadedMessage) => {
    if (msg.sender?.first_name || msg.sender?.last_name) {
      return `${msg.sender.first_name || ''} ${msg.sender.last_name || ''}`.trim();
    }
    return msg.sender?.email || msg.user_id;
  };

  const renderMessage = (msg: ThreadedMessage, isReply: boolean = false) => (
    <div className={`flex items-start gap-3 ${isReply ? 'ml-12' : ''}`}>
      <Avatar className="w-8 h-8 mt-1">
        <AvatarFallback className="text-xs">
          🥪
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {getUserDisplayName(msg)}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
          </span>
          {isReply && (
            <Badge variant="secondary" className="text-xs">
              Reply
            </Badge>
          )}
        </div>
        
        <div className="text-sm text-gray-900 whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onReply(msg)}>
            <Reply className="w-4 h-4 mr-2" />
            Reply
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="group">
      {/* Main message */}
      {renderMessage(message)}
      
      {/* Replies */}
      {message.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {depth < maxDepth ? (
            // Render nested replies if within depth limit
            message.replies.map((reply) => (
              <div key={reply.id} className="border-l-2 border-gray-200 pl-4 ml-8">
                <MessageThread
                  message={reply}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                />
              </div>
            ))
          ) : (
            // Show collapsed view if depth limit exceeded
            <div className="ml-12 text-sm text-gray-500">
              {message.replies.length} more {message.replies.length === 1 ? 'reply' : 'replies'}...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Add missing Badge import
import { Badge } from "@/components/ui/badge";