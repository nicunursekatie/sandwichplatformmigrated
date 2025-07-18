import { Router } from 'express';
import { storage } from './storage';
import { PERMISSIONS } from '../shared/auth-utils';
import { requirePermission } from './temp-auth';

const router = Router();

// Use the requirePermission middleware from temp-auth

// Get all suggestions
router.get('/', requirePermission(PERMISSIONS.VIEW_SUGGESTIONS), async (req, res) => {
  try {
    const suggestions = await storage.getAllSuggestions();
    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Get a specific suggestion
router.get('/:id', requirePermission(PERMISSIONS.VIEW_SUGGESTIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const suggestion = await storage.getSuggestion(Number(id));
    
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    res.json(suggestion);
  } catch (error) {
    console.error('Error fetching suggestion:', error);
    res.status(500).json({ error: 'Failed to fetch suggestion' });
  }
});

// Submit a new suggestion
router.post('/', requirePermission(PERMISSIONS.SUBMIT_SUGGESTIONS), async (req, res) => {
  try {
    console.log('=== SUGGESTION SUBMISSION DEBUG ===');
    console.log('Request body:', req.body);
    console.log('User object:', (req as any).user);
    
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { title, description, priority = 'medium', category = 'general', tags } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const suggestionData = {
      title,
      description,
      priority,
      category,
      tags: tags || [],
      upvotes: 0,
      status: 'open' as const,
      submittedBy: user.id,
      submitterEmail: user.email || '',
      submitterName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Anonymous'
    };

    console.log('Creating suggestion with data:', suggestionData);
    
    const newSuggestion = await storage.createSuggestion(suggestionData);
    console.log('Created suggestion:', newSuggestion);
    
    res.status(201).json(newSuggestion);
  } catch (error) {
    console.error('Error creating suggestion:', error);
    res.status(500).json({ error: 'Failed to create suggestion' });
  }
});

// Update suggestion status (admin only)
router.patch('/:id', requirePermission(PERMISSIONS.MANAGE_SUGGESTIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;
    
    const updatedSuggestion = await storage.updateSuggestion(Number(id), { 
      status,
      ...(adminResponse && { adminResponse })
    });
    
    if (!updatedSuggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    res.json(updatedSuggestion);
  } catch (error) {
    console.error('Error updating suggestion:', error);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

// Delete a suggestion (admin only)
router.delete('/:id', requirePermission(PERMISSIONS.MANAGE_SUGGESTIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteSuggestion(Number(id));
    
    if (!success) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    res.json({ message: 'Suggestion deleted successfully' });
  } catch (error) {
    console.error('Error deleting suggestion:', error);
    res.status(500).json({ error: 'Failed to delete suggestion' });
  }
});

// Upvote a suggestion
router.post('/:id/upvote', requirePermission(PERMISSIONS.VIEW_SUGGESTIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSuggestion = await storage.upvoteSuggestion(Number(id));
    
    if (!updatedSuggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    res.json(updatedSuggestion);
  } catch (error) {
    console.error('Error upvoting suggestion:', error);
    res.status(500).json({ error: 'Failed to upvote suggestion' });
  }
});

// Get responses for a suggestion
router.get('/:id/responses', requirePermission(PERMISSIONS.VIEW_SUGGESTIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const responses = await storage.getSuggestionResponses(Number(id));
    res.json(responses);
  } catch (error) {
    console.error('Error fetching suggestion responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// Add a response to a suggestion
router.post('/:id/responses', requirePermission(PERMISSIONS.RESPOND_TO_SUGGESTIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const { message, isAdminResponse = false, isInternal = false } = req.body;
    const user = (req as any).user;
    
    if (!user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const responseData = {
      suggestionId: Number(id),
      message,
      isAdminResponse,
      isInternal,
      respondedBy: user.id,
      respondentName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Anonymous'
    };

    const newResponse = await storage.createSuggestionResponse(responseData);
    res.status(201).json(newResponse);
  } catch (error) {
    console.error('Error creating suggestion response:', error);
    res.status(500).json({ error: 'Failed to create response' });
  }
});

// Delete a response (admin only)
router.delete('/responses/:responseId', requirePermission(PERMISSIONS.RESPOND_TO_SUGGESTIONS), async (req, res) => {
  try {
    const { responseId } = req.params;
    const success = await storage.deleteSuggestionResponse(Number(responseId));
    
    if (!success) {
      return res.status(404).json({ error: 'Response not found' });
    }
    
    res.json({ message: 'Response deleted successfully' });
  } catch (error) {
    console.error('Error deleting suggestion response:', error);
    res.status(500).json({ error: 'Failed to delete response' });
  }
});

// Request clarification (creates a private conversation)
router.post('/:id/clarification', requirePermission(PERMISSIONS.MANAGE_SUGGESTIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const currentUser = (req as any).user;
    
    if (!currentUser?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the suggestion to find the creator
    const suggestion = await storage.getSuggestion(Number(id));
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    const creatorUserId = suggestion.submittedBy;
    
    // Create or find existing direct conversation
    let conversation = await storage.getDirectConversation(currentUser.id, creatorUserId);
    
    if (!conversation) {
      // Create new conversation
      const conversationData = {
        type: 'direct' as const,
        title: `Suggestion Discussion: ${suggestion.title}`,
        createdBy: currentUser.id
      };
      
      conversation = await storage.createConversation(conversationData);
      
      // Add participants
      await storage.addConversationParticipant({
        conversationId: conversation.id,
        userId: currentUser.id,
        role: 'admin'
      });
      
      await storage.addConversationParticipant({
        conversationId: conversation.id,
        userId: creatorUserId,
        role: 'member'
      });
    }

    // Send the clarification message
    const messageData = {
      conversationId: conversation.id,
      userId: currentUser.id,
      content: `Regarding your suggestion "${suggestion.title}": ${message}`,
      sender: currentUser.displayName || currentUser.email || 'Admin'
    };

    const sentMessage = await storage.createMessage(messageData);

    res.json({
      success: true,
      conversationId: conversation.id,
      messageId: sentMessage.id,
      message: 'Clarification request sent successfully'
    });
  } catch (error) {
    console.error('Error sending clarification request:', error);
    res.status(500).json({ error: 'Failed to send clarification request' });
  }
});

export default router;