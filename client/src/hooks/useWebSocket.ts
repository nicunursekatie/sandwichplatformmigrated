import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useAbly } from './useAbly';

interface WebSocketMessage {
  type: 'message' | 'notification' | 'error' | 'pong';
  data?: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  channelName?: string;
}

/**
 * WebSocket hook that uses Ably for real-time communication
 * This replaces the old WebSocket implementation with Ably
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { user } = useAuth();
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    channelName = 'default'
  } = options;

  // Use Ably for real-time communication
  const { isConnected, sendMessage: sendAblyMessage } = useAbly({
    channelName: user?.id ? `user-${user.id}-${channelName}` : `guest-${channelName}`,
    eventName: 'message',
    onMessage: (message) => {
      try {
        // Convert Ably message to WebSocketMessage format
        const wsMessage: WebSocketMessage = {
          type: message.data?.type || 'message',
          data: message.data
        };
        onMessage?.(wsMessage);
      } catch (error) {
        console.error('❌ Error processing Ably message:', error);
      }
    },
    onConnected: onConnect,
    onDisconnected: onDisconnect,
    onError
  });

  const sendMessage = useCallback((message: any) => {
    if (isConnected) {
      return sendAblyMessage(message);
    } else {
      console.warn('⚠️ Ably not connected, cannot send message');
      return false;
    }
  }, [isConnected, sendAblyMessage]);

  const sendChatMessage = useCallback((conversationId: number, content: string) => {
    return sendMessage({
      type: 'message',
      conversationId,
      content
    });
  }, [sendMessage]);

  const ping = useCallback(() => {
    return sendMessage({
      type: 'ping'
    });
  }, [sendMessage]);

  // For compatibility with existing code
  const connect = useCallback(() => {
    console.log('🔌 WebSocket connect called - Ably handles connection automatically');
  }, []);

  const disconnect = useCallback(() => {
    console.log('🔌 WebSocket disconnect called - Ably handles disconnection automatically');
  }, []);

  return {
    isConnected,
    isConnecting: false, // Ably handles this internally
    connect,
    disconnect,
    sendMessage,
    sendChatMessage,
    ping
  };
}