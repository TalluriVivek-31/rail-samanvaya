import { Router, Request, Response } from 'express';
import { validateSession } from '../services/authService.js';

const router = Router();

// In-memory conversations store for backend coordination
interface BackendChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  department: string;
  content: string;
  timestamp: string;
  type: 'human' | 'system_alert' | 'decision_prompt';
  metadata?: {
    requestId?: string;
    section?: string;
    actionRequired?: string;
    corridorId?: string;
  };
}

interface BackendConversation {
  id: string;
  title: string;
  type: 'department_joint' | 'section_emergency' | 'work_adjacent';
  relatedRequestId?: string;
  section?: string;
  participants: string[];
  unreadCount: number;
  lastMessage?: BackendChatMessage;
  messages: BackendChatMessage[];
}

const conversations: BackendConversation[] = [
  {
    id: 'conv-joint-bza-kmt',
    title: 'Joint P.Way & TRD Coordination — KI-MDR Section',
    type: 'department_joint',
    relatedRequestId: 'REQ-2026-001',
    section: 'KI-MDR',
    participants: ['SSE/P.Way/BZA', 'SSE/TRD/BZA', 'Chief Controller/BZA'],
    unreadCount: 0,
    messages: [
      {
        id: 'msg-1',
        senderId: 'SYSTEM',
        senderName: 'Rail Samnvay Intelligence',
        senderRole: 'SYSTEM',
        department: 'Operating',
        content: 'CO-LOCATION ALERT: P.Way Tamping Machine and TRD OHE Periodic Inspection requested on same line at KI-MDR Section. Combining works saves 90 mins of traffic possession.',
        timestamp: '08:15 IST',
        type: 'system_alert',
        metadata: {
          requestId: 'REQ-2026-001',
          section: 'KI-MDR',
          actionRequired: 'Joint Concurrence'
        }
      },
      {
        id: 'msg-2',
        senderId: 'EMP-PWAY-01',
        senderName: 'R. K. Sharma',
        senderRole: 'SSE/P.Way/BZA',
        department: 'Engineering (P.Way)',
        content: 'We need 180 mins on Down Line for CSM Tamping. We can start from Km 452/10 and move towards Km 458/00.',
        timestamp: '08:20 IST',
        type: 'human'
      },
      {
        id: 'msg-3',
        senderId: 'EMP-TRD-01',
        senderName: 'V. S. Rao',
        senderRole: 'SSE/TRD/BZA',
        department: 'Electrical (TRD)',
        content: 'TRD tower wagon can operate in the shadow of P.Way machine between Km 454 and 456. Power block required on DN line.',
        timestamp: '08:25 IST',
        type: 'human'
      }
    ]
  }
];

// GET /api/chat/conversations
router.get('/conversations', (req: Request, res: Response): void => {
  res.json({
    success: true,
    conversations
  });
});

// POST /api/chat/messages
router.post('/messages', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const sessionUser = token ? validateSession(token) : null;

    const { conversationId, content, metadata } = req.body;

    if (!conversationId || !content) {
      res.status(400).json({
        success: false,
        error: 'conversationId and content are required'
      });
      return;
    }

    let conv = conversations.find(c => c.id === conversationId);
    if (!conv) {
      // Create new conversation on the fly
      conv = {
        id: conversationId,
        title: `Coordination Channel (${conversationId})`,
        type: 'work_adjacent',
        participants: [sessionUser?.name || 'Authorized Officer'],
        unreadCount: 0,
        messages: []
      };
      conversations.push(conv);
    }

    const newMsg: BackendChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      senderId: sessionUser?.employeeId || 'ANON-OP',
      senderName: sessionUser?.name || 'Operational Officer',
      senderRole: sessionUser?.role || 'Field Engineer',
      department: sessionUser?.department || 'Operating',
      content,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
      type: 'human',
      metadata
    };

    conv.messages.push(newMsg);
    conv.lastMessage = newMsg;

    res.json({
      success: true,
      message: newMsg
    });
  } catch (err) {
    console.error('[Chat API Error]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
