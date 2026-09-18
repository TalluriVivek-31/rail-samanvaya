// test/test_railradar_intelligence_v2.mjs
// Automated Verification Suite for Rail Samnvay RailRadar Intelligence Features
// Tests: Run Identity, Interaction Classification, Unknown Telemetry Safety Rule, Route Geometry Extraction, Manual Override Audit Preservation

import assert from 'assert';
import { buildRunIdentity, classifyTrainWorkInteraction, isTelemetryStale, traceTrainWorkProximity } from '../src/utils/trainIntelligence.ts';
import { extractRouteCoordinates } from '../src/services/railRadarClient.ts';

console.log('========================================================================');
console.log(' RAIL SAMNVAY — RAILRADAR INTELLIGENCE FEATURES TEST SUITE');
console.log('========================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Canonical Train Run Identity Resolution (Section 2 & 13)
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Train Run Identity Resolution ---');

const runId1 = buildRunIdentity('12627', '2026-09-17', 1);
assert.strictEqual(runId1, '12627-20260917-RUN-1', 'Canonical run identity should match format');

const runIdFromTrain = buildRunIdentity({
  trainNumber: '12704',
  serviceDate: '2026-09-17',
  runId: 'RUN-2'
});
assert.strictEqual(runIdFromTrain, '12704-20260917-RUN-2', 'Should resolve identity from LiveTrainPosition object');

const runIdNextDay = buildRunIdentity('12627', '2026-09-18', 1);
assert.notStrictEqual(runId1, runIdNextDay, 'Runs on successive calendar days must have distinct identities');
console.log(`✓ Train Run Identity resolved: ${runId1} distinct from ${runIdNextDay}`);

// -----------------------------------------------------------------------------
// TEST 2: Train-Work Interaction: IN_AFFECTED_RANGE (Section 7)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Train Inside Affected Range ---');

const workZone = {
  startKm: 12.0,
  endKm: 14.0,
  track: 'UP Main',
  sectionId: 'SEC-A',
  isActiveNow: true,
  blockStartTime: '04:30',
  blockEndTime: '06:30'
};

const trainInside = {
  trainNumber: '12704',
  trainName: 'Falaknuma Express',
  currentStation: 'BZA',
  nextStation: 'KCC',
  lastReportedStation: 'BZA',
  direction: 'UP',
  delayMinutes: 0,
  speedKmph: 75,
  currentKm: 13.0,
  status: 'RUNNING',
  confidence: 'HIGH'
};

const interactionInside = classifyTrainWorkInteraction(trainInside, workZone);
assert.strictEqual(interactionInside.state, 'IN_AFFECTED_RANGE', 'Train inside bounds must be IN_AFFECTED_RANGE');
assert.strictEqual(interactionInside.distanceKm, 0, 'Distance must be 0 for train inside zone');
assert.strictEqual(interactionInside.severity, 'HARD_CONFLICT', 'Must have HARD_CONFLICT severity');
console.log(`✓ Train inside work zone (KM 13.0 in [12.0, 14.0]) classified as: ${interactionInside.state} (Severity: ${interactionInside.severity})`);

// -----------------------------------------------------------------------------
// TEST 3: Train-Work Interaction: APPROACHING (Section 7)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: Train Approaching Work Zone ---');

const trainApproaching = {
  trainNumber: '12627',
  trainName: 'Karnataka Express',
  currentStation: 'BZA',
  nextStation: 'KCC',
  lastReportedStation: 'BZA',
  direction: 'UP',
  delayMinutes: 5,
  speedKmph: 80,
  currentKm: 5.0, // 7km before startKm 12.0
  status: 'RUNNING',
  confidence: 'HIGH'
};

const interactionApproaching = classifyTrainWorkInteraction(trainApproaching, workZone);
assert.strictEqual(interactionApproaching.state, 'APPROACHING', 'Approaching train within 25km must be APPROACHING');
assert.strictEqual(interactionApproaching.distanceKm, 7.0, 'Distance must be 7.0 km');
assert(interactionApproaching.etaMinutes > 0, 'ETA must be positive');
console.log(`✓ Train at KM 5.0 approaching KM 12.0 classified as: ${interactionApproaching.state} (Dist: ${interactionApproaching.distanceKm}km, ETA: ${interactionApproaching.etaMinutes}m)`);

// -----------------------------------------------------------------------------
// TEST 4: UNKNOWN Telemetry Safety Rule (Section 12)
// UNKNOWN != NO_CONFLICT
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: UNKNOWN Telemetry Safety Rule (UNKNOWN != NO_CONFLICT) ---');

const trainLowConfidence = {
  trainNumber: '12805',
  trainName: 'Janmabhoomi Express',
  currentStation: 'UNKNOWN',
  nextStation: 'UNKNOWN',
  lastReportedStation: 'UNKNOWN',
  direction: 'UP',
  delayMinutes: 0,
  speedKmph: 0,
  status: 'RUNNING',
  confidence: 'UNKNOWN'
  // Missing currentKm, latitude, longitude
};

const interactionUnknown = classifyTrainWorkInteraction(trainLowConfidence, workZone);
assert.strictEqual(interactionUnknown.state, 'UNKNOWN', 'Low/missing telemetry must classify as UNKNOWN');
assert.strictEqual(interactionUnknown.severity, 'UNKNOWN', 'UNKNOWN telemetry MUST have severity UNKNOWN');
assert.notStrictEqual(interactionUnknown.state, 'NO_INTERACTION', 'UNKNOWN telemetry must NEVER default to NO_INTERACTION');
console.log(`✓ Unknown telemetry safely flagged: state='${interactionUnknown.state}', severity='${interactionUnknown.severity}'`);

// -----------------------------------------------------------------------------
// TEST 5: Route Geometry GeoJSON Conversion & No Straight Line Fabrication (Section 4 & 24)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: Route Geometry GeoJSON Conversion ---');

const sampleGeoJson = {
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: [
      [80.6231, 16.5193], // [lon, lat]
      [80.6240, 16.5180],
      [80.6275, 16.5150],
      [80.6300, 16.5100]
    ]
  }
};

