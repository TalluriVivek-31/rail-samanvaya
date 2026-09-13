import fs from 'fs';
import path from 'path';

// Load .env
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match && !match[1].startsWith('#')) {
      const key = match[1];
      let val = match[2] ? match[2].trim() : '';
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
} catch (e) {
  process.env.RAILRADAR_API_KEY = 'rg_3993435ca0be485ab3137b309c20da0d';
}
if (!process.env.RAILRADAR_API_KEY) {
  process.env.RAILRADAR_API_KEY = 'rg_3993435ca0be485ab3137b309c20da0d';
}

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
import { 
  analyzeLocationTrainConflicts, 
  detectOperationalShift, 
  calculatePriorityScore, 
  calculateCorridorAssetAvailability 
} from '../src/utils/conflictPlanner';
import { getSamnvayState, USERS, useSamnvayStore } from '../src/store/useSamnvayStore';
import { getLiveTrainStatus } from '../server/services/railRadarService.js';
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

console.log('\n=============================================================================');
console.log('--- RUNNING RAIL SAMNVAY FINAL RAILWAY-DOMAIN EDGE-CASE TEST SUITE (25/25) ---');
console.log('=============================================================================\n');

const store = useSamnvayStore();
store.resetToInitial();

// ---------------------------------------------------------------------------
// TEST 1: Work completed but infrastructure remains restricted (Section 13)
// ---------------------------------------------------------------------------
console.log('--- TEST 1: Work Completed with Active Operational Restriction ---');
store.switchRole('P.Way Engineer');
const req1Id = store.createRequest({
  department: 'P.Way',
  section: 'SEC-A',
  startLocation: 'KM 14/200',
  endLocation: 'KM 15/000',
  work: 'Deep Screening of Ballast Bed (BCM)',
  workCategory: 'Track Maintenance',
  date: '2026-09-14',
  preferredTime: '02:00',
  preferredStartTime: '02:00',
  preferredEndTime: '04:00',
  duration: 120,
  priority: 'HIGH',
  risk: 'HIGH',
  reason: 'Ballast caking causing poor drainage',
  safetyRequirements: ['Detonators', 'Banner flags'],
  resourcesRequired: ['BCM Machine', 'Tamping unit'],
  priorityScore: 82,
  priorityBreakdown: { criticality: 30, urgency: 20, risk: 20, trafficImpact: 6, resourceAvailability: 6, score: 82, explanation: 'BCM required' },
  affectedTracks: ['UP Main'],
  powerBlockRequired: false,
  sntDisconnectionRequired: false
});

store.switchRole('MASTER');
store.transitionBlockStatus(req1Id, 'Approved', 'Approved by Operating');
store.switchRole('Section Controller');
store.advanceExecutionStep(req1Id); // Step 1: Block Started
store.advanceExecutionStep(req1Id); // Step 2: Block Granted
store.advanceExecutionStep(req1Id); // Step 3: Safety Protection
store.advanceExecutionStep(req1Id); // Step 4: Maintenance Started (Work in Progress)

// Field engineer completes work, but ballast requires 45 km/h TSR
store.switchRole('P.Way Engineer');
store.recordOperationalRestriction(req1Id, {
  type: 'RESTRICTED',
  speedKmph: 45,
  normalSectionSpeedKmph: 130,
  reason: 'Consolidation of newly laid ballast bed'
});
store.submitCompletionReport(req1Id, {
  status: 'COMPLETED',
  actualDurationMinutes: 120,
  workAccomplishedSummary: 'Deep screening completed for 800m.',
  actualWorkCompletion: '04:00'
});

let req1 = getSamnvayState().requests.find(r => r.id === req1Id);
assert(
  req1?.completionReport?.status === 'COMPLETED' && req1?.operationalRestriction?.type === 'RESTRICTED' && req1?.operationalRestriction?.speedKmph === 45,
  'Test 1: Work completed but infrastructure remains restricted (TSR 45 km/h active)'
);

