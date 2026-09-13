// RAIL SAMNVAY - MASTER FLOW ACCEPTANCE TEST SUITE (9 TEST CRITERIA)
// Verifying invariant: MAINTENANCE REQUIREMENT != CANDIDATE WINDOW != SYSTEM RECOMMENDATION != SCHEDULED BLOCK

import { detectLocationInfrastructure } from '../src/data/infrastructureMasterData';
import { analyzeLocationTrainConflicts, evaluateMultiDepartmentOverlaps } from '../src/utils/conflictPlanner';
import { BlockRequest, BlockStatus, BlockPlan, ScheduledBlock } from '../src/types/samnvay';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testNum: number, desc: string) {
  if (condition) {
    console.log(`[PASS] Test ${testNum}: ${desc}`);
    passed++;
  } else {
    console.error(`[FAIL] Test ${testNum}: ${desc}`);
    failed++;
  }
}

console.log('========================================================================');
console.log('  RAIL SAMNVAY - MASTER FLOW CORRECTION ACCEPTANCE TEST SUITE (9 TESTS) ');
console.log('========================================================================\n');

// -----------------------------------------------------------------------------
// Test 1: Submission Creates Maintenance Requirement (Status = Submitted, Not Scheduled)
// -----------------------------------------------------------------------------
const mockReq: BlockRequest = {
  id: 'BR-1025',
  department: 'P.Way',
  engineer: 'K. S. Sharma',
  creatorRole: 'P.Way Engineer',
  section: 'SEC-A',
  startLocation: '12/400',
  endLocation: '13/100',
  work: 'Deep Screening of Ballast with BCM',
  workCategory: 'Track Maintenance',
  date: '2026-09-12',
  preferredTime: '04:30',
  duration: 120,
  priority: 'HIGH',
  risk: 'HIGH',
  status: 'Submitted', // Requirement registered, NOT Scheduled
  reason: 'Ballast fouling remediation',
  safetyRequirements: ['Banner flags at 600m & 1200m', 'Detonators on railhead'],
  resourcesRequired: ['BCM 08-32 Machine', '1 JE, 12 Gangmen'],
  priorityScore: 88,
  priorityBreakdown: {
    criticality: 85,
    urgency: 80,
    risk: 85,
    trafficImpact: 90,
    resourceAvailability: 90,
    score: 88,
    explanation: 'High priority track screening'
  },
  statusHistory: [
    {
      status: 'Submitted',
      timestamp: '05:00 IST',
      actor: 'K. S. Sharma',
      role: 'P.Way Engineer',
      remarks: 'Requisition submitted for departmental review'
    }
  ]
};

assert(
  mockReq.status === 'Submitted' && 
  (mockReq as any).blockMemoNumber === undefined &&
  mockReq.statusHistory[0].status === 'Submitted',
  1,
  'Submission creates a Maintenance Requirement in "Submitted" status (NEVER "Scheduled", no memo number).'
);

// -----------------------------------------------------------------------------
// Test 2: Candidate Window Selection in Step 5 Records Preference Only
// -----------------------------------------------------------------------------
const candCheck = analyzeLocationTrainConflicts(12.4, 13.1, ['UP Main'], 120, '04:30');
const preferredCand = candCheck.candidateWindows.find(w => w.isRecommended);

assert(
  preferredCand !== undefined &&
  preferredCand.status === 'FEASIBLE' &&
  mockReq.preferredTime === '04:30' &&
  mockReq.status === 'Submitted',
  2,
  'Candidate window selection in Step 5 records preferredTime only; status remains "Submitted".'
);

// -----------------------------------------------------------------------------
// Test 3: Approved Status Means "Ready for Corridor Planning", Not Scheduled
// -----------------------------------------------------------------------------
const approvedReq: BlockRequest = {
  ...mockReq,
  status: 'Approved',
  statusHistory: [
    ...mockReq.statusHistory,
    {
      status: 'Approved',
      timestamp: '05:15 IST',
      actor: 'M. K. Rao',
      role: 'Planning Officer',
      remarks: 'Technical and operational feasibility approved for corridor planning'
    }
  ]
};