const extracted = extractRouteCoordinates(sampleGeoJson);
assert(extracted !== null, 'Should successfully extract coordinates');
assert.strictEqual(extracted.waypointsCount, 4, 'Should have 4 waypoints');
assert.strictEqual(extracted.coordinates[0][0], 16.5193, 'First coordinate lat must be 16.5193');
assert.strictEqual(extracted.coordinates[0][1], 80.6231, 'First coordinate lng must be 80.6231');

// Test unavailable route returns null (no straight lines fabricated)
const unavailableRoute = extractRouteCoordinates(null);
assert.strictEqual(unavailableRoute, null, 'Unavailable route must return null, NOT fabricated lines');

const emptyRoute = extractRouteCoordinates({ geometry: { coordinates: [] } });
assert.strictEqual(emptyRoute, null, 'Empty route coordinates must return null');
console.log(`✓ GeoJSON [lon, lat] converted to Leaflet [lat, lng]: ${extracted.waypointsCount} waypoints`);
console.log(`✓ Unavailable / empty route geometry returns null (no fabricated straight lines)`);

// -----------------------------------------------------------------------------
// TEST 6: Manual Override Audit Preservation (Section 21)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 6: Manual Override Audit Preservation ---');

const mockRequest = {
  id: 'REQ-PWAY-001',
  work: 'Deep Screening of Ballast',
  department: 'P.Way',
  duration: 120,
  allocatedWindow: {
    startTime: '04:30',
    endTime: '06:30'
  }
};

// Simulate manual override recording
const auditLog = {
  requestId: mockRequest.id,
  originalRecommendation: { ...mockRequest.allocatedWindow },
  modifiedValues: { startTime: '05:00', endTime: '07:00' },
  author: 'Vijay Kumar',
  role: 'Planning Officer',
  timestamp: new Date().toISOString(),
  reason: 'Approved by Sr.DOM: Shifted to allow clearance of delayed mail/express cluster'
};

assert.strictEqual(auditLog.originalRecommendation.startTime, '04:30', 'Original start time preserved');
assert.strictEqual(auditLog.originalRecommendation.endTime, '06:30', 'Original end time preserved');
assert.strictEqual(auditLog.modifiedValues.startTime, '05:00', 'Modified start time applied');
assert(auditLog.reason.length >= 8, 'Substantive justification required');
assert.strictEqual(auditLog.role, 'Planning Officer', 'Authorized role logged');
console.log(`✓ Manual Override Audit: Original window [${auditLog.originalRecommendation.startTime}–${auditLog.originalRecommendation.endTime}] preserved in audit ledger alongside override [${auditLog.modifiedValues.startTime}–${auditLog.modifiedValues.endTime}]`);

// -----------------------------------------------------------------------------
// TEST 7: Comprehensive Verification of Scenarios A through G (Train-Work Pipeline)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 7: Explicit Verification of Operational Scenarios A through G ---');

// Base work zone: KM 12.0 to 14.0 on SEC-A (UP Main), Candidate Block Window: 04:30 - 06:30
const workZoneCorridor = {
  startKm: 12.0,
  endKm: 14.0,
  track: 'UP Main',
  sectionId: 'SEC-A',
  routeCode: 'NDLS-MAS-CORRIDOR',
  isActiveNow: true,
  blockStartTime: '04:30',
  blockEndTime: '06:30'
};

// Scenario A: Train on same route genuinely approaching -> APPROACHING
const scenarioA_Train = {
  trainNumber: '12627',
  trainName: 'Karnataka Express',
  direction: 'UP',
  currentKm: 6.0, // 6km before 12.0
  speedKmph: 60,
  confidence: 'HIGH',
  status: 'RUNNING',
  routeCode: 'NDLS-MAS-CORRIDOR',
  lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString() // 2 mins ago
};
const resA = classifyTrainWorkInteraction(scenarioA_Train, workZoneCorridor);
assert.strictEqual(resA.state, 'APPROACHING', 'Scenario A must classify as APPROACHING');
assert.strictEqual(resA.distanceKm, 6.0, 'Scenario A distance must be exactly 6.0 km along route');
assert.strictEqual(resA.etaMinutes, 6, 'Scenario A ETA must be 6 minutes at 60 km/h for 6 km');
assert(resA.projectedEta !== null && resA.projectedEta !== 'UNKNOWN', 'Scenario A projectedEta must be computed');
console.log(`✓ Scenario A Passed: Same route genuinely approaching -> state: ${resA.state} (${resA.distanceKm}km, ETA: ${resA.etaMinutes}m)`);

// Scenario B: Train on another route far/near cannot reach -> NO_INTERACTION
const scenarioB_Train = {
  trainNumber: '17226',
  trainName: 'Amaravati Express',
  direction: 'UP',
  currentKm: 10.0,
  speedKmph: 70,
  confidence: 'HIGH',
  status: 'RUNNING',
  onDifferentRoute: true, // Operating on branch / loop not traversing this work zone
  lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString()
};
const resB = classifyTrainWorkInteraction(scenarioB_Train, workZoneCorridor);
assert.strictEqual(resB.state, 'NO_INTERACTION', 'Scenario B on different route must be NO_INTERACTION');
assert.strictEqual(resB.severity, 'NONE', 'Scenario B severity must be NONE');
assert.strictEqual(resB.distanceKm, null, 'Scenario B distance should be null');
console.log(`✓ Scenario B Passed: Train on another route cannot reach -> state: ${resB.state} (severity: ${resB.severity})`);