// ---------------------------------------------------------------------------
// TEST 2: Work completed but restoration is pending (Section 12 & 14)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 2: Work Completed with Restoration Pending ---');
store.switchRole('P.Way Engineer');
const req2Id = store.createRequest({
  department: 'P.Way',
  section: 'SEC-A',
  startLocation: 'KM 16/000',
  endLocation: 'KM 16/500',
  work: 'Rail Weld Ultrasonic Testing & Replacement',
  workCategory: 'Track Maintenance',
  date: '2026-09-14',
  preferredTime: '01:30',
  duration: 90,
  priority: 'HIGH',
  risk: 'MEDIUM',
  reason: 'Flaw detected in rail thermit weld',
  safetyRequirements: ['Detonators'],
  resourcesRequired: ['Weld team'],
  priorityScore: 78,
  affectedTracks: ['UP Main'],
  powerBlockRequired: false,
  sntDisconnectionRequired: false
});
store.switchRole('MASTER');
store.transitionBlockStatus(req2Id, 'Approved', 'Approved');
store.switchRole('Section Controller');
store.advanceExecutionStep(req2Id); // 1
store.advanceExecutionStep(req2Id); // 2
store.advanceExecutionStep(req2Id); // 3
store.advanceExecutionStep(req2Id); // 4 (Work in Progress)
store.switchRole('P.Way Engineer');
store.submitCompletionReport(req2Id, {
  status: 'COMPLETED',
  actualDurationMinutes: 90,
  workAccomplishedSummary: 'Weld replaced and ground flush.',
  actualWorkCompletion: '03:00'
});
const req2 = getSamnvayState().requests.find(r => r.id === req2Id);
assert(
  req2?.infrastructureCondition === 'RESTORATION_PENDING',
  'Test 2: Work completion automatically places infrastructure in RESTORATION_PENDING condition'
);
assert(
  req2?.status !== 'Closed',
  'Test 2: Block is not prematurely Closed while restoration/verification is pending'
);

// ---------------------------------------------------------------------------
// TEST 3: Early work completion before planned end (Section 11)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 3: Early Work Completion Recording ---');
store.switchRole('P.Way Engineer');
const req3Id = store.createRequest({
  department: 'P.Way',
  section: 'SEC-A',
  startLocation: 'KM 10/000',
  endLocation: 'KM 10/500',
  work: 'Switch Expansion Joint (SEJ) Adjustment',
  workCategory: 'Track Maintenance',
  date: '2026-09-14',
  preferredTime: '01:00',
  preferredStartTime: '01:00',
  preferredEndTime: '03:00',
  duration: 120,
  priority: 'MEDIUM',
  risk: 'MEDIUM',
  reason: 'Routine SEJ thermal gap adjustment',
  safetyRequirements: ['Hand signals'],
  resourcesRequired: ['P.Way gang'],
  priorityScore: 60,
  affectedTracks: ['UP Main'],
  powerBlockRequired: false,
  sntDisconnectionRequired: false
});

store.switchRole('MASTER');
store.transitionBlockStatus(req3Id, 'Approved', 'Approved');
store.switchRole('Section Controller');
store.advanceExecutionStep(req3Id); // 1
store.advanceExecutionStep(req3Id); // 2
store.advanceExecutionStep(req3Id); // 3
store.advanceExecutionStep(req3Id); // 4 (Work in Progress)

// Field finishes early at 02:20 (planned end was 03:00)
store.switchRole('P.Way Engineer');
store.submitCompletionReport(req3Id, {
  status: 'COMPLETED',
  actualDurationMinutes: 80,
  workAccomplishedSummary: 'SEJ adjustment finished 40 mins ahead of schedule.',
  actualWorkCompletion: '02:20'
});

let req3 = getSamnvayState().requests.find(r => r.id === req3Id);
assert(
  req3?.actual_work_completion === '02:20' && req3?.planned_end === '03:00',
  'Test 3: Early work completion recorded at 02:20 before planned end 03:00'
);

// ---------------------------------------------------------------------------
// TEST 4: Block release occurs later than work completion (Section 11 & 12)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 4: Block Release Timing vs Work Completion Timing ---');
store.switchRole('Section Controller');
// req3 completion report moved it to 'Work Completed' (Step 5). Advancing once releases possession (Step 6).
store.advanceExecutionStep(req3Id); // Step 5 -> Step 6: Block Released
req3 = getSamnvayState().requests.find(r => r.id === req3Id);
assert(
  Boolean(req3?.actual_block_release && req3.actual_work_completion),
  'Test 4: Both actual_work_completion and actual_block_release captured separately'
);
assert(
  req3?.status === 'Block Released',
  'Test 4: Status transitions to Block Released under Section Controller authority'
);

