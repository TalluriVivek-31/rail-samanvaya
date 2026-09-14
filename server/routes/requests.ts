import { Router, Request, Response } from 'express';
import { validateSession } from '../services/authService.js';

const router = Router();

interface ApprovalRequestBody {
  requestId: string;
  requesterName?: string;
  requesterEmployeeId?: string;
  currentStatus?: string;
  targetStatus: string;
  remarks?: string;
  permit_to_work_private_number?: string;
  return_private_number?: string;
  departmentExecutionStatuses?: { department: string; status: string }[];
}

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  // --- REAL RAILWAY OPERATIONAL LIFECYCLE (23 STATES) ---
  'DRAFT': ['SUBMITTED', 'CANCELLED', 'Unsafe / Cancelled'],
  'SUBMITTED': ['DEPARTMENT_APPROVED', 'PLANNING', 'REVISION_REQUIRED', 'Revision Required', 'REJECTED', 'Rejected', 'CANCELLED', 'Unsafe / Cancelled'],
  'DEPARTMENT_APPROVED': ['PLANNING', 'RECOMMENDED', 'REJECTED', 'Rejected', 'CANCELLED', 'Unsafe / Cancelled'],
  'PLANNING': ['RECOMMENDED', 'PLAN_APPROVED', 'CANCELLED', 'Unsafe / Cancelled'],
  'RECOMMENDED': ['PLAN_APPROVED', 'REVISION_REQUIRED', 'Revision Required', 'CANCELLED', 'Unsafe / Cancelled'],
  'PLAN_APPROVED': ['BLOCK_REQUESTED', 'AUTHORIZED', 'CANCELLED', 'Unsafe / Cancelled'],
  'BLOCK_REQUESTED': ['AUTHORIZED', 'SCHEDULED', 'CANCELLED', 'Unsafe / Cancelled'],
  'AUTHORIZED': ['SCHEDULED', 'IMPOSED', 'RESCHEDULED', 'Rescheduled', 'CANCELLED', 'Unsafe / Cancelled'],
  'SCHEDULED': ['IMPOSED', 'WORK_STARTED', 'RESCHEDULED', 'Rescheduled', 'CANCELLED', 'Unsafe / Cancelled'],
  'IMPOSED': ['WORK_STARTED', 'WORK_IN_PROGRESS', 'CANCELLED', 'Unsafe / Cancelled'],
  'WORK_STARTED': ['WORK_IN_PROGRESS', 'BLOCK_WINDOW_ENDING', 'COMPLETION_REPORT_REQUIRED', 'COMPLETED', 'PARTIALLY_COMPLETED', 'NOT_COMPLETED', 'CANCELLED', 'Unsafe / Cancelled'],
  'WORK_IN_PROGRESS': ['BLOCK_WINDOW_ENDING', 'COMPLETION_REPORT_REQUIRED', 'COMPLETED', 'PARTIALLY_COMPLETED', 'NOT_COMPLETED', 'CANCELLED', 'Unsafe / Cancelled'],
  'BLOCK_WINDOW_ENDING': ['COMPLETION_REPORT_REQUIRED', 'COMPLETED', 'PARTIALLY_COMPLETED', 'NOT_COMPLETED'],
  'COMPLETION_REPORT_REQUIRED': ['COMPLETED', 'PARTIALLY_COMPLETED', 'NOT_COMPLETED'],
  'COMPLETED': ['BLOCK_RETURNED'],
  'PARTIALLY_COMPLETED': ['BLOCK_RETURNED'],
  'NOT_COMPLETED': ['BLOCK_RETURNED'],
  'BLOCK_RETURNED': ['RESTORATION_PENDING', 'RESTRICTED', 'NORMAL_RESTORED'],
  'RESTORATION_PENDING': ['RESTRICTED', 'NORMAL_RESTORED'],
  'RESTRICTED': ['NORMAL_RESTORED'],
  'NORMAL_RESTORED': ['CLOSED', 'Closed'],
  'CLOSED': [],
  'CANCELLED': [],

  // --- LEGACY / DISPLAY STATE ALIASES ---
  'Draft': ['Submitted', 'SUBMITTED', 'Unsafe / Cancelled', 'CANCELLED'],
  'Submitted': ['Review', 'DEPARTMENT_APPROVED', 'Verified', 'Approved', 'Rejected', 'REJECTED', 'Revision Required', 'Unsafe / Cancelled', 'Planning Queue', 'PLANNING'],
  'Review': ['Verified', 'DEPARTMENT_APPROVED', 'Approved', 'Rejected', 'Revision Required', 'Unsafe / Cancelled'],
  'Verified': ['DEPARTMENT_APPROVED', 'Approved', 'Rejected', 'Revision Required', 'Unsafe / Cancelled'],
  'Approved': ['Planning Queue', 'PLANNING', 'AI/OR Optimization', 'RECOMMENDED', 'Block Window Allocated', 'PLAN_APPROVED', 'Scheduled', 'AUTHORIZED', 'Unsafe / Cancelled'],
  'Planning Queue': ['AI/OR Optimization', 'RECOMMENDED', 'Block Window Allocated', 'PLAN_APPROVED', 'Scheduled', 'AUTHORIZED', 'Unsafe / Cancelled'],
  'AI/OR Optimization': ['RECOMMENDED', 'Block Window Allocated', 'PLAN_APPROVED', 'Scheduled', 'AUTHORIZED', 'Unsafe / Cancelled'],
  'Block Window Allocated': ['Scheduled', 'AUTHORIZED', 'Unsafe / Cancelled', 'Rescheduled'],
  'Scheduled': ['Block Started', 'IMPOSED', 'WORK_STARTED', 'Delayed / Headway Conflict', 'Unsafe / Cancelled', 'Rescheduled'],
  'Block Started': ['Work in Progress', 'WORK_IN_PROGRESS', 'Unsafe / Cancelled'],
  'Work in Progress': ['Work Completed', 'BLOCK_WINDOW_ENDING', 'COMPLETION_REPORT_REQUIRED', 'COMPLETED', 'PARTIALLY_COMPLETED', 'NOT_COMPLETED', 'Inspection/Safety Verification', 'Block Release Requested', 'Block Released', 'BLOCK_RETURNED'],
  'Work Completed': ['Inspection/Safety Verification', 'Block Release Requested', 'Block Released', 'BLOCK_RETURNED'],
  'Inspection/Safety Verification': ['Block Release Requested', 'Block Released', 'BLOCK_RETURNED'],
  'Block Release Requested': ['Block Released', 'BLOCK_RETURNED'],
  'Block Released': ['Closed', 'CLOSED', 'RESTORATION_PENDING', 'NORMAL_RESTORED'],
  'Closed': [],
  'Rejected': [],
  'Unsafe / Cancelled': []
};

