export interface ThreadedMessage {
  id: number;
  content: string;
  user_id: string;
  created_at: string;
  reply_to_id?: number;
  sender?: any;
  recipient?: any;
  replies: ThreadedMessage[];
  [key: string]: any;
}

/**
 * Groups messages into threaded conversations
 * @param messages - Array of messages with optional reply_to_id
 * @returns Array of root messages with nested replies
 */
export function groupMessagesIntoThreads(messages: any[]): ThreadedMessage[] {
  // Create a map for quick message lookup
  const messageMap = new Map<number, ThreadedMessage>();
  
  // First pass: Create ThreadedMessage objects with empty replies arrays
  messages.forEach(msg => {
    messageMap.set(msg.id, {
      ...msg,
      replies: []
    });
  });
  
  // Second pass: Build the thread structure
  const rootMessages: ThreadedMessage[] = [];
  
  messageMap.forEach((message) => {
    if (message.reply_to_id) {
      // This is a reply - add it to its parent's replies array
      const parentMessage = messageMap.get(message.reply_to_id);
      if (parentMessage) {
        parentMessage.replies.push(message);
      } else {
        // Parent not found, treat as root message
        rootMessages.push(message);
      }
    } else {
      // This is a root message
      rootMessages.push(message);
    }
  });
  
  // Sort root messages by date (newest first)
  rootMessages.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  // Sort replies within each thread by date (oldest first for chronological reading)
  const sortReplies = (message: ThreadedMessage) => {
    message.replies.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    message.replies.forEach(sortReplies); // Recursively sort nested replies
  };
  
  rootMessages.forEach(sortReplies);
  
  return rootMessages;
}

/**
 * Flattens a threaded message structure back into a linear array
 * @param threads - Array of threaded messages
 * @returns Flat array of all messages
 */
export function flattenThreads(threads: ThreadedMessage[]): any[] {
  const flattened: any[] = [];
  
  const flatten = (message: ThreadedMessage) => {
    // Remove the replies array to avoid circular references
    const { replies, ...messageWithoutReplies } = message;
    flattened.push(messageWithoutReplies);
    
    // Recursively flatten replies
    replies.forEach(flatten);
  };
  
  threads.forEach(flatten);
  return flattened;
}

/**
 * Counts total messages including all replies
 * @param threads - Array of threaded messages
 * @returns Total count of messages
 */
export function countMessagesInThreads(threads: ThreadedMessage[]): number {
  let count = 0;
  
  const countMessage = (message: ThreadedMessage) => {
    count++;
    message.replies.forEach(countMessage);
  };
  
  threads.forEach(countMessage);
  return count;
}

/**
 * Finds a message by ID within threaded structure
 * @param threads - Array of threaded messages
 * @param messageId - ID of message to find
 * @returns The message if found, null otherwise
 */
export function findMessageInThreads(
  threads: ThreadedMessage[], 
  messageId: number
): ThreadedMessage | null {
  for (const thread of threads) {
    if (thread.id === messageId) return thread;
    
    const found = findMessageInThreads(thread.replies, messageId);
    if (found) return found;
  }
  
  return null;
}