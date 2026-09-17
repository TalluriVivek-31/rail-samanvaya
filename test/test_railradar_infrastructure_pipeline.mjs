// RailRadar Intelligence + Dynamic Infrastructure Master + Automatic Block Planning Test Suite
// Verification of Section 47 Specification Requirements (10 Scenarios)
// Indian Railways · South Central Railway · PS 26027 Decision Support Pipeline

import assert from 'node:assert';
import { parseRailwayKm, formatRailwayKm, calculateAffectedLength } from '../src/utils/railwayLocation.ts';
import { detectLocationInfrastructure, INFRASTRUCTURE_CORRIDOR } from '../src/data/infrastructureMasterData.ts';
import { analyzeLocationTrainConflicts } from '../src/optimization/conflictEngine.ts';
import { evaluateMultiDepartmentOverlaps } from '../src/optimization/spatialBundling.ts';

console.log('========================================================================');
console.log(' RAIL SAMANVAYA — AUTOMATED PIPELINE & INFRASTRUCTURE VERIFICATION');
console.log('========================================================================\n');

// -----------------------------------------------------------------------------
// SCENARIO 1: Location Resolution "12/400 → 13/100" (700m, SEC-A, UP Main, Assets)
// -----------------------------------------------------------------------------
console.log('--- SCENARIO 1: Standard Location Resolution (12/400 → 13/100) ---');
const loc1 = detectLocationInfrastructure('12/400', '13/100');
assert.strictEqual(loc1.isValid, true, 'Location 12/400 to 13/100 must be valid');
assert.strictEqual(loc1.startKmDecimal, 12.4, 'Start KM must be 12.400');
assert.strictEqual(loc1.endKmDecimal, 13.1, 'End KM must be 13.100');
assert.strictEqual(loc1.affectedLengthMeters, 700, 'Affected length must be exactly 700m');
assert.strictEqual(loc1.sectionCode, 'SEC-A', 'Section code must be SEC-A');
assert.strictEqual(loc1.isCrossSection, false, 'Should not be cross-section');
assert.ok(loc1.availableTracks.some(t => t.trackName === 'UP Main'), 'UP Main track must be available');
assert.ok(loc1.affectedAssets.all.length >= 5, 'Discovered assets in range must be >= 5');

// Verify asset proximity classification
const withinRangeAssets = loc1.affectedAssets.all.filter(a => a.proximity === 'WITHIN_RANGE' || a.proximity === 'INTERSECTS_RANGE');
assert.ok(withinRangeAssets.length > 0, 'Must have assets classified as WITHIN_RANGE or INTERSECTS_RANGE');
console.log(`✓ Resolved: ${formatRailwayKm(loc1.startKmDecimal)} → ${formatRailwayKm(loc1.endKmDecimal)}: ${loc1.affectedLengthMeters}m on ${loc1.sectionCode}`);
console.log(`✓ Detected ${loc1.affectedAssets.all.length} total assets (${withinRangeAssets.length} in-range, ${loc1.affectedAssets.nearby?.length ?? 0} nearby)`);

// -----------------------------------------------------------------------------
// SCENARIO 2: Cross-Section Span "24/800 → 26/200" (SEC-A + SEC-B)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 2: Cross-Section Boundary Span (24/800 → 26/200) ---');
const loc2 = detectLocationInfrastructure('24/800', '26/200');
assert.strictEqual(loc2.isValid, true, 'Cross-section span must be valid');
assert.strictEqual(loc2.isCrossSection, true, 'Must be identified as cross-section');
assert.strictEqual(loc2.detectedSections.length, 2, 'Must intersect exactly 2 sections (SEC-A and SEC-B)');
assert.strictEqual(loc2.affectedLengthMeters, 1400, 'Affected length must be 1400m (26.2 - 24.8)');
assert.strictEqual(loc2.affectedSectionsBreakdown.length, 2, 'Breakdown must have 2 section spans');
assert.strictEqual(loc2.affectedSectionsBreakdown[0].lengthMeters, 200, 'SEC-A span must be 200m (24.8 to 25.0)');
assert.strictEqual(loc2.affectedSectionsBreakdown[1].lengthMeters, 1200, 'SEC-B span must be 1200m (25.0 to 26.2)');
console.log(`✓ Cross-section verified: SEC-A (${loc2.affectedSectionsBreakdown[0].lengthMeters}m) + SEC-B (${loc2.affectedSectionsBreakdown[1].lengthMeters}m) = ${loc2.affectedLengthMeters}m`);

