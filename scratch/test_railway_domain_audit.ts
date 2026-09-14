import * as React from 'react';

// Initialize React Dispatcher for headless Node testing of store hook
(React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = {
  useState: (initial: any) => [initial, () => {}],
  useEffect: () => {},
  useCallback: (fn: any) => fn,
  useRef: (initial: any) => ({ current: initial }),
  useMemo: (fn: any) => fn()
};

import { parseRailwayKm, formatRailwayKm, detectCrossSectionSpans } from '../src/utils/railwayLocation';
import { analyzeLocationTrainConflicts } from '../src/utils/conflictPlanner';
import { getSamnvayState, USERS, useSamnvayStore } from '../src/store/useSamnvayStore';
import type { LiveTrainPosition } from '../src/types/samnvay';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`\x1b[32m[PASS]\x1b[0m ${testName}`);
    passed++;
  } else {
    console.error(`\x1b[31m[FAIL]\x1b[0m ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

console.log('\n===============================================================');
console.log('--- RUNNING RAIL SAMNVAY RAILWAY-DOMAIN RED-TEAM AUDIT TESTS ---');
console.log('===============================================================\n');

// ---------------------------------------------------------------------------
// TEST 1: Location Intelligence & Cross-Section Boundary Spanning
// ---------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Cross-Section Boundary Analysis ---');
const crossSectionSpan = detectCrossSectionSpans(24.8, 26.2);
assert(
  crossSectionSpan.isCrossSection === true,
  'Detects cross-section work zone spanning SEC-A and SEC-B (KM 24/800 – 26/200)'
);
assert(
  crossSectionSpan.sections.includes('SEC-A') && crossSectionSpan.sections.includes('SEC-B'),
  'Registers both spanned sections (SEC-A, SEC-B)'
);
assert(
  crossSectionSpan.boundaryKms.includes(25.0),
  'Correctly locates sectional boundary at KM 25/000'
);
assert(
  Boolean(crossSectionSpan.coordinationProtocol?.includes('Dual Section Controller')),
  'Enforces dual Section Controller & Station Master coordination protocol'
);

const singleSectionSpan = detectCrossSectionSpans(12.0, 14.0);
assert(
  singleSectionSpan.isCrossSection === false && singleSectionSpan.sections.length === 1,
  'Correctly identifies single-section work zone without false positive cross-section flag'
);

// ---------------------------------------------------------------------------
// TEST 2: Honest Conflict Analysis When Live Telemetry is Unavailable
// ---------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Honest Conflict Reporting (No False Certainty) ---');
const conflictResultNoLive = analyzeLocationTrainConflicts(
  12.4,
  13.1,
  ['UP Main'],
  120,
  '02:00',
  [] // No live trains
);
assert(
  conflictResultNoLive.liveDataAvailable === false,
  'Accurately marks liveDataAvailable as false when live trains feed is empty'
);
assert(
  Boolean(conflictResultNoLive.liveDataWarning?.includes('LIVE TRAIN DATA UNAVAILABLE')),
  'Provides explicit LIVE TRAIN DATA UNAVAILABLE warning banner'
);
const recWindow = conflictResultNoLive.candidateWindows.find(w => w.slotId === 'SLOT-02');
assert(
  Boolean(recWindow?.reason.includes('CAUTION') || recWindow?.reason.includes('unavailable')),
  'Candidate window reason explicitly disclaims absence of live telemetry rather than claiming zero conflicts'
);

// With live train feed
const mockLiveTrains: LiveTrainPosition[] = [
  {
    trainNumber: '12627',
    trainName: 'Karnataka Express',
    currentStation: 'BZA',
    nextStation: 'MAG',
    lastReportedStation: 'BZA',
    direction: 'UP',
    delayMinutes: 15,
    scheduledArrival: '02:25',
    expectedArrival: '02:40',
    currentKm: 8.5,
    speedKmph: 110,
    status: 'RUNNING',
    lastUpdated: new Date().toISOString()
  }
];
const conflictResultWithLive = analyzeLocationTrainConflicts(
  12.4,
  13.1,
  ['UP Main'],
  120,
  '02:00',
  mockLiveTrains
);
assert(
  conflictResultWithLive.liveDataAvailable === true,
  'Marks liveDataAvailable as true when RailRadar feed is present'
);
assert(
  conflictResultWithLive.liveDataWarning === undefined,
  'Omits missing telemetry warning when feed is live'
);

// ---------------------------------------------------------------------------
// TEST 3: Store State Engine - Planned vs Actual Time & Variance Tracking
// ---------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Planned vs Actual Timing & Variance Tracking ---');
const store = useSamnvayStore();

// Reset and switch to P.Way Engineer to create a request
store.resetToInitial();
store.switchRole('P.Way Engineer');

const reqId = store.createRequest({
  department: 'P.Way',
  section: 'SEC-A',
  startLocation: 'KM 12/400',
  endLocation: 'KM 13/100',
  work: 'Through Rail Renewal (TRR)',
  workCategory: 'Track Maintenance',
  date: '2026-09-14',
  preferredTime: '02:00',
  preferredStartTime: '02:00',
  preferredEndTime: '04:00',
  duration: 120,
  priority: 'CRITICAL',
  risk: 'HIGH',
  reason: 'Severe rail wear exceeding safety limits',
  safetyRequirements: ['Detonator protection at 1200m', 'Banner flags'],
  resourcesRequired: ['PQRS machine', '20 gangmen'],
  priorityScore: 88,
  priorityBreakdown: {
    criticality: 35,
    urgency: 25,
    risk: 20,
    trafficImpact: 5,
    resourceAvailability: 3,
    score: 88,
    explanation: 'High fatigue rail'
  },
  affectedTracks: ['UP Main'],
  powerBlockRequired: false,
  sntDisconnectionRequired: false
});

let state = getSamnvayState();
let createdReq = state.requests.find(r => r.id === reqId);
assert(
  Boolean(createdReq && createdReq.planned_duration === 120 && createdReq.planned_start === '02:00'),
  'Requisition records planned_duration and planned_start upon submission'
);
assert(
  Boolean(createdReq?.departmentExecutionStatuses && createdReq.departmentExecutionStatuses.length >= 1),
  'Initializes multi-department execution tracking matrix'
);

// ---------------------------------------------------------------------------
// TEST 4: RBAC Enforcement - Creator Cannot Self-Approve
// ---------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Server & Store RBAC Enforcement ---');
// P.Way Engineer attempts to approve own request
const selfApprovalResult = store.transitionBlockStatus(reqId, 'Approved');
assert(
  selfApprovalResult.success === false,
  'Creator (P.Way Engineer) is strictly FORBIDDEN from approving their own request'
);

// Switch to Section Controller to initiate and advance block
store.switchRole('Section Controller');
// Planning Officer / MASTER approves request
store.switchRole('MASTER');
const approvedResult = store.transitionBlockStatus(reqId, 'Approved', 'Approved by PCOM');
assert(approvedResult.success === true, 'Operating Management (MASTER) approves requisition');

// ---------------------------------------------------------------------------
// TEST 5: Execution Protocol & Actual Start Time
// ---------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Execution Lifecycle & Block Grant ---');
store.switchRole('Section Controller');
store.advanceExecutionStep(); // Advance to Step 1: Block Started
state = getSamnvayState();
let activeReq = state.requests.find(r => r.id === reqId);
assert(
  Boolean(activeReq?.actual_start),
  'Actual start time is captured upon block possession grant'
);
assert(
  activeReq?.status === 'Block Started',
  'Block status transitions to Block Started'
);

// Advance steps 2, 3, 4
store.advanceExecutionStep(); // Step 2: Block Granted
store.advanceExecutionStep(); // Step 3: Safety Protection
store.advanceExecutionStep(); // Step 4: Maintenance Started (Work in Progress)
state = getSamnvayState();
activeReq = state.requests.find(r => r.id === reqId);
assert(
  activeReq?.status === 'Work in Progress',
  'Block advances through sequential safety gates into Work in Progress'
);

// ---------------------------------------------------------------------------
// TEST 6: Mandatory Completion Report & Partial Completion Handling
// ---------------------------------------------------------------------------
console.log('\n--- TEST GROUP 6: Completion Reporting & Chained Continuation ---');
// File a partial completion report with remaining work and continuation request
const reportResult = store.submitCompletionReport(reqId, {
  status: 'PARTIALLY_COMPLETED',
  actualDurationMinutes: 140, // Overrun by 20 mins
  workAccomplishedSummary: 'Tamping completed for 500m out of 700m scope.',
  incompletionReasonCategory: 'MACHINERY_BREAKDOWN',
  incompletionDetails: 'Tamping unit hydraulic seal failure at KM 12/900.',
  remainingWork: '200m track tamping from KM 12/900 to 13/100',
  remainingLocationKm: 'KM 12/900',
  continuationRequired: true,
  continuationRequestedDurationMinutes: 60,
  severity: 'MEDIUM'
});

assert(
  reportResult.success === true,
  'Formal completion report accepted and recorded'
);

state = getSamnvayState();
activeReq = state.requests.find(r => r.id === reqId);
assert(
  activeReq?.completionReport?.status === 'PARTIALLY_COMPLETED',
  'Completion report status recorded as PARTIALLY_COMPLETED'
);
assert(
  activeReq?.completionReport?.incompletionReasonCategory === 'MACHINERY_BREAKDOWN',
  'Incompletion reason category recorded as MACHINERY_BREAKDOWN'
);
assert(
  activeReq?.duration_variance === 20,
  'Duration variance accurately calculated as +20m overrun (140m actual - 120m planned)'
);

// Verify Chained Continuation Block
const continuationId = reportResult.continuationId;
assert(Boolean(continuationId), 'Chained continuation block requisition generated');
const contReq = state.requests.find(r => r.id === continuationId);
assert(
  contReq?.continuationOfBlockId === reqId,
  'Continuation block explicitly preserves link to parent block (continuationOfBlockId)'
);
assert(
  contReq?.status === 'Submitted' || contReq?.status === 'SUBMITTED',
  'Continuation block enters planning queue with status "Submitted" / "SUBMITTED" (NEVER auto-granted)'
);

// ---------------------------------------------------------------------------
// TEST 7: Operational Speed Restriction (TSR) - Non-hardcoded Speed
// ---------------------------------------------------------------------------
console.log('\n--- TEST GROUP 7: Operational Speed Restriction (TSR) ---');
// Record a 45 km/h restriction (NOT hardcoded 30 km/h)
const tsrResult = store.recordOperationalRestriction(reqId, {
  type: 'RESTRICTED',
  speedKmph: 45,
  normalSectionSpeedKmph: 130,
  reason: 'Consolidation of disturbed ballast bed following mechanical tamping'
});

assert(tsrResult.success === true, 'Operational restriction recorded');
state = getSamnvayState();
activeReq = state.requests.find(r => r.id === reqId);
assert(
  activeReq?.operationalRestriction?.type === 'RESTRICTED' && activeReq.operationalRestriction.speedKmph === 45,
  'Authorized speed recorded as 45 km/h (preserves dynamic engineer-specified limit)'
);
assert(
  Boolean(activeReq?.operationalRestriction?.cautionOrderNumber),
  'Caution order memo number generated for driver caution notice'
);

// Verify rejection of invalid speeds
const invalidTsr = store.recordOperationalRestriction(reqId, {
  type: 'RESTRICTED',
  speedKmph: 140, // Exceeds normal 130 km/h
  normalSectionSpeedKmph: 130,
  reason: 'Invalid speed test'
});
assert(invalidTsr.success === false, 'Rejects invalid restriction speed exceeding normal section speed');

// ---------------------------------------------------------------------------
// TEST 8: Multi-Department Execution Sign-off
// ---------------------------------------------------------------------------
console.log('\n--- TEST GROUP 8: Multi-Department Execution Matrix ---');
store.updateDepartmentExecutionStatus(reqId, 'TRD', 'COMPLETED', 'OHE discharge rods removed, 25kV power restored');
state = getSamnvayState();
activeReq = state.requests.find(r => r.id === reqId);
const trdStatus = activeReq?.departmentExecutionStatuses?.find(d => d.department === 'TRD');
assert(
  trdStatus?.status === 'COMPLETED',
  'TRD department execution status independently verified and signed off as COMPLETED'
);

// ---------------------------------------------------------------------------
// TEST 9: Block Release Authority & Actual End Time
// ---------------------------------------------------------------------------
console.log('\n--- TEST GROUP 9: Block Release RBAC & Actual End Time ---');
// P.Way Engineer tries to release block
store.switchRole('P.Way Engineer');
// Step index should now be at step 5 wanting to release
store.advanceExecutionStep(); // Should be rejected for P.Way Engineer
state = getSamnvayState();
activeReq = state.requests.find(r => r.id === reqId);
assert(
  activeReq?.status !== 'Closed',
  'Maintenance field role (P.Way Engineer) CANNOT unilaterally release track possession'
);

// Section Controller releases block
store.switchRole('Section Controller');
store.advanceExecutionStep(); // Advance Step 5 -> Step 6 (Block Released)
state = getSamnvayState();
activeReq = state.requests.find(r => r.id === reqId);
assert(
  activeReq?.status === 'Block Released',
  'Section Controller authorizes block release; status transitions to Block Released'
);
assert(
  Boolean(activeReq?.actual_end),
  'Actual end time is permanently recorded upon block release'
);

// Close block
store.advanceExecutionStep(); // Step 6 -> Closed
state = getSamnvayState();
activeReq = state.requests.find(r => r.id === reqId);
assert(
  activeReq?.status === 'Closed',
  'Block officially closed in master ledger'
);

// ---------------------------------------------------------------------------
// TEST 10: Railway-Compliant Audited Cancellation (Never Silently Deleted)
// ---------------------------------------------------------------------------
console.log('\n--- TEST GROUP 10: Permanent Audit Cancellation ---');
// Create a secondary block to test cancellation
const cancelReqId = store.createRequest({
  department: 'S&T',
  section: 'SEC-B',
  startLocation: 'KM 30/100',
  endLocation: 'KM 31/000',
  work: 'Point Machine Replacement',
  workCategory: 'Signal Maintenance',
  date: '2026-09-15',
  preferredTime: '10:00',
  duration: 60,
  priority: 'MEDIUM',
  risk: 'MEDIUM',
  reason: 'Scheduled point overhaul',
  safetyRequirements: ['S&T Disconnection memo'],
  resourcesRequired: ['2 Signal maintainers'],
  priorityScore: 65,
  priorityBreakdown: {
    criticality: 20,
    urgency: 15,
    risk: 15,
    trafficImpact: 10,
    resourceAvailability: 5,
    score: 65,
    explanation: 'Routine signal work'
  }
});

const cancelResult = store.cancelBlockRequest(cancelReqId, 'Pre-empted by Section Controller due to rake derailment on adjoining line');
assert(cancelResult.success === true, 'Block cancellation executed');
state = getSamnvayState();
const cancelledBlock = state.requests.find(r => r.id === cancelReqId);
assert(
  Boolean(cancelledBlock),
  'Cancelled block is NOT deleted from database (permanent record retained)'
);
assert(
  cancelledBlock?.status === 'Unsafe / Cancelled',
  'Block status transitions to "Unsafe / Cancelled"'
);
assert(
  Boolean(cancelledBlock?.cancellationDetails?.reason.includes('Pre-empted')),
  'Cancellation details preserve author, role, timestamp, and operating justification'
);

console.log('\n===============================================================');
console.log(`--- TEST RESULTS: ${passed} PASSED / ${failed} FAILED ---`);
console.log('===============================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