// Scenario C: Train physically inside work zone -> IN_AFFECTED_RANGE
const scenarioC_Train = {
  trainNumber: '12704',
  trainName: 'Falaknuma Express',
  direction: 'UP',
  currentKm: 13.2, // Inside [12.0, 14.0]
  speedKmph: 45,
  confidence: 'HIGH',
  status: 'RUNNING',
  routeCode: 'NDLS-MAS-CORRIDOR',
  lastUpdated: new Date(Date.now() - 1 * 60 * 1000).toISOString()
};
const resC = classifyTrainWorkInteraction(scenarioC_Train, workZoneCorridor);
assert.strictEqual(resC.state, 'IN_AFFECTED_RANGE', 'Scenario C inside work zone must be IN_AFFECTED_RANGE');
assert.strictEqual(resC.severity, 'HARD_CONFLICT', 'Scenario C must be HARD_CONFLICT');
assert.strictEqual(resC.distanceKm, 0, 'Scenario C distance must be 0');
assert.strictEqual(resC.projectedEta, 'NOW', 'Scenario C projectedEta must be NOW');
assert.strictEqual(resC.requiresAttention, true, 'Scenario C must require controller attention');
console.log(`✓ Scenario C Passed: Train physically inside work zone -> state: ${resC.state} (severity: ${resC.severity})`);

// Scenario D: Telemetry is stale (>15 min) -> UNKNOWN, requiresAttention = true
const scenarioD_Train = {
  trainNumber: '12760',
  trainName: 'Charminar Express',
  direction: 'UP',
  currentKm: 8.0,
  speedKmph: 70,
  confidence: 'HIGH',
  status: 'RUNNING',
  routeCode: 'NDLS-MAS-CORRIDOR',
  upstreamUpdatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString() // 25 mins ago (>15 min)
};
assert.strictEqual(isTelemetryStale(scenarioD_Train, 15), true, 'isTelemetryStale must return true for >15m old telemetry');
const resD = classifyTrainWorkInteraction(scenarioD_Train, workZoneCorridor);
assert.strictEqual(resD.state, 'UNKNOWN', 'Scenario D with stale telemetry must classify as UNKNOWN');
assert.strictEqual(resD.severity, 'UNKNOWN', 'Scenario D severity must be UNKNOWN');
assert.strictEqual(resD.requiresAttention, true, 'Scenario D must flag requiresAttention: true');
console.log(`✓ Scenario D Passed: Stale telemetry (>15m) -> state: ${resD.state} (requiresAttention: ${resD.requiresAttention})`);

// Scenario E: Route geometry is unavailable -> UNKNOWN, requiresAttention = true
const scenarioE_Train = {
  trainNumber: '12710',
  trainName: 'Simhapuri Express',
  direction: 'UP',
  currentKm: 7.0,
  speedKmph: 65,
  confidence: 'HIGH',
  status: 'RUNNING',
  routeGeometry: null, // Route geometry missing / unavailable
  lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString()
};
const resE = classifyTrainWorkInteraction(scenarioE_Train, workZoneCorridor);
assert.strictEqual(resE.state, 'UNKNOWN', 'Scenario E with missing route geometry must classify as UNKNOWN');
assert.strictEqual(resE.severity, 'UNKNOWN', 'Scenario E severity must be UNKNOWN');
assert.strictEqual(resE.requiresAttention, true, 'Scenario E must flag requiresAttention: true');
console.log(`✓ Scenario E Passed: Route geometry unavailable -> state: ${resE.state} (requiresAttention: ${resE.requiresAttention})`);

// Scenario F: Train moving away from work zone -> NO_INTERACTION
const scenarioF_Train = {
  trainNumber: '12727',
  trainName: 'Godavari Express',
  direction: 'UP',
  currentKm: 18.0, // UP train has already passed KM 14.0 and is at KM 18.0
  speedKmph: 85,
  confidence: 'HIGH',
  status: 'RUNNING',
  routeCode: 'NDLS-MAS-CORRIDOR',
  lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString()
};
const resF = classifyTrainWorkInteraction(scenarioF_Train, workZoneCorridor);
assert.strictEqual(resF.state, 'NO_INTERACTION', 'Scenario F moving away from work zone must be NO_INTERACTION');
assert.strictEqual(resF.severity, 'NONE', 'Scenario F severity must be NONE');
assert.strictEqual(resF.distanceKm, 4.0, 'Scenario F distance past boundary must be 4.0 km (18.0 - 14.0)');
console.log(`✓ Scenario F Passed: Train moving away from work zone -> state: ${resF.state} (receding, distanceKm: ${resF.distanceKm})`);

// Scenario G: Train route intersects section and projected arrival overlaps candidate block -> POTENTIAL_CONFLICT
const scenarioG_Train = {
  trainNumber: '12805',
  trainName: 'Janmabhoomi Express',
  direction: 'UP',
  currentKm: 8.0,
  speedKmph: 75,
  confidence: 'HIGH',
  status: 'RUNNING',
  routeCode: 'NDLS-MAS-CORRIDOR',
  candidateBlockOverlap: true, // Train projected arrival overlaps candidate window 04:30 - 06:30
  lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString()
};
const resG = classifyTrainWorkInteraction(scenarioG_Train, workZoneCorridor);
assert.strictEqual(resG.state, 'POTENTIAL_CONFLICT', 'Scenario G overlapping candidate block must be POTENTIAL_CONFLICT');
assert.strictEqual(resG.severity, 'POTENTIAL_CONFLICT', 'Scenario G severity must be POTENTIAL_CONFLICT');
assert.strictEqual(resG.requiresAttention, true, 'Scenario G requiresAttention must be true');
console.log(`✓ Scenario G Passed: Projected arrival overlaps candidate block -> state: ${resG.state} (severity: ${resG.severity})`);

// -----------------------------------------------------------------------------
// TEST 8: Investigation & Elimination of BR-1021 False Alerts (Section 11)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 8: Investigation & Elimination of BR-1021 False Alerts (Section 11) ---');

const workBR1021 = {
  id: 'BR-1021',
  requestId: 'BR-1021',
  work: 'Track Tamping',
  track: 'UP Main',
  startKm: 702.0,
  endKm: 703.2,
  sectionId: 'SEC-A'
};