// POST /api/requests/approve
// Enforces server-side RBAC validation across all 23 states of the Indian Railways maintenance lifecycle:
// 1. Creator cannot approve their own request (unless MASTER)
// 2. Field engineers cannot issue Operating Approvals, Schedule Possessions, or Impose Blocks
// 3. Planning Officers generate recommendations and cannot unilaterally authorize or schedule blocks
// 4. Operating Control Authority (COA / Operations / Section Controller) exclusively authorizes, schedules, imposes, and returns blocks
// 5. Multi-department release gate prevents releasing/returning coordinated blocks without full sign-off
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
    const { 
      requestId, 
      requesterName, 
      requesterEmployeeId, 
      currentStatus, 
      targetStatus, 
      remarks, 
      permit_to_work_private_number,
      return_private_number,
      departmentExecutionStatuses 
    } = body;

    if (!requestId || !targetStatus) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: requestId and targetStatus are mandatory.',
        code: 'BAD_REQUEST'
      });
      return;
    }

    // State Machine Security & Duplicate Approval Prevention
    if (currentStatus) {
      if ((currentStatus === 'Approved' || currentStatus === 'PLAN_APPROVED' || currentStatus === 'AUTHORIZED') && 
          (targetStatus === currentStatus)) {
        res.status(409).json({
          success: false,
          error: `Duplicate Approval: Request ${requestId} has already reached state '${targetStatus}'; duplicate approval rejected.`,
          code: 'ALREADY_APPROVED'
        });
        return;
      }

      if (['Unsafe / Cancelled', 'Cancelled', 'CANCELLED'].includes(currentStatus)) {
        res.status(400).json({
          success: false,
          error: `Terminal State Error: Cannot transition request ${requestId} from cancelled state '${currentStatus}' to '${targetStatus}'.`,
          code: 'CANNOT_TRANSITION_CANCELLED'
        });
        return;
      }

      if (['Closed', 'CLOSED'].includes(currentStatus)) {
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

    if (['Approved', 'DEPARTMENT_APPROVED', 'PLAN_APPROVED', 'AUTHORIZED'].includes(targetStatus) && isSameUser && sessionUser.role !== 'MASTER') {
      res.status(403).json({
        success: false,
        error: 'Forbidden: The request creator is not permitted to approve their own request under Railway Operating Safety Rules.',
        code: 'SELF_APPROVAL_FORBIDDEN'
      });
      return;
    }

    // Strict Rule 2: Field department engineers (P.Way, S&T, TRD) cannot issue Operating Approval, Plan Approval, or Schedule Possessions
    if (['Approved', 'PLAN_APPROVED', 'AUTHORIZED', 'SCHEDULED', 'Scheduled'].includes(targetStatus)) {
      if (['P.Way Engineer', 'S&T Engineer', 'TRD Engineer'].includes(sessionUser.role)) {
        res.status(403).json({
          success: false,
          error: `Forbidden: Maintenance field role '${sessionUser.role}' cannot authorize or schedule blocks. Requisitions require Technical Verification and Operating Control Authority authorization.`,
          code: 'INSUFFICIENT_PRIVILEGES'
        });
        return;
      }
    }

    // Strict Rule 3: Operating Control Authority (COA / Operations / Section Controller) exclusively authorizes & schedules possessions
    // Planning Officers generate recommendations and cannot unilaterally grant, authorize, or schedule blocks
    const isOperatingControl = sessionUser.role === 'COA / Operations' || sessionUser.role === 'Section Controller';
    const isMasterAdmin = sessionUser.role === 'MASTER';

    if (['AUTHORIZED', 'SCHEDULED', 'Scheduled'].includes(targetStatus)) {
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

    // Strict Rule 4: Only Operating Control / Section Controller can execute Block Imposition (IMPOSED, Block Started) or Block Return (BLOCK_RETURNED, Block Released)
    if (['IMPOSED', 'Block Started', 'WORK_STARTED', 'BLOCK_RETURNED', 'Block Released'].includes(targetStatus)) {
      if (!isOperatingControl && !isMasterAdmin) {
        res.status(403).json({
          success: false,
          error: `Forbidden: Only Section Controller / Operating Control Authority (COA / Operations) can execute '${targetStatus}'.`,
          code: 'OPERATING_CONTROL_ONLY'
        });
        return;
      }
    }

    // Strict Rule 5: Multi-Department Block Return Gate (Section 19 of specification)
    // A coordinated block CANNOT be returned/released while any participating department has unfinished work without sign-off
    if (['BLOCK_RETURNED', 'Block Released'].includes(targetStatus) && departmentExecutionStatuses && departmentExecutionStatuses.length > 0) {
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

    const isOverride = isMasterAdmin && ['Scheduled', 'SCHEDULED', 'AUTHORIZED'].includes(targetStatus);
    const formattedRemarks = isOverride
      ? `[Administrative Override] ${remarks || 'Authorized via MASTER Prototype System Administrator Override.'}`
      : (remarks || 'Authorized via Central Railway Operating Control Authority.');

    const nowIso = new Date().toISOString();

    res.json({
      success: true,
      message: `Request ${requestId} transition to '${targetStatus}' authorized by ${sessionUser.name} (${sessionUser.role})${isOverride ? ' [Administrative Override]' : ''}.`,
      requestId,
      targetStatus,
      authorizedBy: sessionUser.name,
      actorRole: sessionUser.role,
      isAdministrativeOverride: isOverride,
      remarks: formattedRemarks,
      permit_to_work_private_number: permit_to_work_private_number || (['IMPOSED', 'Block Started'].includes(targetStatus) ? `SIM-PN-GR-${Math.floor(1000 + Math.random() * 9000)}` : undefined),
      return_private_number: return_private_number || (['BLOCK_RETURNED', 'Block Released'].includes(targetStatus) ? `SIM-PN-RET-${Math.floor(1000 + Math.random() * 9000)}` : undefined),
      isSimulatedPrivateNumber: true,
      timestamp: nowIso
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
      actual_start,
      actual_end,
      workAccomplishedSummary,
      remarks,
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
      departmentExecutionStatuses,
      severity
    } = req.body;

    if (!requestId || !status) {
      res.status(400).json({ success: false, error: 'requestId and status are required.', code: 'BAD_REQUEST' });
      return;
    }

    const validStatuses = ['WORK_COMPLETED', 'PARTIALLY_COMPLETED', 'WORK_NOT_COMPLETED', 'COMPLETED', 'NOT_COMPLETED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: `Invalid completion status '${status}'. Valid values: ${validStatuses.join(', ')}`, code: 'INVALID_STATUS' });
      return;
    }

    const isPartial = status === 'PARTIALLY_COMPLETED';
    const isNotCompleted = status === 'WORK_NOT_COMPLETED' || status === 'NOT_COMPLETED';

    if ((isPartial || isNotCompleted) && !incompletionReasonCategory && !remarks && !incompletionDetails) {
      res.status(400).json({ 
        success: false, 
        error: 'Reason / Justification is mandatory when work is PARTIALLY_COMPLETED or NOT_COMPLETED.', 
        code: 'REASON_REQUIRED' 
      });
      return;
    }

    if (isPartial && !remainingWork && !incompletionDetails) {
      res.status(400).json({ 
        success: false, 
        error: 'Remaining work specification is mandatory when work is PARTIALLY_COMPLETED.', 
        code: 'REMAINING_WORK_REQUIRED' 
      });
      return;
    }

    const variance = (actualDurationMinutes || 0) - (plannedDurationMinutes || 0);
    const reportId = `REP-COMP-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Multi-Department Coordinated Work Outcome Handling (Section 14 of specification)
    // If ANY participating department is PARTIAL or NOT COMPLETED, the coordinated block status resolves to PARTIALLY_COMPLETED
    let finalBlockStatus = (status === 'WORK_COMPLETED' || status === 'COMPLETED') ? 'COMPLETED' : status;
    if (departmentExecutionStatuses && departmentExecutionStatuses.length > 0) {
      const anyPartial = departmentExecutionStatuses.some((d: any) => d.status === 'PARTIALLY_COMPLETED' || d.status === 'PARTIAL');
      const anyIncomplete = departmentExecutionStatuses.some((d: any) => d.status === 'WORK_NOT_COMPLETED' || d.status === 'NOT_COMPLETED');
      if (anyPartial || anyIncomplete) {
        finalBlockStatus = 'PARTIALLY_COMPLETED';
      }
    }

    // WORK_COMPLETED does NOT equal NORMAL_OPERATION_RESTORED (Section 3, 4, 16, 17 of specification)
    // Infrastructure condition defaults to RESTORATION_PENDING until formal authorized restoration occurs
    const determinedCondition = reqCondition || (
      finalBlockStatus === 'COMPLETED' ? 'RESTORATION_PENDING' : 'RESTRICTED'
    );

    res.json({
      success: true,
      message: `Completion report for ${requestId} recorded: ${finalBlockStatus} by ${sessionUser.name} (${sessionUser.role}). Infrastructure condition: ${determinedCondition}.`,
      blockStatus: finalBlockStatus,
      completionReport: {
        id: reportId,
        requestId,
        blockId,
        status: finalBlockStatus,
        completedAt: timestamp,
        actualWorkCompletion: actualWorkCompletion || timestamp,
        actual_start: actual_start || undefined,
        actual_end: actual_end || timestamp,
        submittedBy: sessionUser.name,
        userRole: sessionUser.role,
        department: sessionUser.department,
        plannedDurationMinutes: plannedDurationMinutes || 0,
        actualDurationMinutes: actualDurationMinutes || 0,
        varianceMinutes: variance,
        workAccomplishedSummary: workAccomplishedSummary || remarks || 'Work completed per engineering specification.',
        incompletionReasonCategory,
        incompletionDetails: incompletionDetails || remarks,
        remainingWork: isPartial ? (remainingWork || 'Remaining track/catenary work required') : 'none',
        remainingLocationKm,
        remainingStartKm,
        remainingEndKm,
        remainingEstimatedDurationMinutes,
        infrastructureCondition: determinedCondition,
        continuationRequired: Boolean(continuationRequired || isPartial),
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
      original_maintenance_requirement_id,
      original_block_request_id,
      original_block_plan_id,
      previous_execution_id,
      department,
      remainingWork, 
      remainingLocationKm, 
      remainingStartKm,
      remainingEndKm,
      startLocation,
      endLocation,
      requestedDurationMinutes, 
      remaining_duration,
      reason, 
      severity,
      preferredDate, 
      preferredTime 
    } = req.body;

    const parentId = parentRequestId || original_block_request_id || original_maintenance_requirement_id;
    const durMins = requestedDurationMinutes || remaining_duration;

    if (!parentId || !remainingWork || !durMins) {
      res.status(400).json({ 
        success: false, 
        error: 'parentRequestId (or original_block_request_id), remainingWork, and requestedDurationMinutes are required.', 
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
      message: `Continuation block requisition ${continuationId} generated linked to parent ${parentId}. Requisition is queued for review and planning. NOTE: Continuation blocks are NEVER auto-granted.`,
      continuationRequest: {
        id: continuationId,
        block_request_id: continuationId,
        continuationOfBlockId: parentId,
        parentRequirementId: parentId,
        original_maintenance_requirement_id: original_maintenance_requirement_id || parentId,
        original_block_request_id: original_block_request_id || parentId,
        original_block_plan_id: original_block_plan_id || undefined,
        previous_execution_id: previous_execution_id || undefined,
        department: department || sessionUser.department || 'P.Way',
        engineer: sessionUser.name,
        creatorRole: sessionUser.role,
        work: `[Continuation] ${remainingWork}`,
        startLocation: resolvedStartLocation,
        endLocation: resolvedEndLocation,
        startKm: remainingStartKm,
        endKm: remainingEndKm,
        duration: durMins,
        requested_duration: durMins,
        planned_duration: durMins,
        date: preferredDate || new Date().toISOString().split('T')[0],
        preferredTime: preferredTime || '02:00',
        requested_start: preferredTime || '02:00',
        status: 'SUBMITTED',
        reason: `Continuation of incomplete work on ${parentId}. Reason: ${reason || 'Incomplete work on prior possession window'}`,
        severity: severity || 'MEDIUM',
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
        status: 'COMPLETION_REPORT_REQUIRED',
        operationalStatus: 'COMPLETION_REPORT_REQUIRED',
        isOverdue: true,
        overdueMinutes: currMins - planMins,
        escalationLevel: (currMins - planMins) > 30 ? 'HIGH_ESCALATION' : 'SUPERVISOR_REMINDER',
        message: `COMPLETION_REPORT_REQUIRED: Block ${requestId} planned window ended at ${plannedEndTime}. On-site supervisor completion report is required (${currMins - planMins} minutes overdue). Under railway operating rules, missing completion reports must NEVER be auto-failed; formal reminder dispatched to field in-charge.`
      });
    } else {
      const remainingMinutes = planMins - currMins;
      const isEndingSoon = remainingMinutes <= 15;
      res.json({
        success: true,
        requestId,
        status: isEndingSoon ? 'BLOCK_WINDOW_ENDING' : 'IN_PROGRESS',
        operationalStatus: isEndingSoon ? 'BLOCK_WINDOW_ENDING' : 'WORK_IN_PROGRESS',
        isOverdue: false,
        remainingMinutes,
        message: `Block window ${requestId} is active. Planned end at ${plannedEndTime}.${isEndingSoon ? ' Window is ending within 15 minutes.' : ''}`
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