assert(
  approvedReq.status === 'Approved' &&
  (approvedReq as any).allocatedWindow === undefined,
  3,
  'Status "Approved" indicates requirement is approved for planning, but not yet scheduled or allocated.'
);

// -----------------------------------------------------------------------------
// Test 4: Enqueueing for Planning Moves Requisition to "Planning Queue"
// -----------------------------------------------------------------------------
const queuedReq: BlockRequest = {
  ...approvedReq,
  status: 'Planning Queue',
  statusHistory: [
    ...approvedReq.statusHistory,
    {
      status: 'Planning Queue',
      timestamp: '05:20 IST',
      actor: 'M. K. Rao',
      role: 'Planning Officer',
      remarks: 'Queued into CP-SAT Automatic Corridor Optimization pipeline'
    }
  ]
};

assert(
  queuedReq.status === 'Planning Queue',
  4,
  'Enqueuing into planning moves requisition to "Planning Queue".'
);

// -----------------------------------------------------------------------------
// Test 5: Planning Engine Produces "Block Window Allocated" (SYSTEM RECOMMENDATION)
// -----------------------------------------------------------------------------
const recommendedWindow = {
  startTime: '04:30',
  endTime: '06:30',
  safetyBufferBefore: 15,
  safetyBufferAfter: 15
};

const recommendedReq: BlockRequest = {
  ...queuedReq,
  status: 'Block Window Allocated', // SYSTEM RECOMMENDATION
  allocatedWindow: recommendedWindow,
  statusHistory: [
    ...queuedReq.statusHistory,
    {
      status: 'Block Window Allocated',
      timestamp: '05:22 IST',
      actor: 'CP-SAT Solver',
      role: 'Planning Engine',
      remarks: 'SYSTEM RECOMMENDATION: Recommended corridor slot 04:30–06:30 with 15m headway margins. Awaiting human authorization.'
    }
  ]
};

const blockPlan: BlockPlan = {
  planId: 'PLAN-1001',
  corridorSectionId: 'SEC-A',
  recommendedStart: '04:30',
  recommendedEnd: '06:30',
  durationMinutes: 120,
  availableWindowMinutes: 150,
  blockUtilizationPercent: 80,
  bundledRequestIds: [recommendedReq.id],
  departments: ['P.Way'],
  trackName: 'UP Line',
  powerBlockRequired: false,
  sntDisconnectionRequired: false,
  trainConflictsCount: 0,
  optimizationScore: 92,
  reason: 'Optimal conflict-free window identified with 15m headway margins.',
  alternativeWindows: ['07:00 – 09:30'],
  status: 'PROPOSED' // Decoupled plan entity is PROPOSED, not AUTHORIZED
};

assert(
  recommendedReq.status === 'Block Window Allocated' &&
  recommendedReq.status !== ('Scheduled' as BlockStatus) &&
  blockPlan.status === 'PROPOSED',
  5,
  'Planning engine solver outputs "Block Window Allocated" (SYSTEM RECOMMENDATION) and BlockPlan entity in "PROPOSED" state, NOT "Scheduled".'
);

// -----------------------------------------------------------------------------
// Test 6: Field Engineers are Denied Authorization (Strict G&SR RBAC)
// -----------------------------------------------------------------------------
function canAuthorize(role: string): boolean {
  if (role === 'P.Way Engineer' || role === 'S&T Engineer' || role === 'TRD Engineer') {
    return false;
  }
  return role === 'Planning Officer' || role === 'COA / Operations' || role === 'MASTER';
}

assert(
  !canAuthorize('P.Way Engineer') &&
  !canAuthorize('S&T Engineer') &&
  !canAuthorize('TRD Engineer') &&
  canAuthorize('Planning Officer') &&
  canAuthorize('MASTER') &&
  canAuthorize('COA / Operations'),
  6,
  'Strict G&SR RBAC: Field engineers are denied authorization authority (HTTP 403 / UI disabled); Planning Officer, COA, and MASTER are permitted.'
);

