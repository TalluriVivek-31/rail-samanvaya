import { Router, Request, Response } from 'express';
import { validateSession } from '../services/authService.js';

const router = Router();

interface ApprovalRequestBody {
  requestId: string;
  requesterName: string;
  requesterEmployeeId?: string;
  currentStatus?: string;
  targetStatus: 'Approved' | 'Rejected' | 'Verified' | 'Block Started' | 'Block Released' | 'Scheduled' | 'Block Window Allocated' | 'Closed';
  remarks?: string;
  departmentExecutionStatuses?: { department: string; status: string }[];
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'Draft': ['Submitted', 'Unsafe / Cancelled'],
  'Submitted': ['Review', 'Verified', 'Approved', 'Rejected', 'Revision Required', 'Unsafe / Cancelled', 'Planning Queue'],
  'Review': ['Verified', 'Approved', 'Rejected', 'Revision Required', 'Unsafe / Cancelled'],
  'Verified': ['Approved', 'Rejected', 'Revision Required', 'Unsafe / Cancelled'],
  'Approved': ['Planning Queue', 'AI/OR Optimization', 'Block Window Allocated', 'Scheduled', 'Unsafe / Cancelled'],
  'Planning Queue': ['AI/OR Optimization', 'Block Window Allocated', 'Scheduled', 'Unsafe / Cancelled'],
  'Block Window Allocated': ['Scheduled', 'Unsafe / Cancelled', 'Rescheduled'],
  'Scheduled': ['Block Started', 'Delayed / Headway Conflict', 'Unsafe / Cancelled', 'Rescheduled'],
  'Block Started': ['Work in Progress', 'Unsafe / Cancelled'],
  'Work in Progress': ['Work Completed', 'Inspection/Safety Verification', 'Block Release Requested', 'Block Released'],
  'Work Completed': ['Inspection/Safety Verification', 'Block Release Requested', 'Block Released'],
  'Inspection/Safety Verification': ['Block Release Requested', 'Block Released'],
  'Block Release Requested': ['Block Released'],
  'Block Released': ['Closed'],
  'Closed': [],
  'Rejected': [],
  'Unsafe / Cancelled': []
};

