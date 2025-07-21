import { Request, Response, Express } from "express";
import { eq, sql, and } from "drizzle-orm";
import { messages, conversations, conversationParticipants } from "../../shared/schema";
import { db } from "../db";

// Helper function to check if user has permission for specific chat type
function checkUserChatPermission(user: any, chatType: string): boolean {
  if (!user || !user.permissions) return false;

  const permissions = user.permissions;

  switch (chatType) {
    case 'core_team':
      return permissions.includes('core_team_chat');
    case 'committee':
      return permissions.includes('committee_chat');
    case 'hosts':
      return permissions.includes('host_chat');
    case 'drivers':
      return permissions.includes('driver_chat');
    case 'recipients':
      return permissions.includes('recipient_chat');
    case 'direct':
      return permissions.includes('direct_messages');
    case 'groups':
      return permissions.includes('group_messages');
    case 'general':
      return permissions.includes('general_chat');
    default:
      return permissions.includes('general_chat');
  }
}

// Get unread message counts for a user
const getUnreadCounts = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const user = (req as any).user;

      // Initialize counts
      let unreadCounts = {
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

      try {
        // Get unread message counts for different types of conversations
        // Key fix: explicitly exclude messages sent BY this user (using both user_id and sender_id)
        // and exclude messages already read by this user
        const unreadQuery = sql`
          SELECT 
            m.conversation_id,
            c.type as conversation_type,
            c.name as conversation_name,
            COUNT(*) as count
          FROM messages m
          INNER JOIN conversations c ON m.conversation_id = c.id
          INNER JOIN conversation_participants cp ON cp.conversation_id = c.id
          WHERE cp.user_id = ${userId}
            AND m.user_id != ${userId}
            AND (m.sender_id IS NULL OR m.sender_id != ${userId})
            AND m.id NOT IN (
              SELECT message_id 
              FROM message_reads 
              WHERE user_id = ${userId}
            )
          GROUP BY m.conversation_id, c.type, c.name
        `;
        
        const unreadConversationCounts = await db.execute(unreadQuery);

        // Process conversation counts by type
        for (const conversation of unreadConversationCounts.rows || []) {
          const count = Number(conversation.count);

          if (conversation.conversation_type === 'direct') {
            unreadCounts.direct += count;
          } else if (conversation.conversation_type === 'group') {
            unreadCounts.groups += count;
          } else if (conversation.conversation_type === 'channel') {
            // Map channel names to specific categories
            const name = conversation.conversation_name?.toLowerCase() || '';
            if (name.includes('core team')) {
              unreadCounts.core_team += count;
            } else if (name.includes('committee')) {
              unreadCounts.committee += count;
            } else if (name.includes('host')) {
              unreadCounts.hosts += count;
            } else if (name.includes('driver')) {
              unreadCounts.drivers += count;
            } else if (name.includes('recipient')) {
              unreadCounts.recipients += count;
            } else {
              unreadCounts.general += count;
            }
          }
        }

        // Calculate total
        unreadCounts.total = unreadCounts.general + unreadCounts.committee + 
                           unreadCounts.hosts + unreadCounts.drivers + 
                           unreadCounts.recipients + unreadCounts.core_team + 
                           unreadCounts.direct + unreadCounts.groups;

      } catch (dbError) {
        console.error('Database query error in unread counts:', dbError);
        // Return fallback counts on database error
      }

      res.json(unreadCounts);
    } catch (error) {
      console.error("Error getting unread counts:", error);
      res.status(500).json({ error: "Failed to get unread counts" });
    }
};

// Mark messages as read when user views a chat
const markMessagesRead = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { conversationId } = req.body;

      if (!conversationId) {
        return res.status(400).json({ error: "Conversation ID is required" });
      }

      // TODO: Implement read tracking when messageReads table is added
      res.json({ success: true, markedCount: 0 });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
};

// Mark all messages as read for user
const markAllRead = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // TODO: Implement when messageReads table is added
      res.json({ success: true, markedCount: 0 });
    } catch (error) {
      console.error("Error marking all messages as read:", error);
      res.status(500).json({ error: "Failed to mark all messages as read" });
    }
};

// Register routes function
export function registerMessageNotificationRoutes(app: Express) {
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.user) {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  };

  app.get("/api/message-notifications/unread-counts", isAuthenticated, getUnreadCounts);
  app.post("/api/message-notifications/mark-read", isAuthenticated, markMessagesRead);
  app.post("/api/message-notifications/mark-all-read", isAuthenticated, markAllRead);
}

// Legacy export for backward compatibility
export const messageNotificationRoutes = {
  getUnreadCounts,
  markMessagesRead,
  markAllRead
};