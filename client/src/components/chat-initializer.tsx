import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { initializeChatChannels } from '@/lib/initialize-chat-channels';

export function ChatInitializer() {
  const { user } = useAuth();

  useEffect(() => {
    // Only initialize channels if user is authenticated
    if (user) {
      initializeChatChannels().then(result => {
        if (result.error) {
          console.error('Failed to initialize chat channels:', result.error);
        } else if (result.created && result.created > 0) {
          console.log(`Initialized ${result.created} chat channels`);
        }
      });
    }
  }, [user]);

  // This component doesn't render anything
  return null;
}