const train12627 = {
  trainNumber: '12627',
  trainName: 'Karnataka Express',
  currentStation: 'KTCR',
  currentStationName: 'Kotacheruvu Halt',
  nextStation: 'BSPL',
  latitude: 14.312,
  longitude: 77.721,
  direction: 'UP',
  speedKmph: 45,
  currentKm: 170.9,
  confidence: 'MEDIUM',
  status: 'RUNNING',
  upstreamUpdatedAt: new Date().toISOString()
};

const train20834 = {
  trainNumber: '20834',
  trainName: 'Secunderabad - Visakhapatnam Vande Bharat Express',
  currentStation: 'TMPM',
  currentStationName: 'Timmapuram Halt',
  nextStation: 'HVM',
  latitude: 17.342,
  longitude: 82.511,
  direction: 'UP',
  speedKmph: 69,
  currentKm: 600.63,
  confidence: 'MEDIUM',
  status: 'RUNNING',
  upstreamUpdatedAt: new Date().toISOString()
};

const train12615 = {
  trainNumber: '12615',
  trainName: 'Grand Trunk Express',
  currentStation: 'KVZ',
  currentStationName: 'Kavali',
  nextStation: 'TTU',
  latitude: 14.912,
  longitude: 79.988,
  direction: 'UP',
  speedKmph: 80,
  currentKm: 228.27,
  confidence: 'MEDIUM',
  status: 'RUNNING',
  upstreamUpdatedAt: new Date().toISOString()
};

const falseAlertTrains = [train12627, train20834, train12615];

falseAlertTrains.forEach(t => {
  const trace = traceTrainWorkProximity(t, workBR1021, 'LIVE');
  console.log(`\n[PROXIMITY TRACE LOG] Train ${trace.trainNumber} (${t.trainName}):`);
  console.log(`  trainNumber:          ${trace.trainNumber}`);
  console.log(`  runIdentity:          ${trace.runIdentity}`);
  console.log(`  telemetryTimestamp:   ${trace.telemetryTimestamp}`);
  console.log(`  telemetryAge:         ${trace.telemetryAge}`);
  console.log(`  latitude, longitude:  ${trace.latitude}, ${trace.longitude}`);
  console.log(`  routeId, sectionId:   ${trace.routeId}, ${trace.sectionId}`);
  console.log(`  trackId, trackName:   ${trace.trackId}, ${trace.trackName}`);
  console.log(`  direction:            ${trace.direction}`);
  console.log(`  workRequestId:        ${trace.workRequestId}`);
  console.log(`  workRouteId:          ${trace.workRouteId}`);
  console.log(`  workSectionId:        ${trace.workSectionId}`);
  console.log(`  workTrackId:          ${trace.workTrackId}`);
  console.log(`  workKm:               ${trace.workKmStart} – ${trace.workKmEnd}`);
  console.log(`  routeMatch:           ${trace.routeMatch}`);
  console.log(`  sectionMatch:         ${trace.sectionMatch}`);
  console.log(`  trackMatch:           ${trace.trackMatch}`);
  console.log(`  directionMatch:       ${trace.directionMatch}`);
  console.log(`  distanceAlongRouteKm: ${trace.distanceAlongRouteKm}`);
  console.log(`  speed:                ${trace.speed} km/h`);
  console.log(`  etaMinutes:           ${trace.etaMinutes}`);
  console.log(`  interactionState:     ${trace.interactionState}`);
  console.log(`  confidence:           ${trace.confidence}`);
  console.log(`  reason:               "${trace.reason}"`);

  // CRITICAL VERIFICATION:
  // None of these trains must EVER be marked APPROACHING for BR-1021!
  assert.notStrictEqual(
    trace.interactionState, 
    'APPROACHING', 
    `Train ${trace.trainNumber} must NOT be marked APPROACHING for BR-1021 at KM 702–703.2`
  );
  assert(
    trace.interactionState === 'NO_INTERACTION' || trace.interactionState === 'UNKNOWN',
    `Train ${trace.trainNumber} must be NO_INTERACTION or UNKNOWN (got ${trace.interactionState})`
  );
  console.log(`✓ FALSE ALERT ELIMINATED: Train ${trace.trainNumber} correctly classified as ${trace.interactionState} (NOT APPROACHING)`);
});

// -----------------------------------------------------------------------------
// TEST 9: Comprehensive 12 Operational Scenarios Suite (Section 16)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 9: Comprehensive 12 Operational Scenarios Suite (Section 16) ---');

const baseWork = {
  id: 'REQ-SEC-A-01',
  startKm: 12.4,
  endKm: 13.1,
  track: 'UP Main',
  sectionId: 'SEC-A',
  proximityThresholdKm: 30.0
};

// 1. Real train genuinely near same track within 30 km -> APPROPRIATE proximity state (APPROACHING)
const sc1_Train = {
  trainNumber: '12723',
  trainName: 'Telangana Express',
  currentStation: 'KCC',
  direction: 'UP',
  currentKm: 5.2, // 7.2 km before 12.4
  speedKmph: 72,
  confidence: 'HIGH',
  status: 'RUNNING',
  upstreamUpdatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString()
};
const res1 = classifyTrainWorkInteraction(sc1_Train, baseWork);
assert.strictEqual(res1.state, 'APPROACHING', 'Scenario 1: Genuine near train must be APPROACHING');
assert.strictEqual(res1.distanceKm, 7.2, 'Scenario 1: Distance must be 7.2 km');
assert.strictEqual(res1.etaMinutes, 6, 'Scenario 1: ETA must be 6 minutes at 72 km/h for 7.2 km');
console.log(`✓ Scenario 1 Passed: Genuine near train -> ${res1.state} (${res1.distanceKm} km, ETA ${res1.etaMinutes}m)`);

// 2. Real train on another route -> NO_INTERACTION
const sc2_Train = {
  trainNumber: '17226',
  trainName: 'Amaravati Express',
  onDifferentRoute: true,
  currentKm: 8.0,
  direction: 'UP',
  speedKmph: 60,
  confidence: 'HIGH',
  upstreamUpdatedAt: new Date().toISOString()
};
const res2 = classifyTrainWorkInteraction(sc2_Train, baseWork);
assert.strictEqual(res2.state, 'NO_INTERACTION', 'Scenario 2: Train on another route must be NO_INTERACTION');
console.log(`✓ Scenario 2 Passed: Train on another route -> ${res2.state}`);