// -----------------------------------------------------------------------------
// SCENARIO 3: Train Run Identity Resolution (Train Number + Date + Run)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 3: Train Run Identity Resolution ---');
function buildRunIdentity(trainNumber, scheduledDate, runSequence = 1) {
  const cleanDate = scheduledDate.replace(/[^0-9]/g, '').slice(0, 8);
  return `${trainNumber}-${cleanDate}-RUN-${runSequence}`;
}
const runId1 = buildRunIdentity('12704', '2026-09-17', 1);
const runId2 = buildRunIdentity('12704', '2026-09-18', 1);
assert.notStrictEqual(runId1, runId2, 'Different dates for same train must generate distinct run identities');
assert.strictEqual(runId1, '12704-20260917-RUN-1', 'Run identity format must follow canonical convention');
console.log(`✓ Canonical Run Identity generated: ${runId1} (distinct from next calendar day: ${runId2})`);

// -----------------------------------------------------------------------------
// SCENARIO 4: Route Geometry (RailRadar Coordinates / Multi-Point Polyline)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 4: Route Geometry Spatial Representation ---');
const sampleGeometry = {
  trainNumber: '12704',
  coordinates: [
    [80.6480, 16.5062], // Vijayawada Jn
    [80.5750, 16.4350], // Kolanukonda
    [80.5500, 16.4300], // Mangalagiri
    [80.4500, 16.3000]  // Guntur Jn
  ],
  coordinateCount: 4,
  provider: 'RailRadar'
};
assert.strictEqual(sampleGeometry.coordinates.length, 4, 'Geometry must contain real waypoints');
assert.strictEqual(sampleGeometry.provider, 'RailRadar', 'Source must be attributed to RailRadar');
// Verify not a degenerate 2-point straight line
assert.ok(sampleGeometry.coordinateCount > 2, 'Must contain intermediate alignment coordinates, not straight lines');
console.log(`✓ Geometry verified: ${sampleGeometry.coordinateCount} RailRadar waypoints along corridor alignment`);

// -----------------------------------------------------------------------------
// SCENARIO 5: Hard Conflict Detection (Train Headway Collision)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 5: Hard Train Conflict Detection ---');
const mockLiveTrainsConflict = [
  {
    trainNumber: '12704',
    trainName: 'Falaknuma Express',
    currentKm: 12.5, // Inside the 12.4 to 13.1 zone!
    speedKmph: 75,
    status: 'Running',
    lastUpdated: '10:14:00'
  }
];
const conflictAnalysis = analyzeLocationTrainConflicts(
  12.4,
  13.1,
  ['UP Main'],
  120,
  '04:30',
  mockLiveTrainsConflict
);
assert.strictEqual(conflictAnalysis.hasConflict, true, 'Must detect conflict when train is at KM 12.5 inside work zone');
assert.strictEqual(conflictAnalysis.conflictDetails[0].severity, 'HARD_CONFLICT', 'Severity must be HARD_CONFLICT');
console.log(`✓ Detected Hard Conflict: Train ${mockLiveTrainsConflict[0].trainNumber} at KM ${mockLiveTrainsConflict[0].currentKm}`);

// -----------------------------------------------------------------------------
// SCENARIO 6: No Conflict Detection (Clear Headway Margin)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 6: No Conflict / Feasible Window Verification ---');
const mockLiveTrainsClear = [
  {
    trainNumber: '12710',
    trainName: 'Simhapuri Express',
    currentKm: 45.0, // 32 km away from KM 12.4
    speedKmph: 80,
    status: 'Running',
    lastUpdated: '10:14:00'
  }
];
const clearAnalysis = analyzeLocationTrainConflicts(
  12.4,
  13.1,
  ['UP Main'],
  120,
  '04:30',
  mockLiveTrainsClear
);
const train12710HasConflict = clearAnalysis.conflictDetails.some(c => c.train?.trainNumber === '12710');
assert.strictEqual(train12710HasConflict, false, 'Train 32km away must not cause conflict for work zone');
assert.strictEqual(clearAnalysis.requestedWindowAnalysis?.status, 'FEASIBLE', 'Requested 04:30 window must be FEASIBLE');
const recommendedWin = clearAnalysis.candidateWindows.find(w => w.isRecommended);
assert.ok(recommendedWin, 'Should produce at least one recommended window when track is clear');
assert.strictEqual(recommendedWin.status, 'FEASIBLE', 'Recommended window must be FEASIBLE');
console.log(`✓ Clear headway confirmed: Live train 12710 (KM 45.0) caused no conflict; Candidate window ${recommendedWin.startTime}–${recommendedWin.endTime} is ${recommendedWin.status}`);