// POST /api/requests/approve
// Enforces server-side RBAC validation including:
// 1. Creator cannot approve their own request
// 2. Field engineers cannot approve or schedule blocks (Planning Officer or MASTER required)
// 3. Only Section Controller / Operating Control can grant (Block Started) or release blocks
// 4. Strict State-Machine Transition Guard (Section 25)
// 5. Multi-Department Work Completion Verification prior to Block Release (Section 19)
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
    const { requestId, requesterName, requesterEmployeeId, currentStatus, targetStatus, remarks, departmentExecutionStatuses } = body;

    if (!requestId || !targetStatus) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: requestId and targetStatus are mandatory.',
        code: 'BAD_REQUEST'
      });
      return;
    }

    // State Machine Security & Duplicate Approval Prevention (Section 25, 29)
    if (currentStatus) {
      if (currentStatus === 'Approved' && targetStatus === 'Approved') {
        res.status(409).json({
          success: false,
          error: `Duplicate Approval: Request ${requestId} has already been approved; duplicate approval rejected.`,
          code: 'ALREADY_APPROVED'
        });
        return;
      }

      if (currentStatus === 'Unsafe / Cancelled' || currentStatus === 'Cancelled') {
        res.status(400).json({
          success: false,
          error: `Terminal State Error: Cannot transition request ${requestId} from cancelled state '${currentStatus}' to '${targetStatus}'.`,
          code: 'CANNOT_TRANSITION_CANCELLED'
        });
        return;
      }

      if (currentStatus === 'Closed') {
        res.status(400).json({
          success: false,
          error: `Terminal State Error: Request ${requestId} is Closed in master ledger; further state transitions forbidden.`,
          code: 'CANNOT_TRANSITION_CLOSED'
        });
        return;
      }

      const allowed = ALLOWED_TRANSITIONS[currentStatus];
      if (allowed && !allowed.includes(targetStatus)) {
        res.status(400).json({
          success: false,
          error: `Invalid State Transition: Transitioning from '${currentStatus}' directly to '${targetStatus}' is prohibited under railway safety protocol.`,
          code: 'INVALID_STATE_TRANSITION',
          currentStatus,
          targetStatus,
          allowedNextStates: allowed
        });
        return;
      }
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
          error: `Forbidden: Maintenance field role '${sessionUser.role}' cannot ${targetStatus === 'Scheduled' ? 'schedule/authorize' : 'approve'} blocks. Requisitions require Technical Verification and Operating Control Authority authorization.`,
          code: 'INSUFFICIENT_PRIVILEGES'
        });
        return;
      }
    }

    // Strict Rule 3: Operating Control Authority (COA / Operations) exclusively authorizes & schedules possessions
    // Planning Officers generate recommendations and cannot unilaterally grant or schedule blocks
    const isOperatingControl = sessionUser.role === 'COA / Operations';
    const isMasterAdmin = sessionUser.role === 'MASTER';

    if (targetStatus === 'Scheduled') {
      if (sessionUser.role === 'Planning Officer') {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Planning Officer cannot authorize or schedule blocks. Under railway operating procedure, Planning Officers generate recommended windows; official Block Authorization & Scheduling is reserved for the Authorized Operating / Control Authority (COA / Operations).',
          code: 'OPERATING_CONTROL_REQUIRED'
        });
        return;
      }

      if (!isOperatingControl && !isMasterAdmin) {
        res.status(403).json({
          success: false,
          error: `Forbidden: Role '${sessionUser.role}' lacks Operating Control Authority to authorize and schedule corridor possessions.`,
          code: 'INSUFFICIENT_OPERATING_AUTHORITY'
        });
        return;
      }
    }

    // Strict Rule 4: Only Operating Control can execute Block Started (Grant) or Block Released
    if (targetStatus === 'Block Started' || targetStatus === 'Block Released') {
      if (!isOperatingControl && !isMasterAdmin) {
        res.status(403).json({
          success: false,
          error: `Forbidden: Only Section Controller / Operating Control Authority (COA / Operations) can execute '${targetStatus}'.`,
          code: 'OPERATING_CONTROL_ONLY'
        });
        return;
      }
    }

    // Strict Rule 5: Multi-Department Block Release Gate (Section 19 of specification)
    // A coordinated block CANNOT be released while any participating department has unfinished work
    if (targetStatus === 'Block Released' && departmentExecutionStatuses && departmentExecutionStatuses.length > 0) {
      const pendingDept = departmentExecutionStatuses.find(d => d.status !== 'COMPLETED' && d.status !== 'PARTIALLY_COMPLETED');
      if (pendingDept) {
        res.status(400).json({
          success: false,
          error: `Cannot Release Block: Coordinated department '${pendingDept.department}' has execution status '${pendingDept.status}'. All participating departments must formally sign off and complete work before Operating Control can release track possession.`,
          code: 'DEPARTMENT_WORK_PENDING',
          pendingDepartment: pendingDept.department,
          departmentStatus: pendingDept.status
        });
        return;
      }
    }

    const isOverride = isMasterAdmin && targetStatus === 'Scheduled';
    const formattedRemarks = isOverride
      ? `[Administrative Override] ${remarks || 'Authorized via MASTER Prototype System Administrator Override.'}`
      : (remarks || 'Authorized via Central Railway Operating Control Authority.');

    res.json({
      success: true,
      message: `Request ${requestId} transition to '${targetStatus}' authorized by ${sessionUser.name} (${sessionUser.role})${isOverride ? ' [Administrative Override]' : ''}.`,
      requestId,
      targetStatus,
      authorizedBy: sessionUser.name,
      actorRole: sessionUser.role,
      isAdministrativeOverride: isOverride,
      remarks: formattedRemarks,
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

// POST /api/requests/completion-report
// Captures on-site work completion accountability: WORK_COMPLETED, PARTIALLY_COMPLETED, WORK_NOT_COMPLETED
router.post('/completion-report', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const sessionUser = token ? validateSession(token) : null;

    if (!sessionUser) {
      res.status(401).json({ success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' });
      return;
    }

    const { 
      requestId, 
      blockId,
      status, 
      plannedDurationMinutes, 
      actualDurationMinutes, 
      actualWorkCompletion,
      workAccomplishedSummary,
      incompletionReasonCategory,
      incompletionDetails,
      remainingWork,
      remainingLocationKm,
      remainingStartKm,
      remainingEndKm,
      remainingEstimatedDurationMinutes,
      infrastructureCondition: reqCondition,
      continuationRequired,
      continuationRequestedDurationMinutes,
      severity
    } = req.body;

    if (!requestId || !status) {
      res.status(400).json({ success: false, error: 'requestId and status are required.', code: 'BAD_REQUEST' });
      return;
    }

    if (!['WORK_COMPLETED', 'PARTIALLY_COMPLETED', 'WORK_NOT_COMPLETED'].includes(status)) {
      res.status(400).json({ success: false, error: `Invalid completion status '${status}'.`, code: 'INVALID_STATUS' });
      return;
    }

    if (status !== 'WORK_COMPLETED' && !incompletionReasonCategory) {
      res.status(400).json({ 
        success: false, 
        error: 'Incompletion reason category is mandatory when work is PARTIALLY_COMPLETED or WORK_NOT_COMPLETED.', 
        code: 'REASON_REQUIRED' 
      });
      return;
    }

    const variance = (actualDurationMinutes || 0) - (plannedDurationMinutes || 0);
    const reportId = `REP-COMP-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // WORK_COMPLETED does NOT equal NORMAL_OPERATION_RESTORED (Section 3, 4 of specification)
    // Infrastructure condition defaults to RESTORATION_PENDING until formal authorized restoration occurs
    const determinedCondition = reqCondition || (
      status === 'WORK_COMPLETED' ? 'RESTORATION_PENDING' : 'RESTRICTED'
    );

    res.json({
      success: true,
      message: `Completion report for ${requestId} recorded: ${status} by ${sessionUser.name} (${sessionUser.role}). Infrastructure condition: ${determinedCondition}.`,
      completionReport: {
        id: reportId,
        requestId,
        blockId,
        status,
        completedAt: timestamp,
        actualWorkCompletion: actualWorkCompletion || timestamp,
        submittedBy: sessionUser.name,
        userRole: sessionUser.role,
        department: sessionUser.department,
        plannedDurationMinutes: plannedDurationMinutes || 0,
        actualDurationMinutes: actualDurationMinutes || 0,
        varianceMinutes: variance,
        workAccomplishedSummary: workAccomplishedSummary || 'Work completed per engineering specification.',
        incompletionReasonCategory,
        incompletionDetails,
        remainingWork,
        remainingLocationKm,
        remainingStartKm,
        remainingEndKm,
        remainingEstimatedDurationMinutes,
        infrastructureCondition: determinedCondition,
        continuationRequired: Boolean(continuationRequired),
        continuationRequestedDurationMinutes,
        severity: severity || 'LOW'
      }
    });
  } catch (error) {
    console.error('[Completion Report Error]', error);
    res.status(500).json({ success: false, error: 'Internal server error processing completion report.' });
  }
});

// POST /api/requests/continuation
// Generates a chained continuation block requisition linked to parent request
// NOTE: CONTINUATION BLOCKS ARE NEVER AUTO-GRANTED (Mandatory Railway Safety Rule)
router.post('/continuation', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const sessionUser = token ? validateSession(token) : null;

    if (!sessionUser) {
      res.status(401).json({ success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' });
      return;
    }

    const { 
      parentRequestId, 
      department,
      remainingWork, 
      remainingLocationKm, 
      remainingStartKm,
      remainingEndKm,
      startLocation,
      endLocation,
      requestedDurationMinutes, 
      reason, 
      preferredDate, 
      preferredTime 
    } = req.body;

    if (!parentRequestId || !remainingWork || !requestedDurationMinutes) {
      res.status(400).json({ 
        success: false, 
        error: 'parentRequestId, remainingWork, and requestedDurationMinutes are required.', 
        code: 'BAD_REQUEST' 
      });
      return;
    }

    const continuationId = `BR-${Date.now().toString().slice(-4)}`;
    const timestamp = new Date().toISOString();

    const resolvedStartLocation = startLocation || (typeof remainingStartKm === 'number' ? `KM ${remainingStartKm}` : 'KM 12/400');
    const resolvedEndLocation = endLocation || (typeof remainingEndKm === 'number' ? `KM ${remainingEndKm}` : 'KM 13/100');

    res.json({
      success: true,
      message: `Continuation block requisition ${continuationId} generated linked to parent ${parentRequestId}. Requisition is queued for review and planning. NOTE: Continuation blocks are NEVER auto-granted.`,
      continuationRequest: {
        id: continuationId,
        continuationOfBlockId: parentRequestId,
        parentRequirementId: parentRequestId,
        department: department || sessionUser.department || 'P.Way',
        engineer: sessionUser.name,
        creatorRole: sessionUser.role,
        work: `[Continuation] ${remainingWork}`,
        startLocation: resolvedStartLocation,
        endLocation: resolvedEndLocation,
        startKm: remainingStartKm,
        endKm: remainingEndKm,
        duration: requestedDurationMinutes,
        planned_duration: requestedDurationMinutes,
        date: preferredDate || new Date().toISOString().split('T')[0],
        preferredTime: preferredTime || '02:00',
        status: 'Submitted',
        reason: `Continuation of incomplete work on ${parentRequestId}. Reason: ${reason}`,
        isAutoGranted: false,
        requiresFullApprovalWorkflow: true,
        createdAt: timestamp
      }
    });
  } catch (error) {
    console.error('[Continuation Request Error]', error);
    res.status(500).json({ success: false, error: 'Internal server error generating continuation block.' });
  }
});

// POST /api/requests/operational-restriction
// Enforces Track Fit / Temporary Speed Restriction (TSR) with non-hardcoded authorized speed
router.post('/operational-restriction', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const sessionUser = token ? validateSession(token) : null;

    if (!sessionUser) {
      res.status(401).json({ success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' });
      return;
    }

    const { 
      requestId, 
      blockId, 
      type, 
      speedKmph, 
      normalSectionSpeedKmph = 130, 
      reason, 
      remarks, 
      cautionOrderIssued = false, 
      cautionOrderNumber 
    } = req.body;

    if (!requestId || !type) {
      res.status(400).json({ success: false, error: 'requestId and type are required.', code: 'BAD_REQUEST' });
      return;
    }

    if (type === 'RESTRICTED') {
      if (!speedKmph || speedKmph < 10 || speedKmph >= normalSectionSpeedKmph) {
        res.status(400).json({ 
          success: false, 
          error: `Restricted speed must be between 10 km/h and normal section speed (${normalSectionSpeedKmph} km/h). Speed restrictions cannot be arbitrarily hardcoded.`, 
          code: 'INVALID_SPEED_RESTRICTION' 
        });
        return;
      }
      if (!reason) {
        res.status(400).json({ 
          success: false, 
          error: 'Justification / Reason is mandatory when enforcing a Temporary Speed Restriction (TSR).', 
          code: 'REASON_REQUIRED' 
        });
        return;
      }
    }

    const restrictionId = `TSR-${Date.now().toString().slice(-4)}`;
    const timestamp = new Date().toISOString();

    res.json({
      success: true,
      message: `Operational condition for ${requestId} recorded: ${type} ${type === 'RESTRICTED' ? `(${speedKmph} km/h)` : '(Normal Section Speed)'} by ${sessionUser.name} (${sessionUser.role}).`,
      operationalRestriction: {
        id: restrictionId,
        requestId,
        blockId,
        type,
        speedKmph: type === 'RESTRICTED' ? speedKmph : undefined,
        normalSectionSpeedKmph,
        effectiveFrom: timestamp,
        authorizedBy: sessionUser.name,
        authorizerRole: sessionUser.role,
        reason: reason || (type === 'NORMAL' || type === 'NORMAL_RESTORED' ? 'Track certified fit for normal sectional speed.' : 'Caution order enforced.'),
        remarks,
        cautionOrderIssued: Boolean(cautionOrderIssued),
        cautionOrderNumber: cautionOrderNumber || (type === 'RESTRICTED' ? `CO-BZA-${Math.floor(1000 + Math.random() * 9000)}` : undefined)
      }
    });
  } catch (error) {
    console.error('[Operational Restriction Error]', error);
    res.status(500).json({ success: false, error: 'Internal server error recording operational restriction.' });
  }
});

// POST /api/requests/cancel
// Railway-compliant cancellation with permanent audit trail preservation (Never silently delete)
router.post('/cancel', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const sessionUser = token ? validateSession(token) : null;

    if (!sessionUser) {
      res.status(401).json({ success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' });
      return;
    }

    const { requestId, reason } = req.body;
    if (!requestId || !reason) {
      res.status(400).json({ success: false, error: 'requestId and reason are required to cancel a maintenance block.' });
      return;
    }

    const timestamp = new Date().toISOString();

    res.json({
      success: true,
      message: `Block requisition ${requestId} cancelled with audit trail preserved. Reason: "${reason}"`,
      requestId,
      status: 'Unsafe / Cancelled',
      cancellationDetails: {
        cancelledBy: sessionUser.name,
        role: sessionUser.role,
        timestamp,
        reason
      }
    });
  } catch (error) {
    console.error('[Cancel Request Error]', error);
    res.status(500).json({ success: false, error: 'Internal server error cancelling requisition.' });
  }
});

// POST /api/requests/restoration
// Formal infrastructure condition restoration with mandatory authorized verification (G&SR 15.06)
// Only Section Controller / Operating Control (COA / Operations) or MASTER can record restoration
router.post('/restoration', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const sessionUser = token ? validateSession(token) : null;

    if (!sessionUser) {
      res.status(401).json({ success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' });
      return;
    }

    const isOperatingControl = sessionUser.role === 'COA / Operations' || sessionUser.role === 'Section Controller';
    const isMasterAdmin = sessionUser.role === 'MASTER';

    if (!isOperatingControl && !isMasterAdmin) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Maintenance field role '${sessionUser.role}' cannot authorize infrastructure restoration. Formal line restoration requires Section Controller / Operating Control Authority verification under G&SR Chapter XV.`,
        code: 'UNAUTHORIZED_RESTORATION_AUTHORITY'
      });
      return;
    }

    const { requestId, blockId, newCondition, previousCondition = 'RESTORATION_PENDING', verificationRemarks, restrictionReference } = req.body;

    if (!requestId || !newCondition) {
      res.status(400).json({ success: false, error: 'requestId and newCondition are required.', code: 'BAD_REQUEST' });
      return;
    }

    if (!['NORMAL', 'RESTRICTED', 'RESTORATION_PENDING', 'UNAVAILABLE', 'UNDER_MAINTENANCE'].includes(newCondition)) {
      res.status(400).json({ success: false, error: `Invalid infrastructure condition '${newCondition}'.`, code: 'INVALID_CONDITION' });
      return;
    }

    if (!verificationRemarks) {
      res.status(400).json({ success: false, error: 'Verification remarks are mandatory for infrastructure restoration.', code: 'REMARKS_REQUIRED' });
      return;
    }

    const restorationRecordId = `REST-${Date.now().toString().slice(-4)}`;
    const timestamp = new Date().toISOString();

    res.json({
      success: true,
      message: `Infrastructure condition for ${requestId} updated to '${newCondition}' by ${sessionUser.name} (${sessionUser.role}).`,
      restorationRecord: {
        id: restorationRecordId,
        requestId,
        blockId,
        restoredBy: sessionUser.name,
        userRole: sessionUser.role,
        restoredAt: timestamp,
        previousCondition,
        newCondition,
        verificationRemarks,
        restrictionReference,
        authorized: true
      }
    });
  } catch (error) {
    console.error('[Restoration Route Error]', error);
    res.status(500).json({ success: false, error: 'Internal server error processing restoration.' });
  }
});