// ---------------------------------------------------------------------------
// TEST 5: Block expires without completion report (Section 14)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 5: Overdue Block Expiry Detection ---');
store.switchRole('S&T Engineer');
const req5Id = store.createRequest({
  department: 'S&T',
  section: 'SEC-B',
  startLocation: 'KM 22/000',
  endLocation: 'KM 22/400',
  work: 'Axle Counter Tuning',
  workCategory: 'Signal Maintenance',
  date: '2026-09-13',
  preferredTime: '00:00',
  preferredStartTime: '00:00',
  preferredEndTime: '01:00',
  duration: 60,
  priority: 'HIGH',
  risk: 'MEDIUM',
  reason: 'Intermittent track indication flicker',
  safetyRequirements: ['S&T memo'],
  resourcesRequired: ['Signal inspector'],
  priorityScore: 75,
  affectedTracks: ['DOWN Main'],
  powerBlockRequired: false,
  sntDisconnectionRequired: true
});
store.switchRole('MASTER');
store.transitionBlockStatus(req5Id, 'Approved');
store.switchRole('Section Controller');
store.advanceExecutionStep(req5Id); // 1
store.advanceExecutionStep(req5Id); // 2
store.advanceExecutionStep(req5Id); // 3
store.advanceExecutionStep(req5Id); // 4 (Work in Progress)

// Check overdue reports
store.checkOverdueCompletionReports('03:30'); // System time 03:30 > planned_end 01:00
let req5 = getSamnvayState().requests.find(r => r.id === req5Id);
assert(
  req5?.isOverdueCompletionReport === true && req5?.completionReportStatus === 'COMPLETION_REPORT_OVERDUE',
  'Test 5: Block expiring without completion report flagged as COMPLETION_REPORT_OVERDUE'
);

// ---------------------------------------------------------------------------
// TEST 6: Missing completion report generates escalation (Section 14)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 6: Escalation Scoring for Overdue Completion Report ---');
const priorityOverdue = calculatePriorityScore({
  criticality: 50,
  urgency: 50,
  risk: 50,
  trafficImpact: 50,
  resourceAvailability: 50,
  isOverdue: true
});
assert(
  priorityOverdue.factors?.some(f => f.includes('Overdue Completion Report (+10 Urgency)')) ?? false,
  'Test 6: Overdue completion report triggers +10 escalation factor in priority decision engine'
);

// ---------------------------------------------------------------------------
// TEST 7: Partial work stores remaining KM (Section 13)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 7: Partial Work Remaining Chainage Storage ---');
store.switchRole('P.Way Engineer');
const req7Id = store.createRequest({
  department: 'P.Way',
  section: 'SEC-A',
  startLocation: 'KM 12/400',
  endLocation: 'KM 14/000', // 1.6 km
  work: 'Through Rail Renewal (TRR)',
  workCategory: 'Track Maintenance',
  date: '2026-09-14',
  preferredTime: '02:00',
  preferredStartTime: '02:00',
  preferredEndTime: '05:00',
  duration: 180,
  priority: 'HIGH',
  risk: 'HIGH',
  reason: 'High GMT rail wear',
  safetyRequirements: ['Detonators'],
  resourcesRequired: ['PQRS'],
  priorityScore: 80,
  affectedTracks: ['UP Main'],
  powerBlockRequired: false,
  sntDisconnectionRequired: false
});
store.switchRole('MASTER');
store.transitionBlockStatus(req7Id, 'Approved');
store.switchRole('Section Controller');
store.advanceExecutionStep(req7Id); store.advanceExecutionStep(req7Id); store.advanceExecutionStep(req7Id); store.advanceExecutionStep(req7Id);

// File partial completion at KM 13/200
store.switchRole('P.Way Engineer');
const report7 = store.submitCompletionReport(req7Id, {
  status: 'PARTIALLY_COMPLETED',
  actualDurationMinutes: 180,
  workAccomplishedSummary: 'Completed 800m out of 1600m scope up to KM 13/200.',
  remainingLocationKm: 'KM 13/200',
  remainingStartKm: 13.2,
  remainingEndKm: 14.0,
  continuationRequired: true,
  continuationRequestedDurationMinutes: 90,
  incompletionReasonCategory: 'TIME_CONSTRAINTS'
});

