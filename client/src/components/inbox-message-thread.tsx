import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCheck, Circle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ThreadedMessage } from "@/lib/message-threads";

interface InboxMessageThreadProps {
  thread: ThreadedMessage;
  selectedMessageId: number | null;
  onSelectMessage: (message: ThreadedMessage) => void;
  getUserDisplayName: (user: any) => string;
  currentUserId: string;
}

export function InboxMessageThread({
  thread,
  selectedMessageId,
  onSelectMessage,
  getUserDisplayName,
  currentUserId,
}: InboxMessageThreadProps) {
  // Get the most recent message in the thread for preview
  const getMostRecentMessage = (thread: ThreadedMessage): ThreadedMessage => {
    if (thread.replies.length === 0) return thread;
    
    // Find the most recent reply recursively
    let mostRecent = thread;
    const checkReplies = (msg: ThreadedMessage) => {
      if (new Date(msg.created_at) > new Date(mostRecent.created_at)) {
        mostRecent = msg;
      }
      msg.replies.forEach(checkReplies);
    };
    
    thread.replies.forEach(checkReplies);
    return mostRecent;
  };

  // Count total messages in thread
  const countThreadMessages = (thread: ThreadedMessage): number => {
    let count = 1;
    thread.replies.forEach(reply => {
      count += countThreadMessages(reply);
    });
    return count;
  };

  // Check if any message in thread is unread
  const hasUnreadInThread = (thread: ThreadedMessage): boolean => {
    if (!thread.is_read && !thread.is_sent_by_user) return true;
    return thread.replies.some(reply => hasUnreadInThread(reply));
  };

  const mostRecentMessage = getMostRecentMessage(thread);
  const threadCount = countThreadMessages(thread);
  const hasUnread = hasUnreadInThread(thread);
  const isSelected = selectedMessageId === thread.id || 
    thread.replies.some(r => r.id === selectedMessageId);

  return (
    <Card 
      className={`p-4 cursor-pointer transition-colors ${
        isSelected ? 'bg-accent' : 'hover:bg-accent/50'
      } ${hasUnread ? 'border-primary' : ''}`}
      onClick={() => onSelectMessage(thread)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`mt-1 ${hasUnread ? 'text-primary' : 'text-muted-foreground'}`}>
            {hasUnread ? (
              <Circle className="h-4 w-4 fill-current" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-medium text-sm ${
                hasUnread ? 'font-semibold' : ''
              }`}>
                {thread.is_sent_by_user ? (
                  <>To: {getUserDisplayName(thread.recipient)}</>
                ) : (
                  getUserDisplayName(thread.sender)
                )}
              </span>
              {threadCount > 1 && (
                <Badge variant="secondary" className="text-xs">
                  {threadCount} messages
                </Badge>
              )}
            </div>
            
            {thread.subject && (
              <div className={`text-sm mb-1 ${hasUnread ? 'font-semibold' : ''}`}>
                {thread.subject}
              </div>
            )}
            
            <div className={`text-sm truncate ${
              hasUnread ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {mostRecentMessage.content}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2 ml-4">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(mostRecentMessage.created_at), { 
              addSuffix: true 
            })}
          </span>
          
          {thread.priority && thread.priority !== 'normal' && (
            <Badge 
              variant={thread.priority === 'high' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {thread.priority}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}