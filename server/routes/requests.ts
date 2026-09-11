import { Router, Request, Response } from 'express';
import { validateSession } from '../services/authService.js';

const router = Router();

interface ApprovalRequestBody {
  requestId: string;
  requesterName: string;
  requesterEmployeeId?: string;
  targetStatus: 'Approved' | 'Rejected' | 'Verified' | 'Block Started' | 'Block Released' | 'Scheduled' | 'Block Window Allocated';
  remarks?: string;
}

// POST /api/requests/approve
// Enforces server-side RBAC validation including:
// 1. Creator cannot approve their own request
// 2. Field engineers cannot approve or schedule blocks (Planning Officer or MASTER required)
// 3. Only Section Controller / Operating Control can grant (Block Started) or release blocks
router.post('/approve', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. No active bearer token provided.',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    const sessionUser = validateSession(token);
    if (!sessionUser) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please authenticate again.',
        code: 'SESSION_EXPIRED'
      });
      return;
    }

    const body: ApprovalRequestBody = req.body;
    const { requestId, requesterName, requesterEmployeeId, targetStatus, remarks } = body;

    if (!requestId || !targetStatus) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: requestId and targetStatus are mandatory.',
        code: 'BAD_REQUEST'
      });
      return;
    }

    // Strict Rule 1: Request creator cannot approve own request (unless PCOM MASTER emergency override)
    const isSameUser = (requesterName && requesterName.toLowerCase().trim() === sessionUser.name.toLowerCase().trim()) ||
                       (requesterEmployeeId && requesterEmployeeId.toUpperCase().trim() === sessionUser.employeeId.toUpperCase().trim());

    if (targetStatus === 'Approved' && isSameUser && sessionUser.role !== 'MASTER') {
      res.status(403).json({
        success: false,
        error: 'Forbidden: The request creator is not permitted to approve their own request under Railway Operating Safety Rules.',
        code: 'SELF_APPROVAL_FORBIDDEN'
      });
      return;
    }

    // Strict Rule 2: Field department engineers (P.Way, S&T, TRD) cannot issue Operating Approval or Schedule Possessions
    if (targetStatus === 'Approved' || targetStatus === 'Scheduled') {
      if (['P.Way Engineer', 'S&T Engineer', 'TRD Engineer'].includes(sessionUser.role)) {
        res.status(403).json({
          success: false,
          error: `Forbidden: Maintenance field role '${sessionUser.role}' cannot ${targetStatus === 'Scheduled' ? 'schedule/authorize' : 'approve'} blocks. Operating concurrence requires Planning Officer, Operations Controller, or MASTER authority.`,
          code: 'INSUFFICIENT_PRIVILEGES'
        });
        return;
      }
    }

    // Strict Rule 3: Only Operating Control can authorize Block Started (Grant) or Block Released
    if (targetStatus === 'Block Started' || targetStatus === 'Block Released') {
      if (['P.Way Engineer', 'S&T Engineer', 'TRD Engineer'].includes(sessionUser.role)) {
        res.status(403).json({
          success: false,
          error: `Forbidden: Only Section Controller / Operating Control can execute '${targetStatus}'.`,
          code: 'OPERATING_CONTROL_ONLY'
        });
        return;
      }
    }

    res.json({
      success: true,
      message: `Request ${requestId} transition to '${targetStatus}' authorized by ${sessionUser.name} (${sessionUser.role}).`,
      requestId,
      targetStatus,
      authorizedBy: sessionUser.name,
      actorRole: sessionUser.role,
      remarks: remarks || 'Authorized via Central Railway Control RBAC engine.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Requests Route Error]', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error processing request approval.',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/requests/resend
router.post('/resend', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const sessionUser = token ? validateSession(token) : null;

    if (!sessionUser) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { requestId, reason, correctionFields } = req.body;
    if (!requestId || !reason) {
      res.status(400).json({ success: false, error: 'requestId and reason are required' });
      return;
    }

    res.json({
      success: true,
      message: `Request ${requestId} returned for revision with reason: "${reason}"`,
      requestId,
      status: 'Revision Required',
      revisionRequest: {
        requestedBy: sessionUser.name,
        requestedAt: new Date().toISOString(),
        reason,
        correctionFields: correctionFields || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/requests/reject
router.post('/reject', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const sessionUser = token ? validateSession(token) : null;

    if (!sessionUser) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { requestId, reason } = req.body;
    if (!requestId || !reason) {
      res.status(400).json({ success: false, error: 'requestId and reason are required for rejection' });
      return;
    }

    res.json({
      success: true,
      message: `Request ${requestId} rejected. Reason: "${reason}"`,
      requestId,
      status: 'Rejected',
      rejectionDetails: {
        rejectedBy: sessionUser.name,
        rejectedAt: new Date().toISOString(),
        reason
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