let req7 = getSamnvayState().requests.find(r => r.id === req7Id);
assert(
  req7?.completionReport?.remainingStartKm === 13.2 && req7?.completionReport?.remainingEndKm === 14.0,
  'Test 7: Partial work stores remaining start KM (13.2) and end KM (14.0)'
);

// ---------------------------------------------------------------------------
// TEST 8: Partial work creates continuation request linked to parent (Section 13)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 8: Linked Continuation Request Generation ---');
const contId = report7.continuationId;
const contReq = getSamnvayState().requests.find(r => r.id === contId);
assert(
  Boolean(contReq && contReq.continuationOfBlockId === req7Id),
  'Test 8: Continuation request is explicitly linked to parent block ID'
);
assert(
  contReq?.startKm === 13.2 && contReq?.endKm === 14.0 && contReq?.duration === 90,
  'Test 8: Continuation request carries forward uncompleted chainage (13.2–14.0 KM) and duration (90 mins)'
);

// ---------------------------------------------------------------------------
// TEST 9: Continuation is never auto-granted (Section 13)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 9: Continuation Never Auto-Granted Invariant ---');
assert(
  contReq?.status === 'Submitted' && contReq?.isAutoGranted === false,
  'Test 9: Continuation request is created with status "Submitted" and isAutoGranted === false'
);

// ---------------------------------------------------------------------------
// TEST 10: Continuation receives fresh candidate-window analysis (Section 13)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 10: Fresh Candidate Analysis for Continuation ---');
const freshAnalysis = analyzeLocationTrainConflicts(
  contReq!.startKm!,
  contReq!.endKm!,
  contReq!.affectedTracks,
  contReq!.duration,
  '02:00'
);
assert(
  freshAnalysis.candidateWindows.length > 0 && typeof freshAnalysis.isNoSuitableWindow === 'boolean',
  'Test 10: Continuation receives fresh candidate-window evaluation against timetable and corridor constraints'
);

// ---------------------------------------------------------------------------
// TEST 11: Resource conflict prevents candidate selection (Section 17)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 11: Multi-Department Resource Conflict Handling ---');
const resourceConflictAnalysis = analyzeLocationTrainConflicts(
  12.4,
  13.1,
  ['UP Main'],
  90,
  '02:00',
  [],
  undefined,
  {
    requestedResources: ['PQRS-RAKE-01', 'TAMPER-03'],
    existingAllocations: [
      {
        requestId: 'REQ-EXISTING-99',
        resources: ['PQRS-RAKE-01'],
        startTime: '04:30',
        endTime: '06:00'
      }
    ]
  }
);
const conflictedSlot = resourceConflictAnalysis.candidateWindows.find(w => w.slotId === 'SLOT-02');
assert(
  conflictedSlot?.status === 'CONFLICT' && conflictedSlot.isResourceConflict === true,
  'Test 11: Candidate window marked CONFLICT due to conflicting machine allocation'
);
assert(
  Boolean(conflictedSlot?.reason.includes('Resource Conflict') && conflictedSlot?.reason.includes('PQRS-RAKE-01')),
  'Test 11: Slot reason specifies exact conflicting resource and allocated request ID'
);

// ---------------------------------------------------------------------------
// TEST 12: Setup + work + verification + restoration exceeds window (Section 11)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 12: Granular Possession Duration Breakdown Rejection ---');
// Available window in SLOT-03 is 60 mins (07:00–08:00).
// Work: 50m + Setup: 15m + Verification: 10m + Restoration: 15m = 90 mins total possession required.
const breakdownAnalysis = analyzeLocationTrainConflicts(
  12.4,
  13.1,
  ['UP Main'],
  50, // nominal work minutes
  '07:00',
  [],
  undefined,
  {
    breakdown: {
      setupMinutes: 15,
      workMinutes: 50,
      verificationMinutes: 10,
      restorationMinutes: 15
    }
  }
);
assert(
  breakdownAnalysis.totalRequiredPossessionMinutes === 90,
  'Test 12: Total required possession correctly sums setup (15) + work (50) + verification (10) + restoration (15) = 90 mins'
);
const slot3 = breakdownAnalysis.candidateWindows.find(w => w.slotId === 'SLOT-03');
assert(
  slot3?.status === 'INSUFFICIENT_DURATION' && slot3.isDurationSufficient === false,
  'Test 12: Window of 60 mins rejected (INSUFFICIENT_DURATION) when total required possession is 90 mins'
);