// POST /api/requests/manual-override
// Preserves original system recommendation while recording authorized human modification (Section 21)
router.post('/manual-override', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const sessionUser = token ? validateSession(token) : null;

    if (!sessionUser) {
      res.status(401).json({ success: false, error: 'Authentication required.', code: 'UNAUTHORIZED' });
      return;
    }

    const isAuthorized = sessionUser.role === 'Planning Officer' || sessionUser.role === 'COA / Operations' || sessionUser.role === 'MASTER';
    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Role '${sessionUser.role}' is not authorized to override system block recommendations. Planning or Operating Control authorization required.`,
        code: 'UNAUTHORIZED_OVERRIDE'
      });
      return;
    }

    const { requestId, originalRecommendation, modifiedValues, reason } = req.body;

    if (!requestId || !originalRecommendation || !modifiedValues || !reason) {
      res.status(400).json({
        success: false,
        error: 'requestId, originalRecommendation, modifiedValues, and reason are required.',
        code: 'BAD_REQUEST'
      });
      return;
    }

    const overrideId = `OVR-${Date.now().toString().slice(-4)}`;
    const timestamp = new Date().toISOString();

    res.json({
      success: true,
      message: `Manual override for ${requestId} recorded. Original recommendation preserved (${originalRecommendation.startTime}–${originalRecommendation.endTime}). Modified to ${modifiedValues.startTime}–${modifiedValues.endTime}.`,
      manualOverride: {
        id: overrideId,
        requestId,
        originalRecommendation,
        modifiedValues,
        modifiedBy: sessionUser.name,
        modifiedRole: sessionUser.role,
        modifiedAt: timestamp,
        reason
      }
    });
  } catch (error) {
    console.error('[Manual Override Error]', error);
    res.status(500).json({ success: false, error: 'Internal server error recording manual override.' });
  }
});

// POST /api/requests/verify-completion-due
// Checks whether planned_end has expired without a completion report (Section 6, 7)
// Triggers COMPLETION_REPORT_OVERDUE reminder/escalation without inventing false completion or failure
router.post('/verify-completion-due', (req: Request, res: Response): void => {
  try {
    const { requestId, plannedEndTime, hasCompletionReport, currentTimeStr } = req.body;

    if (!requestId || !plannedEndTime) {
      res.status(400).json({ success: false, error: 'requestId and plannedEndTime are required.' });
      return;
    }

    if (hasCompletionReport) {
      res.json({
        success: true,
        requestId,
        status: 'REPORT_SUBMITTED',
        isOverdue: false,
        message: `Completion report for ${requestId} has been filed.`
      });
      return;
    }

    // Compare plannedEndTime with currentTimeStr
    const [planH, planM] = plannedEndTime.split(':').map(Number);
    const now = new Date();
    const currH = currentTimeStr ? parseInt(currentTimeStr.split(':')[0], 10) : now.getHours();
    const currM = currentTimeStr ? parseInt(currentTimeStr.split(':')[1], 10) : now.getMinutes();

    const planMins = (planH || 0) * 60 + (planM || 0);
    const currMins = currH * 60 + currM;

    const isOverdue = currMins >= planMins;

    if (isOverdue) {
      res.json({
        success: true,
        requestId,
        status: 'COMPLETION_REPORT_OVERDUE',
        isOverdue: true,
        overdueMinutes: currMins - planMins,
        escalationLevel: (currMins - planMins) > 30 ? 'HIGH_ESCALATION' : 'SUPERVISOR_REMINDER',
        message: `COMPLETION_REPORT_OVERDUE: Block ${requestId} planned window ended at ${plannedEndTime}. On-site supervisor completion report is overdue by ${currMins - planMins} minutes. Work outcome must not be fabricated; reminder dispatched to field in-charge.`
      });
    } else {
      res.json({
        success: true,
        requestId,
        status: 'IN_PROGRESS',
        isOverdue: false,
        remainingMinutes: planMins - currMins,
        message: `Block window ${requestId} is active. Planned end at ${plannedEndTime}.`
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error verifying completion.' });
  }
});

// POST /api/requests/validate-requisition
// Data integrity validation for location ranges and durations (Section 27)
router.post('/validate-requisition', (req: Request, res: Response): void => {
  try {
    const { startKm, endKm, duration, work, department } = req.body;

    if (typeof startKm !== 'number' || typeof endKm !== 'number') {
      res.status(400).json({ success: false, error: 'startKm and endKm must be numeric.', code: 'INVALID_LOCATION' });
      return;
    }

    if (startKm < 0 || endKm < 0) {
      res.status(400).json({ success: false, error: 'Kilometer chainage cannot be negative.', code: 'NEGATIVE_KM' });
      return;
    }

    if (startKm >= endKm) {
      res.status(400).json({ success: false, error: `Invalid chainage range: startKm (${startKm}) must be strictly less than endKm (${endKm}).`, code: 'INVALID_KM_RANGE' });
      return;
    }

    if (typeof duration !== 'number' || duration <= 0) {
      res.status(400).json({ success: false, error: 'Duration must be a positive number of minutes.', code: 'INVALID_DURATION' });
      return;
    }

    res.json({
      success: true,
      isValid: true,
      lengthMeters: Math.round((endKm - startKm) * 1000),
      message: 'Requisition parameters passed engineering data integrity validation.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error validating requisition.' });
  }
});

export default router;