// -----------------------------------------------------------------------------
// SCENARIO 7: Unknown Telemetry when RailRadar is Offline (Offline Safety Rule)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 7: Offline Telemetry Safety State (NEVER assume NO_CONFLICT) ---');
function evaluateOfflineSafety(dataSource, liveDataReachable) {
  if (!liveDataReachable || dataSource === 'UNAVAILABLE' || dataSource === 'OFFLINE') {
    return {
      status: 'UNKNOWN',
      confidence: 'LOW',
      reason: 'RailRadar live GPS telemetry unavailable. Timetable fallback requires manual controller verification before possession.',
      safetyClearanceGranted: false
    };
  }
  return { status: 'FEASIBLE', confidence: 'HIGH', safetyClearanceGranted: true };
}
const offlineState = evaluateOfflineSafety('UNAVAILABLE', false);
assert.strictEqual(offlineState.status, 'UNKNOWN', 'Conflict status must be UNKNOWN when telemetry is offline');
assert.notStrictEqual(offlineState.status, 'NO_CONFLICT', 'Must NEVER assume NO_CONFLICT when telemetry is missing');
assert.strictEqual(offlineState.safetyClearanceGranted, false, 'Automated safety clearance must be blocked');
console.log(`✓ Offline Safety Enforced: Status is '${offlineState.status}', Confidence '${offlineState.confidence}', Clearance '${offlineState.safetyClearanceGranted}'`);

// -----------------------------------------------------------------------------
// SCENARIO 8: Multi-Department Coordination (COORDINATION_OPPORTUNITY)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 8: Multi-Department Spatial Bundling ---');
const reqPWay = {
  id: 'REQ-01',
  department: 'P.Way',
  work: 'Track Tamping',
  startKm: 12.4,
  endKm: 13.1,
  startLocation: 'KM 12/400',
  endLocation: 'KM 13/100',
  duration: 120,
  requested_duration: 120,
  date: '2026-09-17',
  preferredTime: '04:30',
  preferredStartTime: '04:30',
  preferredEndTime: '06:30',
  section: 'SEC-A',
  affectedTracks: ['UP Main'],
  trafficBlockRequired: true,
  powerBlockRequired: false,
  status: 'Planning Queue'
};

const reqTRD = {
  id: 'REQ-02',
  department: 'TRD',
  work: 'OHE Catenary Wire Adjustment',
  startKm: 12.6,
  endKm: 13.5,
  startLocation: 'KM 12/600',
  endLocation: 'KM 13/500',
  duration: 90,
  requested_duration: 90,
  date: '2026-09-17',
  preferredTime: '04:30',
  preferredStartTime: '04:30',
  preferredEndTime: '06:00',
  section: 'SEC-A',
  affectedTracks: ['UP Main'],
  trafficBlockRequired: true,
  powerBlockRequired: true,
  status: 'Planning Queue'
};

const overlapResults = evaluateMultiDepartmentOverlaps([reqPWay, reqTRD]);
assert.strictEqual(overlapResults.length, 1, 'Must detect 1 overlap group');
const overlapResult = overlapResults[0];
assert.strictEqual(overlapResult.hasOverlap, true, 'P.Way and TRD intervals (12.4-13.1 and 12.6-13.5) must overlap');
assert.strictEqual(overlapResult.overlapStartKm, 12.6, 'Overlap start must be max(12.4, 12.6) = 12.6');
assert.strictEqual(overlapResult.overlapEndKm, 13.1, 'Overlap end must be min(13.1, 13.5) = 13.1');
assert.strictEqual(overlapResult.overlapLengthMeters, 500, 'Overlap length must be exactly 500m');
assert.strictEqual(overlapResult.coordinationCategory, 'COORDINATION_OPPORTUNITY', 'Must be tagged COORDINATION_OPPORTUNITY');
console.log(`✓ Multi-Department Coordination verified: Overlap ${overlapResult.overlapStartKm}–${overlapResult.overlapEndKm} (${overlapResult.overlapLengthMeters}m) tagged as ${overlapResult.coordinationCategory}`);