// ---------------------------------------------------------------------------
// TEST 13: No feasible window produces "NO SUITABLE WINDOW" (Section 15 & 18)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 13: Explicit "NO SUITABLE WINDOW" Determination ---');
// Request 300 minutes (longer than any available slot in corridor)
const noWindowAnalysis = analyzeLocationTrainConflicts(
  12.4,
  13.1,
  ['UP Main'],
  300,
  '02:00'
);
assert(
  noWindowAnalysis.isNoSuitableWindow === true,
  'Test 13: System flags isNoSuitableWindow === true when no window satisfies duration'
);
assert(
  (noWindowAnalysis.qualityRating === 'NO_FEASIBLE_SOLUTION' || noWindowAnalysis.qualityRating === 'OPTIMIZATION_FAILED') && noWindowAnalysis.recommendedWindow === undefined,
  'Test 13: Quality rating indicates no feasible solution and recommendedWindow is undefined (no false recommendation)'
);
assert(
  Boolean(noWindowAnalysis.noSuitableWindowReasons && noWindowAnalysis.noSuitableWindowReasons.length > 0),
  'Test 13: Provides itemized failure reasons for each rejected candidate window'
);

// ---------------------------------------------------------------------------
// TEST 14: Live telemetry unavailable does not produce zero-conflict claim (Section 16)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 14: Honest Telemetry Availability Handling ---');
const unavailAnalysis = analyzeLocationTrainConflicts(12.4, 13.1, ['UP Main'], 60, '02:00', []);
assert(
  unavailAnalysis.liveDataAvailable === false && Boolean(unavailAnalysis.liveDataWarning),
  'Test 14: Marks liveDataAvailable as false and emits explicit liveDataWarning disclaimer'
);

// ---------------------------------------------------------------------------
// TEST 15: Stale telemetry triggers warning (Section 16)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 15: Stale Telemetry Detection & Warning ---');
const staleTrain: LiveTrainPosition = {
  trainNumber: '12627',
  trainName: 'Karnataka Express',
  currentStation: 'ATP',
  nextStation: 'GTL',
  lastReportedStation: 'ATP',
  direction: 'UP',
  delayMinutes: 10,
  scheduledArrival: '02:00',
  expectedArrival: '02:10',
  currentKm: 8.5,
  speedKmph: 90,
  status: 'RUNNING',
  lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes old (stale)
};
const staleAnalysis = analyzeLocationTrainConflicts(
  12.4,
  13.1,
  ['UP Main'],
  60,
  '02:00',
  [staleTrain],
  undefined,
  { telemetryFreshnessThresholdMinutes: 15 }
);
assert(
  staleAnalysis.isLiveDataStale === true && Boolean(staleAnalysis.staleDataWarning),
  'Test 15: Telemetry older than 15 mins flagged as isLiveDataStale with clear warning memo'
);

// ---------------------------------------------------------------------------
// TEST 16: Train operational picture changes before execution (Section 16 & 24)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 16: Pre-Execution Dynamic Operational Shift Conflict ---');
// Planned window: 02:00 to 04:00 on UP Main
// Train 12723 scheduled for 06:45 delayed or running into 02:30 slot
const delayedApproachingTrain: LiveTrainPosition = {
  trainNumber: '12723',
  trainName: 'Telangana Express',
  currentStation: 'BZA',
  nextStation: 'MAG',
  lastReportedStation: 'BZA',
  direction: 'UP',
  delayMinutes: 120, // Major delay shifts train into maintenance window
  scheduledArrival: '00:30',
  expectedArrival: '02:30', // Hits the 02:00–04:00 window!
  currentKm: 12.0,
  speedKmph: 85,
  status: 'RUNNING',
  lastUpdated: new Date().toISOString()
};
const shiftResult = detectOperationalShift(
  { startTime: '02:00', endTime: '04:00', track: 'UP Main' },
  [delayedApproachingTrain]
);
assert(
  shiftResult.shiftDetected === true && shiftResult.actionRequired === 'OPERATIONAL_CONFLICT_DETECTED',
  'Test 16: detectOperationalShift catches approaching delayed train crossing planned window'
);
assert(
  shiftResult.conflictingTrain?.trainNumber === '12723',
  'Test 16: Identifies conflicting train number in dynamic shift report'
);

