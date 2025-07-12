import Ably from 'ably';

// Initialize Ably with your public API key
// Note: This is safe to expose in the frontend as it's a public key
const ABLY_API_KEY = 'v-FMfQ.YTK-CA:jTuPILLEpB6v7mBs0ExKSttUhXeRwiwZQNbgTOSeizI';

export const ably = new Ably.Realtime({
  key: ABLY_API_KEY,
  clientId: `user-${Date.now()}`, // You can set this to the actual user ID when available
});

// Helper function to get a channel
export const getChannel = (channelName: string) => {
  return ably.channels.get(channelName);
};

// Helper function to publish a message
export const publishMessage = async (channelName: string, eventName: string, data: any) => {
  const channel = getChannel(channelName);
  await channel.publish(eventName, data);
};

// Helper function to subscribe to a channel
export const subscribeToChannel = (
  channelName: string, 
  eventName: string, 
  callback: (message: any) => void
) => {
  const channel = getChannel(channelName);
  const subscription = channel.subscribe(eventName, callback);
  
  // Return unsubscribe function
  return () => {
    channel.unsubscribe(eventName, callback);
  };
};

// Set client ID when user is authenticated
export const setClientId = (userId: string) => {
  ably.auth.clientId = userId;
};

export default ably; 