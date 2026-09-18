// src/utils/requestLifecycle.ts
// Single-Source-of-Truth Request Lifecycle & State Management
// Indian Railways · Rail Samnvay (SIH PS 26027)

import type { BlockRequest, BlockStatus, OperationalBlockStatus } from '../types/samnvay';

/**
 * Normalizes any status string into a clean uppercase alphanumeric token
 */
export function normalizeStatus(status: string | undefined | null): string {
  return (status || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Canonical check: Is the requisition currently awaiting initial technical or departmental approval?
 * Returns true ONLY for pre-approval stages: SUBMITTED, PENDING, REVISION_REQUIRED, REVIEW.
 * Returns FALSE for APPROVED, DEPARTMENT_APPROVED, PLANNING, SCHEDULED, ACTIVE, COMPLETED, REJECTED, CANCELLED.
 */
export function isPendingApproval(request: BlockRequest): boolean {
  if (!request) return false;
  const s = normalizeStatus(request.status);

  // Rejection, cancellation, or explicit archive are NOT pending approval
  if (s === 'REJECTED' || s === 'CANCELLED' || s === 'UNSAFE' || s === 'UNSAFECANCELLED') {
    return false;
  }

  // Once approved at any stage, it is no longer pending approval
  if (
    s === 'APPROVED' || 
    s === 'DEPARTMENTAPPROVED' || 
    s === 'PLANNING' || 
    s === 'PLANNINGQUEUE' || 
    s === 'BLOCKWINDOWALLOCATED' || 
    s === 'RECOMMENDED' || 
    s === 'WINDOWRECOMMENDED' ||
    s === 'AUTHORIZED' || 
    s === 'BLOCKAUTHORIZED' || 
    s === 'SCHEDULED' || 
    s === 'READYFOREXECUTION' ||
    s === 'IMPOSED' || 
    s === 'WORKSTARTED' || 
    s === 'WORKINPROGRESS' || 
    s === 'ACTIVE' || 
    s === 'COMPLETED' || 
    s === 'WORKCOMPLETED' || 
    s === 'CLOSED'
  ) {
    return false;
  }

  return (
    s === 'SUBMITTED' ||
    s === 'PENDING' ||
    s === 'PWAYSTTRDREVIEW' ||
    s === 'APPROVALPENDING' ||
    s === 'VERIFIED' ||
    s === 'REVIEW' ||
    s === 'REVISION' ||
    s === 'REVISIONREQUIRED'
  );
}

/**
 * Canonical check: Is the requisition eligible for block planning & timetable evaluation?
 * Must be approved by department, but NOT yet authorized/scheduled/in-execution/completed.
 * If request already has an authorized block (authorizedBlockId != null), returns FALSE.
 */
export function isPlanningEligible(request: BlockRequest): boolean {
  if (!request) return false;

  // If already authorized or scheduled with a valid block, it is NOT an unallocated planning request
  if (request.authorizedBlockId && request.planningStatus !== 'REPLAN_REQUESTED') {
    return false;
  }

  const s = normalizeStatus(request.status);

  // If already in or past execution, not eligible for fresh planning
  if (
    s === 'AUTHORIZED' ||
    s === 'BLOCKAUTHORIZED' ||
    s === 'SCHEDULED' ||
    s === 'READYFOREXECUTION' ||
    s === 'IMPOSED' ||
    s === 'WORKSTARTED' ||
    s === 'WORKINPROGRESS' ||
    s === 'ACTIVE' ||
    s === 'COMPLETED' ||
    s === 'WORKCOMPLETED' ||
    s === 'CLOSED' ||
    s === 'REJECTED' ||
    s === 'CANCELLED'
  ) {
    return request.planningStatus === 'REPLAN_REQUESTED';
  }

  // Must be in an approved / planning queue stage
  return (
    s === 'APPROVED' ||
    s === 'DEPARTMENTAPPROVED' ||
    s === 'PLANNING' ||
    s === 'PLANNINGQUEUE' ||
    s === 'BLOCKWINDOWALLOCATED' ||
    s === 'RECOMMENDED' ||
    s === 'WINDOWRECOMMENDED' ||
    request.planningStatus === 'REPLAN_REQUESTED'
  );
}

/**
 * Canonical check: Can a new candidate block or timetable window be allocated to this requisition?
 * Hard Invariant: A request may have only ONE current/active block allocation.
 */
export function isBlockAllocationEligible(request: BlockRequest): boolean {
  if (!request) return false;

  // Active allocation lock
  if (request.authorizedBlockId && request.planningStatus !== 'REPLAN_REQUESTED') {
    return false;
  }

  if (request.scheduledBlockId && request.planningStatus !== 'REPLAN_REQUESTED') {
    return false;
  }

  return isPlanningEligible(request);
}

/**
 * Canonical check: Is the requisition in the active execution phase?
 * Encompasses authorized/scheduled through work and track clearance/restoration.
 */
export function isExecutionEligible(request: BlockRequest): boolean {
  if (!request) return false;
  const s = normalizeStatus(request.status);

  return (
    s === 'AUTHORIZED' ||
    s === 'BLOCKAUTHORIZED' ||
    s === 'SCHEDULED' ||
    s === 'READYFOREXECUTION' ||
    s === 'IMPOSED' ||
    s === 'WORKSTARTED' ||
    s === 'WORKINPROGRESS' ||
    s === 'ACTIVE' ||
    s === 'COMPLETIONREPORTREQUIRED' ||
    s === 'BLOCKWINDOWENDING' ||
    s === 'BLOCKRETURNED' ||
    s === 'RESTORATIONPENDING' ||
    s === 'RESTRICTED' ||
    s === 'NORMALRESTORED'
  );
}

/**
 * Canonical check: Has the requisition completed its operational execution lifecycle?
 */
export function isCompleted(request: BlockRequest): boolean {
  if (!request) return false;
  const s = normalizeStatus(request.status);

  return (
    s === 'COMPLETED' ||
    s === 'WORKCOMPLETED' ||
    s === 'CLOSED' ||
    s === 'NORMALRESTORED' ||
    s === 'RESTRICTED'
  );
}