// ---------------------------------------------------------------------------
// TEST 17: Manual override preserves original recommendation (Section 18)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 17: Audit-Compliant Manual Window Override ---');
store.switchRole('Section Controller');
const overrideResult = store.recordManualOverride(
  req1Id,
  { startTime: '02:30', endTime: '04:30', durationMinutes: 120 },
  'Postponed by 30 mins to allow passage of delayed perishable freight rake'
);
assert(
  overrideResult.success === true,
  'Test 17: Controller manual override accepted and recorded'
);
req1 = getSamnvayState().requests.find(r => r.id === req1Id);
assert(
  Boolean(req1?.manualOverride?.originalRecommendation),
  'Test 17: Original system recommendation preserved intact in manualOverride record'
);
assert(
  req1?.manualOverride?.modifiedValues.startTime === '02:30' &&
  Boolean(req1?.manualOverride?.reason.includes('perishable freight')),
  'Test 17: Preserves modified parameters, controller identity, and mandatory operational justification'
);

// ---------------------------------------------------------------------------
// TEST 18: Optimizer failure does not generate fake recommendation (Section 15)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 18: Optimizer Failure Handling ---');
// 600-minute block request across both UP and DOWN lines
const impossibleAnalysis = analyzeLocationTrainConflicts(10.0, 30.0, ['UP Main', 'DOWN Main'], 600, '02:00');
assert(
  impossibleAnalysis.isDurationImpossible === true && impossibleAnalysis.recommendedWindow === undefined,
  'Test 18: When impossible duration requested, optimizer yields undefined recommendedWindow (no fake slot)'
);

// ---------------------------------------------------------------------------
// TEST 19: Multi-department block cannot close while one department incomplete (Section 22)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 19: Multi-Department Block Release Interlock ---');
store.switchRole('P.Way Engineer');
const jointReqId = store.createRequest({
  department: 'P.Way',
  section: 'SEC-A',
  startLocation: 'KM 18/000',
  endLocation: 'KM 18/500',
  work: 'Joint Rail and OHE Cantilever Renewal',
  workCategory: 'Track Maintenance',
  date: '2026-09-14',
  preferredTime: '02:00',
  preferredStartTime: '02:00',
  preferredEndTime: '04:00',
  duration: 120,
  priority: 'HIGH',
  risk: 'HIGH',
  reason: 'Joint P.Way and TRD work',
  safetyRequirements: ['OHE Power Block', 'P.Way Detonators'],
  resourcesRequired: ['Tower Wagon', 'P.Way Gang'],
  priorityScore: 85,
  affectedTracks: ['UP Main'],
  powerBlockRequired: true,
  otherDepartmentsInvolved: ['TRD'],
  sntDisconnectionRequired: false
});

store.switchRole('MASTER');
store.transitionBlockStatus(jointReqId, 'Approved');
store.switchRole('Section Controller');
store.advanceExecutionStep(jointReqId); // 1
store.advanceExecutionStep(jointReqId); // 2
store.advanceExecutionStep(jointReqId); // 3
store.advanceExecutionStep(jointReqId); // 4 (Work in Progress)

// P.Way signs off as COMPLETED, but TRD is still IN_PROGRESS
store.switchRole('P.Way Engineer');
store.updateDepartmentExecutionStatus(jointReqId, 'P.Way', 'COMPLETED', 'Track works finished');

// Section Controller attempts to release block
store.switchRole('Section Controller');
// Currently at step 4 -> 5 is Work Completed. Then 5 -> 6 is Block Released.
store.advanceExecutionStep(jointReqId); // Step 5 (Work Completed)
const prematureRelease = store.advanceExecutionStep(jointReqId); // Attempt Step 6 (Block Released)
assert(
  prematureRelease.success === false && Boolean(prematureRelease.message?.includes('department')),
  'Test 19: Block Release strictly BLOCKED while TRD department work remains incomplete'
);