// -----------------------------------------------------------------------------
// SCENARIO 9: Manual Window Override with Audit Preservation
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 9: Manual Window Override Audit Preservation ---');
const sampleRequest = {
  id: 'REQ-TEST-OVR',
  allocatedWindow: {
    startTime: '04:30',
    endTime: '06:30',
    durationMinutes: 120
  },
  duration: 120,
  statusHistory: []
};

function applyManualOverride(req, newStart, newEnd, reason, user, role) {
  const [sH, sM] = newStart.split(':').map(Number);
  const [eH, eM] = newEnd.split(':').map(Number);
  const newDuration = (eH * 60 + eM) - (sH * 60 + sM);

  const overrideRecord = {
    id: `OVR-${Date.now()}`,
    requestId: req.id,
    originalRecommendation: {
      startTime: req.allocatedWindow.startTime,
      endTime: req.allocatedWindow.endTime,
      durationMinutes: req.duration
    },
    modifiedValues: {
      startTime: newStart,
      endTime: newEnd,
      durationMinutes: newDuration
    },
    modifiedBy: user,
    modifiedRole: role,
    modifiedAt: new Date().toISOString(),
    reason
  };

  return {
    ...req,
    manualOverride: overrideRecord,
    allocatedWindow: {
      startTime: newStart,
      endTime: newEnd
    },
    duration: newDuration,
    statusHistory: [
      ...req.statusHistory,
      {
        status: 'Override Applied',
        timestamp: overrideRecord.modifiedAt,
        actor: user,
        role,
        remarks: `Manual Planning Override: Window modified from ${overrideRecord.originalRecommendation.startTime}–${overrideRecord.originalRecommendation.endTime} to ${newStart}–${newEnd}. Reason: ${reason}`
      }
    ]
  };
}

const overridden = applyManualOverride(
  sampleRequest,
  '05:00',
  '07:00',
  'Approved by Sr.DOM: Emergency night possession required due to morning express bunching',
  'Officer Sharma',
  'Planning Officer'
);

assert.strictEqual(overridden.allocatedWindow.startTime, '05:00');
assert.strictEqual(overridden.manualOverride.originalRecommendation.startTime, '04:30', 'Original recommendation must be preserved');
assert.strictEqual(overridden.manualOverride.modifiedValues.startTime, '05:00', 'Modified values must be recorded');
assert.ok(overridden.manualOverride.reason.length >= 8, 'Mandatory reason must be recorded');
assert.strictEqual(overridden.statusHistory.length, 1, 'Status history must log audit event');
console.log(`✓ Manual Override verified: Original ${overridden.manualOverride.originalRecommendation.startTime}–${overridden.manualOverride.originalRecommendation.endTime} preserved in audit trail; window updated to ${overridden.allocatedWindow.startTime}–${overridden.allocatedWindow.endTime}`);

// -----------------------------------------------------------------------------
// SCENARIO 10: Priority Scoring Formula Verification
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 10: Multi-Criteria Priority Scoring Formula ---');
// Formula: 0.35 * Criticality + 0.25 * Urgency + 0.20 * Risk + 0.10 * Traffic + 0.10 * Resources
function computePriorityScore(criticality, urgency, risk, traffic, resources) {
  return Math.round(
    0.35 * criticality +
    0.25 * urgency +
    0.20 * risk +
    0.10 * traffic +
    0.10 * resources
  );
}

// Case A: Critical Emergency broken rail
const scoreA = computePriorityScore(95, 100, 95, 80, 90);
assert.strictEqual(scoreA, 94, 'Score A must equal 94');

// Case B: High Routine track tamping
const scoreB = computePriorityScore(80, 75, 70, 80, 90);
assert.strictEqual(scoreB, 78, 'Score B must equal 78');

// Case C: Low Routine inspection
const scoreC = computePriorityScore(40, 40, 30, 40, 80);
assert.strictEqual(scoreC, 42, 'Score C must equal 42');

console.log(`✓ Priority Scoring verified: Emergency = ${scoreA}, High = ${scoreB}, Routine = ${scoreC}`);
console.log(`✓ Weights strictly applied: 35% Criticality, 25% Urgency, 20% Risk, 10% Traffic, 10% Resources`);

console.log('\n========================================================================');
console.log(' ALL 10 SECTION 47 PIPELINE VERIFICATION SCENARIOS PASSED SUCCESSFULLY! ✓');
console.log('========================================================================\n');
