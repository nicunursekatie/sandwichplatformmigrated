import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';
import { db } from './db';
import { users, messages, conversations, conversationParticipants } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

interface WebSocketMessage {
  type: 'message' | 'notification' | 'ping' | 'auth';
  data?: any;
  userId?: string;
  conversationId?: number;
  content?: string;
}

interface ConnectedClient {
  ws: WebSocket;
  userId?: string;
  isAuthenticated: boolean;
  subscriptions: Set<string>;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ConnectedClient> = new Map();
  private userConnections: Map<string, Set<WebSocket>> = new Map();

  constructor(port: number = 3001) {
    const server = createServer();
    this.wss = new WebSocketServer({ server });
    
    server.listen(port, () => {
      console.log(`🚀 WebSocket server running on port ${port}`);
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('🔌 New WebSocket connection');
      
      const client: ConnectedClient = {
        ws,
        isAuthenticated: false,
        subscriptions: new Set()
      };
      
      this.clients.set(ws, client);

      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.handleDisconnect(ws);
      });

      // Send initial connection message
      this.sendMessage(ws, {
        type: 'notification',
        data: { message: 'Connected to WebSocket server' }
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: WebSocketMessage) {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'auth':
        await this.handleAuth(ws, message);
        break;
      
      case 'message':
        if (!client.isAuthenticated) {
          this.sendError(ws, 'Authentication required');
          return;
        }
        await this.handleChatMessage(ws, message);
        break;
      
      case 'ping':
        this.sendMessage(ws, { type: 'pong', data: { timestamp: Date.now() } });
        break;
      
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private async handleAuth(ws: WebSocket, message: WebSocketMessage) {
    const client = this.clients.get(ws);
    if (!client) return;

    const { userId } = message;
    
    if (!userId) {
      this.sendError(ws, 'User ID required for authentication');
      return;
    }

    try {
      // Verify user exists in database
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!user) {
        this.sendError(ws, 'Invalid user ID');
        return;
      }

      // Authenticate client
      client.userId = userId;
      client.isAuthenticated = true;

      // Add to user connections map
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(ws);

      console.log(`✅ User ${userId} authenticated on WebSocket`);
      
      this.sendMessage(ws, {
        type: 'notification',
        data: { message: 'Authentication successful' }
      });

      // Send unread message counts
      await this.sendUnreadCounts(ws, userId);

    } catch (error) {
      console.error('❌ Authentication error:', error);
      this.sendError(ws, 'Authentication failed');
    }
  }

  private async handleChatMessage(ws: WebSocket, message: WebSocketMessage) {
    const client = this.clients.get(ws);
    if (!client || !client.userId) return;

    const { conversationId, content } = message;
    
    if (!conversationId || !content) {
      this.sendError(ws, 'Conversation ID and content required');
      return;
    }

    try {
      // Save message to database
      const [newMessage] = await db.insert(messages).values({
        conversationId,
        userId: client.userId,
        senderId: client.userId,
        content: content.trim()
      }).returning();

      // Broadcast message to all users in the conversation
      await this.broadcastToConversation(conversationId, {
        type: 'message',
        data: {
          id: newMessage.id,
          conversationId,
          userId: client.userId,
          content: newMessage.content,
          createdAt: newMessage.createdAt
        }
      });

      console.log(`💬 Message sent in conversation ${conversationId} by user ${client.userId}`);

    } catch (error) {
      console.error('❌ Error sending message:', error);
      this.sendError(ws, 'Failed to send message');
    }
  }

  private async sendUnreadCounts(ws: WebSocket, userId: string) {
    try {
      // Get unread message counts for different conversation types
      const unreadCounts = await this.getUnreadCounts(userId);
      
      this.sendMessage(ws, {
        type: 'notification',
        data: { 
          type: 'unread_counts',
          counts: unreadCounts
        }
      });
    } catch (error) {
      console.error('❌ Error getting unread counts:', error);
    }
  }

  private async getUnreadCounts(userId: string) {
    // This is a simplified version - you'll need to implement based on your schema
    const counts = {
      general: 0,
      committee: 0,
      hosts: 0,
      drivers: 0,
      recipients: 0,
      core_team: 0,
      direct: 0,
      groups: 0,
      total: 0
    };

    // TODO: Implement actual unread count logic based on your message_reads table
    // For now, return empty counts
    return counts;
  }

  private async broadcastToConversation(conversationId: number, message: any) {
    try {
      // Get all participants in the conversation
      const participants = await db.select({ userId: conversationParticipants.userId })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conversationId));

      // Send message to all connected participants
      for (const participant of participants) {
        const userConnections = this.userConnections.get(participant.userId);
        if (userConnections) {
          userConnections.forEach(ws => {
            this.sendMessage(ws, message);
          });
        }
      }
    } catch (error) {
      console.error('❌ Error broadcasting message:', error);
    }
  }

  public broadcastToUser(userId: string, message: any) {
    const userConnections = this.userConnections.get(userId);
    if (userConnections) {
      userConnections.forEach(ws => {
        this.sendMessage(ws, message);
      });
    }
  }

  public broadcastToAll(message: any) {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, message);
      }
    });
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      data: { message: error }
    });
  }

  private handleDisconnect(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (client) {
      // Remove from user connections
      if (client.userId) {
        const userConnections = this.userConnections.get(client.userId);
        if (userConnections) {
          userConnections.delete(ws);
          if (userConnections.size === 0) {
            this.userConnections.delete(client.userId);
          }
        }
      }
      
      this.clients.delete(ws);
      console.log(`🔌 WebSocket disconnected${client.userId ? ` (user: ${client.userId})` : ''}`);
    }
  }

  public getStats() {
    return {
      totalConnections: this.clients.size,
      authenticatedConnections: Array.from(this.clients.values()).filter(c => c.isAuthenticated).length,
      connectedUsers: this.userConnections.size
    };
  }
}

// Create and export the WebSocket manager
export const wsManager = new WebSocketManager(3001);

// Export for use in other files
export default wsManager; 