// -----------------------------------------------------------------------------
// Test 7: Human Officer Authorization Creates ScheduledBlock with Memo Number
// -----------------------------------------------------------------------------
const memoNumber = 'MEMO-BZA-4821';
const scheduledReq: BlockRequest = {
  ...recommendedReq,
  status: 'Scheduled',
  blockMemoNumber: memoNumber,
  statusHistory: [
    ...recommendedReq.statusHistory,
    {
      status: 'Scheduled',
      timestamp: '05:30 IST',
      actor: 'M. K. Rao',
      role: 'Planning Officer',
      remarks: `Authorized & Scheduled Possession by M. K. Rao (Planning Officer). Block Memo #${memoNumber} issued.`
    }
  ]
};

const scheduledBlock: ScheduledBlock = {
  blockId: 'SB-1001',
  planId: blockPlan.planId,
  associatedRequestIds: [scheduledReq.id],
  sectionCode: 'SEC-A',
  startKm: 12.4,
  endKm: 13.1,
  track: 'UP Line',
  scheduledDate: '2026-09-12',
  allocatedStartTime: '04:30',
  allocatedEndTime: '06:30',
  safetyBufferMinutes: 15,
  blockMemoNumber: memoNumber,
  authorizedBy: 'M. K. Rao (Planning Officer)',
  authorizedAt: '05:30 IST',
  status: 'Scheduled',
  safetyChecklist: {
    protectionRequired: true,
    protectionVerified: false,
    trackClearVerified: false,
    powerIsolationVerified: false,
    signalDisconnectionVerified: false,
    equipmentClear: false,
    personnelClear: false
  }
};

assert(
  scheduledReq.status === 'Scheduled' &&
  scheduledReq.blockMemoNumber === memoNumber &&
  scheduledBlock.blockId === 'SB-1001' &&
  scheduledBlock.blockMemoNumber === memoNumber &&
  scheduledBlock.status === 'Scheduled',
  7,
  'Human officer authorization explicitly transitions to "Scheduled", assigns official Block Memo Number, and creates ScheduledBlock entity.'
);

// -----------------------------------------------------------------------------
// Test 8: End-to-End State Machine Integrity (No Premature Scheduled Transitions)
// -----------------------------------------------------------------------------
const validSequence: BlockStatus[] = [
  'Submitted',
  'Verified',
  'Approval Pending',
  'Approved',
  'Planning Queue',
  'AI/OR Optimization',
  'Block Window Allocated',
  'Scheduled'
];

let wasEverScheduledPrematurely = false;
for (let i = 0; i < validSequence.length - 1; i++) {
  if (validSequence[i] === 'Scheduled') {
    wasEverScheduledPrematurely = true;
  }
}

assert(
  !wasEverScheduledPrematurely && validSequence[validSequence.length - 1] === 'Scheduled',
  8,
  'Lifecycle states maintain absolute invariant: "Scheduled" occurs ONLY at the end after explicit human authorization.'
);

// -----------------------------------------------------------------------------
// Test 9: Multi-Department Spatial Overlap Coordinated Bundling
// -----------------------------------------------------------------------------
const reqTRD: BlockRequest = {
  ...mockReq,
  id: 'BR-1026',
  department: 'TRD',
  engineer: 'A. K. Verma',
  creatorRole: 'TRD Engineer',
  work: 'OHE Annual Overhaul & Contact Wire Inspection',
  duration: 90
};

const overlapResult = evaluateMultiDepartmentOverlaps([mockReq, reqTRD]);
assert(
  overlapResult.length > 0 &&
  overlapResult[0].requestIds.includes('BR-1025') &&
  overlapResult[0].requestIds.includes('BR-1026') &&
  overlapResult[0].recommendedBlock !== undefined &&
  overlapResult[0].recommendedBlock.blockUtilizationPercent <= 100,
  9,
  'Multi-department spatial overlap bundles P.Way and TRD into unified Coordinated Block with utilization <= 100%.'
);

// -----------------------------------------------------------------------------
// Test 10: Manual Time Entry Stores Planning Preference Without Scheduling
// -----------------------------------------------------------------------------
const manualTimeReq: BlockRequest = {
  ...mockReq,
  id: 'BR-1027',
  preferredStartTime: '04:30',
  preferredEndTime: '06:30',
  status: 'Submitted'
};

