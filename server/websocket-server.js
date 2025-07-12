const { WebSocketServer } = require('ws');
const { createServer } = require('http');

class WebSocketManager {
  constructor(port = 3001) {
    const server = createServer();
    this.wss = new WebSocketServer({ server });
    
    server.listen(port, () => {
      console.log(`🚀 WebSocket server running on port ${port}`);
    });

    this.clients = new Map();
    this.userConnections = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws) => {
      console.log('🔌 New WebSocket connection');
      
      const client = {
        ws,
        userId: null,
        isAuthenticated: false,
        subscriptions: new Set()
      };
      
      this.clients.set(ws, client);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
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

  handleMessage(ws, message) {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'auth':
        this.handleAuth(ws, message);
        break;
      
      case 'message':
        if (!client.isAuthenticated) {
          this.sendError(ws, 'Authentication required');
          return;
        }
        this.handleChatMessage(ws, message);
        break;
      
      case 'ping':
        this.sendMessage(ws, { type: 'pong', data: { timestamp: Date.now() } });
        break;
      
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  handleAuth(ws, message) {
    const client = this.clients.get(ws);
    if (!client) return;

    const { userId } = message;
    
    if (!userId) {
      this.sendError(ws, 'User ID required for authentication');
      return;
    }

    // For now, accept any user ID (in production, verify against database)
    client.userId = userId;
    client.isAuthenticated = true;

    // Add to user connections map
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(ws);

    console.log(`✅ User ${userId} authenticated on WebSocket`);
    
    this.sendMessage(ws, {
      type: 'notification',
      data: { message: 'Authentication successful' }
    });

    // Send unread message counts
    this.sendUnreadCounts(ws, userId);
  }

  handleChatMessage(ws, message) {
    const client = this.clients.get(ws);
    if (!client || !client.userId) return;

    const { conversationId, content } = message;
    
    if (!conversationId || !content) {
      this.sendError(ws, 'Conversation ID and content required');
      return;
    }

    console.log(`💬 Message sent in conversation ${conversationId} by user ${client.userId}: ${content}`);

    // Broadcast message to all users in the conversation
    this.broadcastToConversation(conversationId, {
      type: 'message',
      data: {
        id: Date.now(), // Simple ID for demo
        conversationId,
        userId: client.userId,
        content,
        createdAt: new Date().toISOString()
      }
    });
  }

  sendUnreadCounts(ws, userId) {
    // Send empty counts for now
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
    
    this.sendMessage(ws, {
      type: 'notification',
      data: { 
        type: 'unread_counts',
        counts
      }
    });
  }

  broadcastToConversation(conversationId, message) {
    // For demo purposes, broadcast to all connected users
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        this.sendMessage(client, message);
      }
    });
  }

  broadcastToUser(userId, message) {
    const userConnections = this.userConnections.get(userId);
    if (userConnections) {
      userConnections.forEach(ws => {
        this.sendMessage(ws, message);
      });
    }
  }

  broadcastToAll(message) {
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        this.sendMessage(client, message);
      }
    });
  }

  sendMessage(ws, message) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, error) {
    this.sendMessage(ws, {
      type: 'error',
      data: { message: error }
    });
  }

  handleDisconnect(ws) {
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

  getStats() {
    return {
      totalConnections: this.clients.size,
      authenticatedConnections: Array.from(this.clients.values()).filter(c => c.isAuthenticated).length,
      connectedUsers: this.userConnections.size
    };
  }
}

// Create and export the WebSocket manager
const wsManager = new WebSocketManager(3001);

// Log stats every 30 seconds
setInterval(() => {
  const stats = wsManager.getStats();
  console.log('📊 WebSocket stats:', stats);
}, 30000);

console.log('✅ WebSocket server initialized');

module.exports = wsManager; 