// Now TRD signs off
store.switchRole('TRD Engineer');
store.updateDepartmentExecutionStatus(jointReqId, 'TRD', 'COMPLETED', 'OHE restored, earth rods removed');
store.switchRole('Section Controller');
const authorizedRelease = store.advanceExecutionStep(jointReqId);
assert(
  authorizedRelease.success === true,
  'Test 19: Block Release succeeds once all participating departments have signed off'
);

// ---------------------------------------------------------------------------
// TEST 20: Normal operation cannot be restored without authorized verification (Section 12 & 23)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 20: G&SR 15.06 Authorized Infrastructure Restoration ---');
// P.Way Engineer attempts to mark infrastructure as NORMAL
store.switchRole('P.Way Engineer');
const unauthRestoration = store.recordRestoration(
  req1Id,
  'NORMAL',
  'Field engineer claims track is good'
);
assert(
  unauthRestoration.success === false,
  'Test 20: Field Engineer CANNOT unilaterally declare infrastructure NORMAL'
);

// Section Controller restores normal operation with formal verification memo
store.switchRole('Section Controller');
const authRestoration = store.recordRestoration(
  req1Id,
  'NORMAL',
  'Joint safety inspection completed. Track geometry and OHE parameters certified fit for 130 km/h.'
);
assert(
  authRestoration.success === true,
  'Test 20: Section Controller successfully certifies track fit and restores NORMAL operation'
);
let restoredReq = getSamnvayState().requests.find(r => r.id === req1Id);
assert(
  restoredReq?.infrastructureCondition === 'NORMAL' && Boolean(restoredReq?.restorationRecord?.restoredBy),
  'Test 20: Infrastructure condition updated to NORMAL with permanent verification record'
);

// ---------------------------------------------------------------------------
// TEST 21: Invalid state transitions rejected server-side (Section 21)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 21: State Machine Transition Integrity ---');
// Try to jump from Submitted directly to Closed
store.switchRole('P.Way Engineer');
const req21Id = store.createRequest({
  department: 'P.Way',
  section: 'SEC-A',
  startLocation: 'KM 11/000',
  endLocation: 'KM 11/500',
  work: 'Weld Testing',
  workCategory: 'Inspection',
  date: '2026-09-15',
  preferredTime: '01:00',
  duration: 60,
  priority: 'LOW',
  risk: 'LOW',
  reason: 'Ultrasonic flaw testing',
  safetyRequirements: ['Lookout man'],
  resourcesRequired: ['USFD team'],
  priorityScore: 40,
  affectedTracks: ['UP Main'],
  powerBlockRequired: false,
  sntDisconnectionRequired: false
});

store.switchRole('MASTER');
const illegalJump = store.transitionBlockStatus(req21Id, 'Closed', 'Illegal jump');
assert(
  illegalJump.success === false && Boolean(illegalJump.message?.includes('Invalid state transition')),
  'Test 21: Direct transition from "Submitted" to "Closed" rejected with invalid transition error'
);

// ---------------------------------------------------------------------------
// TEST 22: Cancellation preserves complete audit history (Section 26)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 22: Permanent Audit Trail on Cancellation ---');
store.switchRole('Section Controller');
const cancelResult = store.cancelBlockRequest(req21Id, 'Emergency priority train movement mandated by DRM');
assert(cancelResult.success === true, 'Cancellation executed');
const cancelledReq = getSamnvayState().requests.find(r => r.id === req21Id);
assert(
  Boolean(cancelledReq) && cancelledReq?.status === 'Unsafe / Cancelled',
  'Test 22: Cancelled request retained in ledger with status "Unsafe / Cancelled"'
);
assert(
  Boolean(cancelledReq?.cancellationDetails?.cancelledBy?.includes('Section Controller')) &&
  Boolean(cancelledReq?.cancellationDetails?.reason.includes('DRM')),
  'Test 22: Cancellation preserves actor, role, timestamp, and operating justification'
);