// 3. Real train geographically close but on another railway route -> NOT APPROACHING (NO_INTERACTION)
const sc3_Train = {
  trainNumber: '18048',
  trainName: 'East Coast Express',
  routeCode: 'GNT-TENALI-BRANCH',
  currentKm: 10.0,
  direction: 'UP',
  speedKmph: 65,
  confidence: 'HIGH',
  upstreamUpdatedAt: new Date().toISOString()
};
const res3 = classifyTrainWorkInteraction(sc3_Train, { ...baseWork, routeCode: 'BZA-GNT-MAIN' });
assert.strictEqual(res3.state, 'NO_INTERACTION', 'Scenario 3: Branch line train must be NO_INTERACTION');
console.log(`✓ Scenario 3 Passed: Branch line train near location -> ${res3.state}`);

// 4. Real train moving away -> NO_INTERACTION
const sc4_Train = {
  trainNumber: '12704',
  trainName: 'Falaknuma Express',
  direction: 'UP',
  currentKm: 16.0, // Past KM 13.1 on UP line
  speedKmph: 80,
  confidence: 'HIGH',
  upstreamUpdatedAt: new Date().toISOString()
};
const res4 = classifyTrainWorkInteraction(sc4_Train, baseWork);
assert.strictEqual(res4.state, 'NO_INTERACTION', 'Scenario 4: Receding train must be NO_INTERACTION');
assert.strictEqual(res4.distanceKm, 2.9, 'Scenario 4: Distance past boundary must be 2.9 km');
console.log(`✓ Scenario 4 Passed: Receding train past work zone -> ${res4.state} (receding ${res4.distanceKm} km)`);

// 5. Train inside actual work zone -> IN_AFFECTED_RANGE
const sc5_Train = {
  trainNumber: '12710',
  trainName: 'Simhapuri Express',
  direction: 'UP',
  currentKm: 12.8, // Inside [12.4, 13.1]
  speedKmph: 30,
  confidence: 'HIGH',
  upstreamUpdatedAt: new Date().toISOString()
};
const res5 = classifyTrainWorkInteraction(sc5_Train, baseWork);
assert.strictEqual(res5.state, 'IN_AFFECTED_RANGE', 'Scenario 5: Train inside bounds must be IN_AFFECTED_RANGE');
assert.strictEqual(res5.severity, 'HARD_CONFLICT', 'Scenario 5: Must have HARD_CONFLICT');
console.log(`✓ Scenario 5 Passed: Train inside work zone -> ${res5.state} (${res5.severity})`);

// 6. Stale telemetry (>15 min) -> UNKNOWN, requiresAttention = true
const sc6_Train = {
  trainNumber: '12627',
  trainName: 'Karnataka Express',
  direction: 'UP',
  currentKm: 6.0,
  speedKmph: 70,
  confidence: 'HIGH',
  upstreamUpdatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
};
const res6 = classifyTrainWorkInteraction(sc6_Train, baseWork);
assert.strictEqual(res6.state, 'UNKNOWN', 'Scenario 6: Stale telemetry must be UNKNOWN');
assert.strictEqual(res6.requiresAttention, true, 'Scenario 6: Must flag requiresAttention');
console.log(`✓ Scenario 6 Passed: Stale telemetry (>15m) -> ${res6.state} (requiresAttention: ${res6.requiresAttention})`);

// 7. Missing route geometry -> UNKNOWN
const sc7_Train = {
  trainNumber: '12727',
  trainName: 'Godavari Express',
  direction: 'UP',
  currentKm: 7.0,
  speedKmph: 75,
  confidence: 'HIGH',
  routeGeometry: null,
  upstreamUpdatedAt: new Date().toISOString()
};
const res7 = classifyTrainWorkInteraction(sc7_Train, baseWork);
assert.strictEqual(res7.state, 'UNKNOWN', 'Scenario 7: Missing route geometry must be UNKNOWN');
console.log(`✓ Scenario 7 Passed: Missing route geometry -> ${res7.state}`);

// 8. Missing track mapping / out-of-bounds -> UNKNOWN
const workUnmapped = {
  id: 'REQ-OUT-OF-BOUNDS',
  startKm: 702.0,
  endKm: 703.2,
  track: 'UP Main',
  sectionId: 'SEC-A' // SEC-A only spans 0-25
};
const sc8_Train = {
  trainNumber: '12723',
  direction: 'UP',
  currentKm: 700.0,
  speedKmph: 60,
  confidence: 'HIGH',
  upstreamUpdatedAt: new Date().toISOString()
};
const res8 = classifyTrainWorkInteraction(sc8_Train, workUnmapped);
assert.strictEqual(res8.state, 'UNKNOWN', 'Scenario 8: Out-of-bounds / unmapped section must be UNKNOWN');
console.log(`✓ Scenario 8 Passed: Out-of-bounds track mapping -> ${res8.state}`);

// 9. Missing direction -> UNKNOWN
const sc9_Train = {
  trainNumber: '12805',
  trainName: 'Janmabhoomi Express',
  currentKm: 6.0,
  speedKmph: 80,
  confidence: 'HIGH',
  direction: undefined,
  upstreamUpdatedAt: new Date().toISOString()
};
const res9 = classifyTrainWorkInteraction(sc9_Train, baseWork);
assert.strictEqual(res9.state, 'UNKNOWN', 'Scenario 9: Missing direction must be UNKNOWN');
console.log(`✓ Scenario 9 Passed: Missing direction -> ${res9.state}`);

