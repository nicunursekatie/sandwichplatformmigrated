import { useEffect, useRef, useState } from 'react';
import { ably, subscribeToChannel, publishMessage } from '@/lib/ably';

interface UseAblyOptions {
  channelName: string;
  eventName?: string;
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useAbly({
  channelName,
  eventName = 'message',
  onMessage,
  onError,
  onConnected,
  onDisconnected
}: UseAblyOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Subscribe to messages
  useEffect(() => {
    if (!channelName) return;

    try {
      const unsubscribe = subscribeToChannel(channelName, eventName, (message) => {
        setLastMessage(message);
        onMessage?.(message);
      });

      unsubscribeRef.current = unsubscribe;

      return () => {
        unsubscribe();
        unsubscribeRef.current = null;
      };
    } catch (error) {
      onError?.(error);
    }
  }, [channelName, eventName, onMessage, onError]);

  // Listen for connection state changes
  useEffect(() => {
    const handleConnectionStateChange = (stateChange: any) => {
      const { current, previous } = stateChange;
      
      if (current === 'connected' && previous !== 'connected') {
        setIsConnected(true);
        onConnected?.();
      } else if (current === 'disconnected' || current === 'failed') {
        setIsConnected(false);
        onDisconnected?.();
      }
    };

    ably.connection.on('connected', handleConnectionStateChange);
    ably.connection.on('disconnected', handleConnectionStateChange);
    ably.connection.on('failed', handleConnectionStateChange);

    // Set initial state
    setIsConnected(ably.connection.state === 'connected');

    return () => {
      ably.connection.off('connected', handleConnectionStateChange);
      ably.connection.off('disconnected', handleConnectionStateChange);
      ably.connection.off('failed', handleConnectionStateChange);
    };
  }, [onConnected, onDisconnected]);

  // Send message function
  const sendMessage = async (data: any) => {
    try {
      await publishMessage(channelName, eventName, data);
    } catch (error) {
      onError?.(error);
      throw error;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connection: ably.connection
  };
}

// Hook for simple message publishing
export function useAblyPublish(channelName: string, eventName: string = 'message') {
  const sendMessage = async (data: any) => {
    try {
      await publishMessage(channelName, eventName, data);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  return { sendMessage };
}

// Hook for simple message subscription
export function useAblySubscribe(
  channelName: string, 
  eventName: string = 'message',
  onMessage?: (message: any) => void
) {
  const [lastMessage, setLastMessage] = useState<any>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!channelName) return;

    const unsubscribe = subscribeToChannel(channelName, eventName, (message) => {
      setLastMessage(message);
      onMessage?.(message);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [channelName, eventName, onMessage]);

  return { lastMessage };
} 