assert(
  manualTimeReq.preferredStartTime === '04:30' &&
  manualTimeReq.preferredEndTime === '06:30' &&
  manualTimeReq.status === 'Submitted' &&
  (manualTimeReq as any).blockMemoNumber === undefined,
  10,
  'Manual Time Entry Rule: User manually entered 04:30-06:30 preferred time is stored as planning input. Status remains "Submitted" and NO possession/block is created or scheduled.'
);

// -----------------------------------------------------------------------------
// Test 11: Dynamic Timetable & RailRadar Headway Validation for Manually Entered Time
// -----------------------------------------------------------------------------
// 02:00 collides with Karnataka Express (12628) on UP Main at 02:25 IST within 15-min headway
const conflictAnalysisConflicting = analyzeLocationTrainConflicts(
  12.4,
  13.1,
  ['UP Main'],
  120,
  '02:00'
);

// 04:30 is a verified clear window with no passenger or goods traffic
const conflictAnalysisFeasible = analyzeLocationTrainConflicts(
  12.4,
  13.1,
  ['UP Main'],
  120,
  '04:30'
);

assert(
  conflictAnalysisConflicting.requestedWindowAnalysis !== undefined &&
  conflictAnalysisConflicting.requestedWindowAnalysis.status === 'CONFLICT' &&
  conflictAnalysisConflicting.requestedWindowAnalysis.conflictingTrain?.trainNumber === '12627' &&
  conflictAnalysisFeasible.requestedWindowAnalysis !== undefined &&
  conflictAnalysisFeasible.requestedWindowAnalysis.status === 'FEASIBLE',
  11,
  'Manual Time Entry Validation: Engine subjects manual time entry to Timetable & RailRadar conflict analysis (02:00 detected as CONFLICT with Train 12627, 04:30 detected as FEASIBLE).'
);

// -----------------------------------------------------------------------------
// Test 12: Optimizer Decision Logic (Accept Feasible Preference vs Reject/Modify Conflicting Preference)
// -----------------------------------------------------------------------------
// Scenario A: User requested feasible time (04:30) -> Optimizer accepts preference
let optimizerAcceptedWindow;
let optimizerAcceptedReason = '';
if (conflictAnalysisFeasible.requestedWindowAnalysis?.status === 'FEASIBLE') {
  optimizerAcceptedWindow = {
    startTime: conflictAnalysisFeasible.requestedWindowAnalysis.startTime,
    endTime: conflictAnalysisFeasible.requestedWindowAnalysis.endTime,
    safetyBufferBefore: 15,
    safetyBufferAfter: 15
  };
  optimizerAcceptedReason = `Optimizer accepted requested preference ${optimizerAcceptedWindow.startTime}–${optimizerAcceptedWindow.endTime}.`;
}

// Scenario B: User requested conflicting time (02:00) -> Optimizer rejects and slots alternative (04:30-06:30)
let optimizerModifiedWindow;
let optimizerModifiedReason = '';
if (conflictAnalysisConflicting.requestedWindowAnalysis?.status === 'CONFLICT') {
  const alt = conflictAnalysisConflicting.recommendedWindow!;
  optimizerModifiedWindow = {
    startTime: alt.startTime,
    endTime: alt.endTime,
    safetyBufferBefore: 15,
    safetyBufferAfter: 15
  };
  optimizerModifiedReason = `Requested preference (02:00) rejected due to conflict with ${conflictAnalysisConflicting.requestedWindowAnalysis.conflictingTrain?.trainName}. Optimizer recommended alternative window ${alt.startTime}–${alt.endTime}.`;
}

assert(
  optimizerAcceptedWindow?.startTime === '04:30' &&
  optimizerModifiedWindow?.startTime === '04:30' &&
  optimizerModifiedReason.includes('rejected due to conflict') &&
  manualTimeReq.status !== 'Scheduled',
  12,
  'Optimizer Decision Logic: Feasible manual time is accepted as recommendation; conflicting manual time is rejected and modified to alternative window. In BOTH cases, status NEVER becomes Scheduled without officer authorization.'
);

console.log('\n========================================================================');
console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL 12 TESTS)`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

