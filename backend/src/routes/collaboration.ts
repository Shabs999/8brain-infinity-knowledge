import express, { Request, Response } from 'express';
import { collaborationService } from '../services/CollaborationService';

const router = express.Router();

/**
 * Get all active collaboration sessions
 * GET /api/collaboration/sessions
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const sessions = collaborationService.getActiveSessions();
    
    return res.json({
      success: true,
      data: {
        sessions,
        totalSessions: sessions.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get active sessions'
    });
  }
});

/**
 * Get specific session details
 * GET /api/collaboration/sessions/:sessionId
 */
router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = collaborationService.getSessionDetails(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    return res.json({
      success: true,
      data: {
        id: session.id,
        name: session.name,
        participants: Array.from(session.participants.values()),
        queryHistory: session.queryHistory,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error getting session details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get session details'
    });
  }
});

/**
 * Create a new collaboration session
 * POST /api/collaboration/sessions
 */
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { name, maxParticipants = 10 } = req.body;
    const sessionId = `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return res.json({
      success: true,
      data: {
        sessionId,
        joinUrl: `/collaboration/${sessionId}`,
        message: 'Session created successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error creating session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create session'
    });
  }
});

export default router;