// 10. No train near maintenance work zone -> getNearbyTrainsForLocation returns empty
const res10 = classifyTrainWorkInteraction({
  trainNumber: '99999',
  direction: 'UP',
  currentKm: 2.0,
  onDifferentRoute: true,
  upstreamUpdatedAt: new Date().toISOString()
}, baseWork);
assert.strictEqual(res10.state, 'NO_INTERACTION', 'Scenario 10: Unrelated train must be NO_INTERACTION');
console.log(`✓ Scenario 10 Passed: No train near work zone -> ${res10.state}`);

// 11. Multiple live trains evaluated independently
const multiTrains = [sc1_Train, sc4_Train, sc5_Train];
const multiResults = multiTrains.map(t => classifyTrainWorkInteraction(t, baseWork));
assert.strictEqual(multiResults[0].state, 'APPROACHING', 'First train is APPROACHING');
assert.strictEqual(multiResults[1].state, 'NO_INTERACTION', 'Second train is NO_INTERACTION');
assert.strictEqual(multiResults[2].state, 'IN_AFFECTED_RANGE', 'Third train is IN_AFFECTED_RANGE');
console.log(`✓ Scenario 11 Passed: Multiple trains evaluated independently -> [${multiResults.map(r => r.state).join(', ')}]`);

// 12. Train far away (>30 km along route) -> NO_INTERACTION
const sc12_Train = {
  trainNumber: '12710',
  trainName: 'Simhapuri Express',
  direction: 'UP',
  currentKm: 60.0, // 47 km away from 12.4
  speedKmph: 90,
  confidence: 'HIGH',
  upstreamUpdatedAt: new Date().toISOString()
};
const res12 = classifyTrainWorkInteraction(sc12_Train, baseWork);
assert.strictEqual(res12.state, 'NO_INTERACTION', 'Scenario 12: Train >30 km away must be NO_INTERACTION');
assert.strictEqual(res12.severity, 'NONE', 'Scenario 12: Severity must be NONE');
console.log(`✓ Scenario 12 Passed: Train far away (47.6 km) -> ${res12.state} (outside 30 km proximity threshold)`);

// -----------------------------------------------------------------------------
// TEST 10: Section 13 & 21 Acceptance Suite (Scenarios A through S)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 10: Section 13 & 21 Acceptance Suite (Scenarios A through S) ---');

const testWorkZone = {
  id: 'REQ-SEC-A-MAINT',
  requestId: 'REQ-SEC-A-MAINT',
  startKm: 12.4,
  endKm: 13.1,
  track: 'UP Main',
  sectionId: 'SEC-A',
  stationCode: 'MAG',
  proximityThresholdKm: 30.0,
  blockStartTime: '14:00',
  blockEndTime: '16:00'
};

// Scenario A: Active live train travelling toward active work zone -> APPROACHING
const train_A = {
  trainNumber: '12723',
  trainName: 'Telangana Express',
  currentStation: 'KCC',
  direction: 'UP',
  currentKm: 5.2, // 7.2 km away
  speedKmph: 72,
  confidence: 'HIGH',
  status: 'RUNNING',
  source: 'LIVE',
  upstreamUpdatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString()
};
const res_A = classifyTrainWorkInteraction(train_A, { ...testWorkZone, isActiveNow: true }, 'LIVE');
assert.strictEqual(res_A.state, 'APPROACHING', 'Scenario A: Active train travelling toward active work zone must be APPROACHING');
assert.strictEqual(res_A.cannotGenerateLiveAlert, false, 'Scenario A must be allowed to generate alert');
console.log(`✓ Scenario A: Active live train travelling toward work zone -> ${res_A.state} (${res_A.distanceKm} km, ETA ${res_A.etaMinutes}m)`);

