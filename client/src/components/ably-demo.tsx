import React, { useState } from 'react';
import { useAbly } from '@/hooks/useAbly';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Wifi, WifiOff } from 'lucide-react';

export function AblyDemo() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; content: string; timestamp: string; sender: string }>>([]);

  const { isConnected, sendMessage, lastMessage } = useAbly({
    channelName: 'demo-chat',
    eventName: 'message',
    onMessage: (message: any) => {
      console.log('Demo: Received message:', message);
      if (message.data) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: message.data.content,
          timestamp: message.data.timestamp,
          sender: message.data.sender || 'Unknown'
        }]);
      }
    },
    onConnected: () => {
      console.log('Demo: Ably connected');
    },
    onDisconnected: () => {
      console.log('Demo: Ably disconnected');
    },
    onError: (error) => {
      console.error('Demo: Ably error:', error);
    }
  });

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      await sendMessage({
        content: message,
        timestamp: new Date().toISOString(),
        sender: 'Demo User'
      });
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Ably Real-Time Demo
          <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-1">
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Test real-time messaging with Ably. Open multiple browser tabs to see messages sync in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <div className="h-64 overflow-y-auto border rounded-lg p-3 space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 text-sm">
              No messages yet. Send a message to get started!
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="bg-gray-50 rounded-lg p-2">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-sm">{msg.sender}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm mt-1">{msg.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!isConnected}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!isConnected || !message.trim()}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Messages are sent in real-time via Ably</p>
          <p>• Open multiple browser tabs to test</p>
          <p>• Messages persist only during this session</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default AblyDemo; 