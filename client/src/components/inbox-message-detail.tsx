import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Reply, Send, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ThreadedMessage } from "@/lib/message-threads";

interface InboxMessageDetailProps {
  thread: ThreadedMessage;
  replyContent: string;
  onReplyContentChange: (content: string) => void;
  onReply: () => void;
  onMarkAsRead: (messageId: number) => void;
  getUserDisplayName: (user: any) => string;
  currentUserId: string;
}

export function InboxMessageDetail({
  thread,
  replyContent,
  onReplyContentChange,
  onReply,
  onMarkAsRead,
  getUserDisplayName,
  currentUserId,
}: InboxMessageDetailProps) {
  // Get all messages in thread for display
  const getAllMessagesInThread = (msg: ThreadedMessage): ThreadedMessage[] => {
    const messages: ThreadedMessage[] = [msg];
    msg.replies.forEach(reply => {
      messages.push(...getAllMessagesInThread(reply));
    });
    return messages;
  };

  const allMessages = getAllMessagesInThread(thread);

  // Mark unread messages as read when viewing
  React.useEffect(() => {
    allMessages.forEach(msg => {
      if (!msg.is_read && !msg.is_sent_by_user && msg.user_id !== currentUserId) {
        onMarkAsRead(msg.id);
      }
    });
  }, [thread.id]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {thread.subject || 'No Subject'}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>
                From: {getUserDisplayName(thread.sender)} • {' '}
                {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          {thread.priority && thread.priority !== 'normal' && (
            <Badge 
              variant={thread.priority === 'high' ? 'destructive' : 'secondary'}
            >
              {thread.priority}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Thread Messages */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {allMessages.map((msg, index) => {
              const isReply = msg.id !== thread.id;
              const depth = getMessageDepth(thread, msg);
              
              return (
                <div 
                  key={msg.id} 
                  className={`${isReply ? `ml-${Math.min(depth * 8, 24)}` : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {getUserDisplayName(msg.sender || msg).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {getUserDisplayName(msg.sender || msg)}
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
                      
                      <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                  
                  {index < allMessages.length - 1 && (
                    <div className="border-l-2 border-gray-200 ml-4 h-4" />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Reply Area */}
        <div className="border-t p-6 space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Type your reply..."
              value={replyContent}
              onChange={(e) => onReplyContentChange(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button 
                onClick={onReply}
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
  );
}

// Helper function to calculate message depth in thread
function getMessageDepth(root: ThreadedMessage, target: ThreadedMessage, currentDepth = 0): number {
  if (root.id === target.id) return currentDepth;
  
  for (const reply of root.replies) {
    const depth = getMessageDepth(reply, target, currentDepth + 1);
    if (depth >= 0) return depth;
  }
  
  return -1;
}