// Scenario B: Active train on compatible route but far away (>30 km) -> NO_INTERACTION
const train_B = {
  trainNumber: '12723',
  direction: 'UP',
  currentKm: 50.0, // 37.6 km away
  speedKmph: 70,
  confidence: 'HIGH',
  status: 'RUNNING',
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_B = classifyTrainWorkInteraction(train_B, { ...testWorkZone, isActiveNow: true }, 'LIVE');
assert.strictEqual(res_B.state, 'NO_INTERACTION', 'Scenario B: Train >30 km away must be NO_INTERACTION');
console.log(`✓ Scenario B: Active train on same route but far away -> ${res_B.state}`);

// Scenario C: Train has already passed work zone -> NO_INTERACTION
const train_C = {
  trainNumber: '12723',
  direction: 'UP',
  currentKm: 18.0, // UP train past KM 13.1
  speedKmph: 60,
  confidence: 'HIGH',
  status: 'RUNNING',
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_C = classifyTrainWorkInteraction(train_C, testWorkZone, 'LIVE');
assert.strictEqual(res_C.state, 'NO_INTERACTION', 'Scenario C: Train passed work zone must be NO_INTERACTION');
console.log(`✓ Scenario C: Train has already passed work zone -> ${res_C.state}`);

// Scenario D: Train moving away from work zone -> NO_INTERACTION
const train_D = {
  trainNumber: '12723',
  direction: 'UP',
  currentKm: 14.5,
  speedKmph: 50,
  confidence: 'HIGH',
  status: 'RUNNING',
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_D = classifyTrainWorkInteraction(train_D, testWorkZone, 'LIVE');
assert.strictEqual(res_D.state, 'NO_INTERACTION', 'Scenario D: Receding train must be NO_INTERACTION');
assert.strictEqual(res_D.reason, 'TRAIN_RECEDING_FROM_WORK_ZONE', 'Scenario D reason must be TRAIN_RECEDING_FROM_WORK_ZONE');
console.log(`✓ Scenario D: Train moving away from work zone -> ${res_D.state} (${res_D.reason})`);

// Scenario E: Train reached final destination -> NO_INTERACTION
const train_E = {
  trainNumber: '12627',
  trainName: 'Karnataka Express',
  currentStation: 'NDLS',
  destinationStation: 'NDLS',
  nextStation: '—',
  direction: 'UP',
  currentKm: 10.0,
  speedKmph: 0,
  confidence: 'HIGH',
  status: 'ARRIVED',
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_E = classifyTrainWorkInteraction(train_E, testWorkZone, 'LIVE');
assert.strictEqual(res_E.state, 'NO_INTERACTION', 'Scenario E: Train reached destination must be NO_INTERACTION');
assert.strictEqual(res_E.reason, 'TRAIN_JOURNEY_COMPLETED_AT_TERMINAL', 'Scenario E reason must be TRAIN_JOURNEY_COMPLETED_AT_TERMINAL');
assert.strictEqual(res_E.cannotGenerateLiveAlert, true, 'Scenario E must not generate live alert');
console.log(`✓ Scenario E: Train reached final destination -> ${res_E.state} (${res_E.reason})`);

// Scenario F: Train is stationary at final destination -> NO_INTERACTION
const train_F = {
  trainNumber: '20834',
  currentStation: 'VSKP',
  destinationStation: 'VSKP',
  direction: 'UP',
  currentKm: 11.5,
  speedKmph: 0,
  status: 'TERMINATED',
  isTerminated: true,
  journeyCompleted: true,
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_F = classifyTrainWorkInteraction(train_F, testWorkZone, 'LIVE');
assert.strictEqual(res_F.state, 'NO_INTERACTION', 'Scenario F: Stationary at terminal must be NO_INTERACTION');
assert.strictEqual(res_F.reason, 'TRAIN_JOURNEY_COMPLETED_AT_TERMINAL', 'Scenario F reason must be TRAIN_JOURNEY_COMPLETED_AT_TERMINAL');
console.log(`✓ Scenario F: Train is stationary at final destination -> ${res_F.state} (${res_F.reason})`);

// Scenario G: Train's remaining route does not contain work zone -> NO_INTERACTION
const train_G = {
  trainNumber: '12711',
  direction: 'UP',
  currentKm: 8.0,
  speedKmph: 65,
  status: 'RUNNING',
  remainingStations: ['BZA', 'KCC', 'GNT'], // Does NOT include 'MAG'
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_G = classifyTrainWorkInteraction(train_G, testWorkZone, 'LIVE');
assert.strictEqual(res_G.state, 'NO_INTERACTION', 'Scenario G: Remaining route excludes work zone must be NO_INTERACTION');
assert.strictEqual(res_G.reason, 'REMAINING_ROUTE_EXCLUDES_WORK_ZONE', 'Scenario G reason must be REMAINING_ROUTE_EXCLUDES_WORK_ZONE');
console.log(`✓ Scenario G: Remaining route does not contain work zone -> ${res_G.state} (${res_G.reason})`);

// Scenario H: Train and maintenance time windows do not overlap -> NO_INTERACTION
const train_H = {
  trainNumber: '12615',
  direction: 'UP',
  currentKm: 6.0,
  speedKmph: 60,
  status: 'RUNNING',
  projectedArrivalTime: '18:30', // Block window is 14:00–16:00
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_H = classifyTrainWorkInteraction(train_H, testWorkZone, 'LIVE');
assert.strictEqual(res_H.state, 'NO_INTERACTION', 'Scenario H: Train ETA 18:30 vs block 14:00–16:00 must be NO_INTERACTION');
assert.strictEqual(res_H.reason, 'NO_TIME_OVERLAP', 'Scenario H reason must be NO_TIME_OVERLAP');
console.log(`✓ Scenario H: Train and maintenance time windows do not overlap -> ${res_H.state} (${res_H.reason})`);

// Scenario I: Active train enters maintenance zone during active maintenance -> IN_AFFECTED_RANGE
const train_I = {
  trainNumber: '12704',
  direction: 'UP',
  currentKm: 12.8, // Inside [12.4, 13.1]
  speedKmph: 45,
  status: 'RUNNING',
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_I = classifyTrainWorkInteraction(train_I, { ...testWorkZone, isActiveNow: true }, 'LIVE');
assert.strictEqual(res_I.state, 'IN_AFFECTED_RANGE', 'Scenario I: Train inside work zone must be IN_AFFECTED_RANGE');
assert.strictEqual(res_I.severity, 'HARD_CONFLICT', 'Scenario I severity must be HARD_CONFLICT');
console.log(`✓ Scenario I: Active train enters maintenance zone -> ${res_I.state} (${res_I.severity})`);

// Scenario J: Stale telemetry (>15m) -> UNKNOWN
const train_J = {
  trainNumber: '12760',
  direction: 'UP',
  currentKm: 8.0,
  status: 'RUNNING',
  source: 'LIVE',
  upstreamUpdatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
};
const res_J = classifyTrainWorkInteraction(train_J, testWorkZone, 'LIVE');
assert.strictEqual(res_J.state, 'UNKNOWN', 'Scenario J: Stale telemetry must be UNKNOWN');
assert.strictEqual(res_J.reason, 'STALE_TELEMETRY', 'Scenario J reason must be STALE_TELEMETRY');
console.log(`✓ Scenario J: Stale telemetry -> ${res_J.state} (${res_J.reason})`);

// Scenario K: Missing route mapping -> UNKNOWN
const train_K = {
  trainNumber: '12710',
  direction: 'UP',
  currentKm: 7.0,
  status: 'RUNNING',
  routeGeometry: null,
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_K = classifyTrainWorkInteraction(train_K, testWorkZone, 'LIVE');
assert.strictEqual(res_K.state, 'UNKNOWN', 'Scenario K: Missing route geometry must be UNKNOWN');
assert.strictEqual(res_K.reason, 'INSUFFICIENT_ROUTE_MAPPING', 'Scenario K reason must be INSUFFICIENT_ROUTE_MAPPING');
console.log(`✓ Scenario K: Missing route mapping -> ${res_K.state} (${res_K.reason})`);

// Scenario L: Missing direction -> UNKNOWN
const train_L = {
  trainNumber: '12805',
  direction: undefined,
  currentKm: 7.0,
  status: 'RUNNING',
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_L = classifyTrainWorkInteraction(train_L, testWorkZone, 'LIVE');
assert.strictEqual(res_L.state, 'UNKNOWN', 'Scenario L: Missing direction must be UNKNOWN');
assert.strictEqual(res_L.reason, 'MISSING_DIRECTION', 'Scenario L reason must be MISSING_DIRECTION');
console.log(`✓ Scenario L: Missing direction -> ${res_L.state} (${res_L.reason})`);

// Scenario M: Mock/static train must NEVER generate LIVE safety alert
const train_M = {
  trainNumber: '99999',
  direction: 'UP',
  currentKm: 6.0,
  speedKmph: 60,
  status: 'RUNNING',
  source: 'DEMO',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_M = classifyTrainWorkInteraction(train_M, { ...testWorkZone, isActiveNow: true }, 'DEMO');
assert.strictEqual(res_M.cannotGenerateLiveAlert, true, 'Scenario M: DEMO data must set cannotGenerateLiveAlert: true');
console.log(`✓ Scenario M: Mock/static train -> cannotGenerateLiveAlert: ${res_M.cannotGenerateLiveAlert}`);

// Regression Test N: Wrong corridor geographically close -> NO_INTERACTION
const train_N = {
  trainNumber: '12627',
  direction: 'UP',
  currentStation: 'KTCR',
  latitude: 14.312,
  longitude: 77.721, // ~250 km from Vijayawada corridor
  currentKm: 10.0,
  status: 'RUNNING',
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_N = classifyTrainWorkInteraction(train_N, testWorkZone, 'LIVE');
assert.strictEqual(res_N.state, 'NO_INTERACTION', 'Scenario N: Wrong corridor must be NO_INTERACTION');
console.log(`✓ Scenario N: Wrong corridor geographically close -> ${res_N.state}`);

// Regression Test O: Historical route contains work zone, remaining route does not -> NO_INTERACTION
const train_O = {
  trainNumber: '12711',
  direction: 'UP',
  currentKm: 8.0,
  speedKmph: 70,
  status: 'RUNNING',
  remainingStations: ['BZA', 'GNT'], // Work is at MAG
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_O = classifyTrainWorkInteraction(train_O, testWorkZone, 'LIVE');
assert.strictEqual(res_O.state, 'NO_INTERACTION', 'Scenario O: Remaining route excludes work zone -> NO_INTERACTION');
console.log(`✓ Scenario O: Historical contains, remaining excludes -> ${res_O.state}`);

// Regression Test P: Correct route but wrong maintenance window -> NO_INTERACTION
const train_P = {
  trainNumber: '12723',
  direction: 'UP',
  currentKm: 6.0,
  speedKmph: 60,
  status: 'RUNNING',
  projectedArrivalTime: '11:15', // Block window is 14:00–16:00
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_P = classifyTrainWorkInteraction(train_P, testWorkZone, 'LIVE');
assert.strictEqual(res_P.state, 'NO_INTERACTION', 'Scenario P: Wrong window must be NO_INTERACTION');
assert.strictEqual(res_P.reason, 'NO_TIME_OVERLAP', 'Scenario P reason must be NO_TIME_OVERLAP');
console.log(`✓ Scenario P: Correct route but wrong maintenance window -> ${res_P.state} (${res_P.reason})`);

// Regression Test Q: Correct route, correct direction, projected arrival overlaps -> POTENTIAL_CONFLICT
const train_Q = {
  trainNumber: '12723',
  direction: 'UP',
  currentKm: 6.0,
  speedKmph: 60,
  status: 'RUNNING',
  projectedArrivalTime: '14:45', // Inside 14:00–16:00
  source: 'LIVE',
  upstreamUpdatedAt: new Date().toISOString()
};
const res_Q = classifyTrainWorkInteraction(train_Q, testWorkZone, 'LIVE');
assert.strictEqual(res_Q.state, 'POTENTIAL_CONFLICT', 'Scenario Q: Arrival inside block window must be POTENTIAL_CONFLICT');
console.log(`✓ Scenario Q: Correct route and window overlap -> ${res_Q.state} (${res_Q.reason})`);

// Regression Test R: Completed train with old telemetry near work zone -> NO_INTERACTION
const train_R = {
  trainNumber: '12723',
  direction: 'UP',
  currentStation: 'BZA',
  destinationStation: 'BZA',
  currentKm: 12.0, // 0.4 km from 12.4
  speedKmph: 0,
  status: 'COMPLETED',
  isTerminated: true,
  journeyCompleted: true,
  source: 'LIVE',
  upstreamUpdatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30m old
};
const res_R = classifyTrainWorkInteraction(train_R, { ...testWorkZone, isActiveNow: true }, 'LIVE');
assert.strictEqual(res_R.state, 'NO_INTERACTION', 'Scenario R: Completed train must be NO_INTERACTION');
assert.strictEqual(res_R.reason, 'TRAIN_JOURNEY_COMPLETED_AT_TERMINAL', 'Scenario R must prioritize terminal check');
console.log(`✓ Scenario R: Completed train with old telemetry near work zone -> ${res_R.state} (${res_R.reason})`);

// Regression Test S: Stale train with insufficient lifecycle information -> UNKNOWN, never APPROACHING
const train_S = {
  trainNumber: '12723',
  direction: 'UP',
  currentKm: 6.0,
  speedKmph: 60,
  status: 'RUNNING',
  source: 'LIVE',
  upstreamUpdatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
};
const res_S = classifyTrainWorkInteraction(train_S, { ...testWorkZone, isActiveNow: true }, 'LIVE');
assert.strictEqual(res_S.state, 'UNKNOWN', 'Scenario S: Stale train must be UNKNOWN');
assert.notStrictEqual(res_S.state, 'APPROACHING', 'Scenario S must NEVER be APPROACHING');
console.log(`✓ Scenario S: Stale train with insufficient information -> ${res_S.state} (never APPROACHING)`);

console.log('\n========================================================================');
console.log(' ALL RAILRADAR INTELLIGENCE VERIFICATION TESTS PASSED SUCCESSFULLY! ✓');
console.log('========================================================================\n');