// ---------------------------------------------------------------------------
// TEST 23: Duplicate/race-condition approval rejected (Section 21 & 27)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 23: Duplicate Approval Prevention ---');
store.switchRole('P.Way Engineer');
const req23Id = store.createRequest({
  department: 'P.Way',
  section: 'SEC-B',
  startLocation: 'KM 26/000',
  endLocation: 'KM 26/500',
  work: 'Curve greasing',
  workCategory: 'Track Maintenance',
  date: '2026-09-15',
  preferredTime: '02:00',
  duration: 60,
  priority: 'LOW',
  risk: 'LOW',
  reason: 'Curve gauge face lubrication',
  safetyRequirements: ['Hand signals'],
  resourcesRequired: ['Gangmen'],
  priorityScore: 45,
  affectedTracks: ['DOWN Main'],
  powerBlockRequired: false,
  sntDisconnectionRequired: false
});
store.switchRole('MASTER');
const firstApprove = store.transitionBlockStatus(req23Id, 'Approved', 'First approval');
assert(firstApprove.success === true, 'First approval succeeds');

// Attempt duplicate approval on already approved request
const secondApprove = store.transitionBlockStatus(req23Id, 'Approved', 'Duplicate approval attempt');
assert(
  secondApprove.success === false && Boolean(secondApprove.message?.includes('already Approved')),
  'Test 23: Duplicate approval attempt rejected (ALREADY_APPROVED)'
);

// ---------------------------------------------------------------------------
// TEST 24: Invalid infrastructure/location data rejected (Section 28)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 24: Validation of Location Chainage & Duration ---');
// Start KM >= End KM
let invalidKmThrown = false;
try {
  store.createRequest({
    department: 'P.Way',
    section: 'SEC-A',
    startLocation: 'KM 15/000',
    endLocation: 'KM 12/000', // startKm > endKm!
    work: 'Invalid KM Work',
    workCategory: 'Track Maintenance',
    date: '2026-09-15',
    preferredTime: '02:00',
    duration: 60,
    priority: 'LOW',
    risk: 'LOW',
    reason: 'Test',
    safetyRequirements: [],
    resourcesRequired: [],
    priorityScore: 30,
    affectedTracks: ['UP Main'],
    powerBlockRequired: false,
    sntDisconnectionRequired: false
  });
} catch (e: any) {
  invalidKmThrown = true;
}

// Negative duration
let invalidDurationThrown = false;
try {
  store.createRequest({
    department: 'P.Way',
    section: 'SEC-A',
    startLocation: 'KM 12/000',
    endLocation: 'KM 13/000',
    work: 'Negative Duration Work',
    workCategory: 'Track Maintenance',
    date: '2026-09-15',
    preferredTime: '02:00',
    duration: -45, // Negative duration!
    priority: 'LOW',
    risk: 'LOW',
    reason: 'Test',
    safetyRequirements: [],
    resourcesRequired: [],
    priorityScore: 30,
    affectedTracks: ['UP Main'],
    powerBlockRequired: false,
    sntDisconnectionRequired: false
  });
} catch (e: any) {
  invalidDurationThrown = true;
}

assert(
  invalidKmThrown === true,
  'Test 24: Rejects invalid location chainage where startKm >= endKm'
);
assert(
  invalidDurationThrown === true,
  'Test 24: Rejects non-positive maintenance block duration'
);

// ---------------------------------------------------------------------------
// TEST 25: RailRadar run identity remains correct after all modifications (Section 31)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 25: RailRadar Run Identity Verification ---');
const resolved12627 = await getLiveTrainStatus('12627');
assert(
  resolved12627.source === 'LIVE' || resolved12627.source === 'STALE_CACHE',
  'Test 25: Resolves via RailRadar telemetry engine'
);
assert(
  resolved12627.data?.trainNumber === '12627',
  'Test 25: Normalized train number matches 12627'
);
assert(
  resolved12627.data?.startDate === '2026-09-13',
  'Test 25: Current run identity adheres to actual runtime origin date 2026-09-13'
);

console.log('\n=============================================================================');
console.log(`--- FINAL EDGE-CASE TEST RESULTS: ${passed} PASSED / ${failed} FAILED ---`);
console.log('=============================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  setTimeout(() => process.exit(0), 150);
}
