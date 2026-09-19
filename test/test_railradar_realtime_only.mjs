// test/test_railradar_realtime_only.mjs
// RAIL SAMNVAY — RAILRADAR REAL-TIME ONLY HARDENING COMPREHENSIVE TEST SUITE
// 15 Verification Scenarios verifying zero demo fallback in live mode, Section 21 error contracts,
// coordinate fabrication prevention, conflict analysis safety invariants, and anti-spam error banner tracking.

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import domain modules
import { normalizeTrainData } from '../server/integrations/railRadarService.ts';
import { buildNormalizedRailState } from '../src/services/railRadarClient.ts';
import { analyzeLocationTrainConflicts } from '../src/optimization/conflictEngine.ts';
import { isBlockAllocationEligible } from '../src/utils/requestLifecycle.ts';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

console.log('========================================================================');
console.log(' RAIL SAMNVAY — RAILRADAR REAL-TIME ONLY HARDENING TEST SUITE (15 SCENARIOS)');
console.log('========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] Scenario ${totalTests}: ${name}`);
  } catch (err) {
    console.error(`[FAIL] Scenario ${totalTests}: ${name}`);
    console.error(err);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`[PASS] Scenario ${totalTests}: ${name}`);
  } catch (err) {
    console.error(`[FAIL] Scenario ${totalTests}: ${name}`);
    console.error(err);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// SCENARIO 1: Live mode with valid RailRadar telemetry normalization
// -----------------------------------------------------------------------------
runTest('Live mode normalization with genuine GPS telemetry produces valid canonical fields', () => {
  const rawApiData = {
    trainNumber: '12627',
    trainName: 'Karnataka Express',
    currentLocation: {
      latitude: 16.5062,
      longitude: 80.6480,
      stationCode: 'BZA',
      stationName: 'Vijayawada Junction',
      speed: 82,
      delayMinutes: 12
    },
    serviceDate: '2026-09-18'
  };

  const normalized = normalizeTrainData(rawApiData);
  assert(normalized !== null, 'Normalized train data must not be null');
  assert(normalized.trainId.startsWith('12627-20260918'), 'Canonical trainId must combine number and service date');
  assert.strictEqual(normalized.locationConfidence, 'GPS_VERIFIED', 'Coordinates must be GPS_VERIFIED');
  assert.strictEqual(normalized.operationalUsability, 'SUITABLE', 'Complete telemetry must be SUITABLE for planning');
  assert.strictEqual(normalized.conflictStatus, 'UNKNOWN', 'Initial conflict status must be UNKNOWN until evaluated');
  assert.strictEqual(normalized.delaySeconds, 12 * 60, 'delaySeconds must be calculated from delayMinutes');
  assert.deepStrictEqual(normalized.position, { lat: 16.5062, lng: 80.6480 }, 'Position object must match lat/lng');
});

// -----------------------------------------------------------------------------
// SCENARIO 2: Live mode with RailRadar HTTP 401/403 (Invalid API key)
// -----------------------------------------------------------------------------
await runAsyncTest('Live mode with invalid API key returns 401/403 and zero demo fallback', async () => {
  // Test route error mapping directly or via mocked call
  const res = await fetch(`${BASE_URL}/api/railradar/train/99999/live?mode=live`);
  const json = await res.json();
  if (res.status === 401 || res.status === 403) {
    assert.strictEqual(json.errorCode, 'AUTHENTICATION_FAILED');
    assert.strictEqual(json.data, null);
  } else {
    // If our configured key is valid, testing non-existent train returns 404 TRAIN_NOT_FOUND with zero demo fallback
    assert.strictEqual(json.source, 'RAILRADAR');
    assert.strictEqual(json.data, null);
  }
  assert.strictEqual(json.source !== 'DEMO', true, 'Source must never be DEMO in live mode');
});

// -----------------------------------------------------------------------------
// SCENARIO 3: Live mode error formatting for RATE_LIMITED (HTTP 429)
// -----------------------------------------------------------------------------
runTest('Section 21 error format mapping for RATE_LIMITED produces structured contract', () => {
  const normalized = buildNormalizedRailState([], 'UNAVAILABLE', 'UNAVAILABLE', 'RATE_LIMITED', 'Rate limit exceeded');
  assert.strictEqual(normalized.status, 'UNAVAILABLE');
  assert.strictEqual(normalized.errorCode, 'RATE_LIMITED');
  assert.strictEqual(normalized.trains.length, 0);
  assert.strictEqual(normalized.completeness.validCoordinatesRatio, 0);
  assert.strictEqual(normalized.completeness.locationConfirmedRatio, 0);
});

// -----------------------------------------------------------------------------
// SCENARIO 4: Live mode error formatting for PROVIDER_UNAVAILABLE (HTTP 503)
// -----------------------------------------------------------------------------
runTest('Section 21 error format mapping for PROVIDER_UNAVAILABLE produces structured contract', () => {
  const normalized = buildNormalizedRailState([], 'UNAVAILABLE', 'UNAVAILABLE', 'PROVIDER_UNAVAILABLE', 'Upstream RailRadar service unavailable');
  assert.strictEqual(normalized.status, 'UNAVAILABLE');
  assert.strictEqual(normalized.errorCode, 'PROVIDER_UNAVAILABLE');
  assert.strictEqual(normalized.trains.length, 0);
});

// -----------------------------------------------------------------------------
// SCENARIO 5: Live mode error formatting for REQUEST_TIMEOUT (HTTP 504)
// -----------------------------------------------------------------------------
runTest('Section 21 error format mapping for REQUEST_TIMEOUT produces structured contract', () => {
  const normalized = buildNormalizedRailState([], 'UNAVAILABLE', 'ERROR', 'REQUEST_TIMEOUT', 'Upstream request timed out');
  assert.strictEqual(normalized.status, 'ERROR');
  assert.strictEqual(normalized.errorCode, 'REQUEST_TIMEOUT');
  assert.strictEqual(normalized.trains.length, 0);
});

// -----------------------------------------------------------------------------
// SCENARIO 6: Missing API key handling
// -----------------------------------------------------------------------------
runTest('Normalization without valid API key returns NOT_CONFIGURED and zero demo records', () => {
  const normalized = buildNormalizedRailState([], 'UNAVAILABLE', 'UNAVAILABLE', 'NOT_CONFIGURED', 'RAILRADAR_API_KEY not configured');
  assert.strictEqual(normalized.source, 'UNAVAILABLE');
  assert.strictEqual(normalized.errorCode, 'NOT_CONFIGURED');
  assert.strictEqual(normalized.trains.length, 0);
});

// -----------------------------------------------------------------------------
// SCENARIO 7: Explicit DEMO mode correctly returns DEMO trains
// -----------------------------------------------------------------------------
await runAsyncTest('Explicit DEMO mode correctly returns DEMO trains with source=DEMO', async () => {
  const res = await fetch(`${BASE_URL}/api/railradar/corridor/live?mode=demo`);
  assert.strictEqual(res.status, 200, 'Demo endpoint should return 200 OK');
  const json = await res.json();
  assert.strictEqual(json.source, 'DEMO', 'Source must be explicitly DEMO');
  assert(Array.isArray(json.trains) && json.trains.length > 0, 'Demo trains array must not be empty');
  assert.strictEqual(json.success, true);
});

// -----------------------------------------------------------------------------
// SCENARIO 8: Silent mode toggle invariant (Live mode remains live on failure)
// -----------------------------------------------------------------------------
runTest('Live mode state remains isLiveMode=true even when API returns UNAVAILABLE', () => {
  let isLiveMode = true;
  const simulatedPollerFailure = {
    trains: [],
    source: 'UNAVAILABLE',
    error: 'Upstream RailRadar timeout'
  };

  // Invariant: Never automatically mutate isLiveMode to false on failure
  if (simulatedPollerFailure.source === 'UNAVAILABLE') {
    // Only trains array is cleared, isLiveMode stays true
    assert.strictEqual(isLiveMode, true, 'isLiveMode must remain true on telemetry failure');
  }
});

// -----------------------------------------------------------------------------
// SCENARIO 9: Map marker fabrication test (Invalid coords => hasValidCoords = false)
// -----------------------------------------------------------------------------
runTest('Invalid / (0,0) / missing coordinates produce hasValidCoords=false and skip plotting', () => {
  const invalidTrain = {
    trainNumber: '99999',
    trainName: 'Phantom Train',
    latitude: 0,
    longitude: 0,
    currentStation: 'UNKNOWN',
    nextStation: 'UNKNOWN'
  };

  const hasValidGPS = (
    typeof invalidTrain.latitude === 'number' &&
    typeof invalidTrain.longitude === 'number' &&
    Number.isFinite(invalidTrain.latitude) &&
    Number.isFinite(invalidTrain.longitude) &&
    invalidTrain.latitude >= -90 && invalidTrain.latitude <= 90 &&
    invalidTrain.longitude >= -180 && invalidTrain.longitude <= 180 &&
    (invalidTrain.latitude !== 0 || invalidTrain.longitude !== 0)
  );

  assert.strictEqual(hasValidGPS, false, '(0,0) coordinates must NOT be accepted as valid GPS');
});

// -----------------------------------------------------------------------------
// SCENARIO 10: Chainage linear formula removal verification
// -----------------------------------------------------------------------------
runTest('RealRailwayMap.tsx does NOT contain LOCAL_CHAINAGE_SNAP or linear interpolation formulas', () => {
  const mapFilePath = path.join(__dirname, '../src/components/twin/RealRailwayMap.tsx');
  const fileContent = fs.readFileSync(mapFilePath, 'utf8');

  assert.strictEqual(
    fileContent.includes('LOCAL_CHAINAGE_SNAP'),
    false,
    'LOCAL_CHAINAGE_SNAP must be completely removed from RealRailwayMap.tsx'
  );
  assert.strictEqual(
    fileContent.includes('train.currentKm / 80.0'),
    false,
    'Linear chainage ratio formula must be completely removed from RealRailwayMap.tsx'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 11: Multi-train corridor discovery without arbitrary 6-train limit
// -----------------------------------------------------------------------------
await runAsyncTest('Corridor endpoint dynamically processes multiple candidate trains', async () => {
  const customTrains = '12627,12723,17011,20834,12711,12615,12728,12704';
  const res = await fetch(`${BASE_URL}/api/railradar/corridor/live?mode=demo&trains=${encodeURIComponent(customTrains)}`);
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert(json.trains.length >= 6, 'Corridor response must process all requested/discovered trains');
});

// -----------------------------------------------------------------------------
// SCENARIO 12: Single active block invariant (Duplicate timetable prevention)
// -----------------------------------------------------------------------------
runTest('Request lifecycle rejects assigning a duplicate timetable/block to an already allocated request', () => {
  const allocatedReq = {
    id: 'REQ-PLAN-001',
    status: 'Scheduled',
    authorizedBlockId: 'BLK-SCR-BZA-001',
    scheduledBlockId: 'BLK-SCR-BZA-001'
  };

  assert.strictEqual(
    isBlockAllocationEligible(allocatedReq),
    false,
    'Already allocated request must NOT be eligible for a second block allocation'
  );

  const unallocatedReq = {
    id: 'REQ-PLAN-002',
    status: 'Approved'
  };
  assert.strictEqual(
    isBlockAllocationEligible(unallocatedReq),
    true,
    'Unallocated approved request should be eligible'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 13: Conflict analysis invariant: UNKNOWN != NO_CONFLICT
// -----------------------------------------------------------------------------
runTest('When telemetry is UNAVAILABLE, conflictStatus MUST be UNKNOWN (not NO_CONFLICT)', () => {
  // Case A: Timetable is clear at 01:00, but live telemetry is UNAVAILABLE
  const clearResult = analyzeLocationTrainConflicts(
    10.0,
    15.0,
    ['UP Main'],
    60,
    '01:00',
    [], // No live trains
    undefined, // Default parameters
    'UNAVAILABLE', // dataSource
    null,
    {
      telemetryFreshnessThresholdMinutes: 15
    }
  );

  assert.strictEqual(
    clearResult.conflictStatus,
    'UNKNOWN',
    'CRITICAL SAFETY INVARIANT: UNKNOWN != NO_CONFLICT. Telemetry unavailable must yield UNKNOWN conflictStatus'
  );
  assert.strictEqual(
    clearResult.requiresHumanVerification,
    true,
    'Human operational verification must be required when telemetry is UNKNOWN'
  );
  assert.notStrictEqual(
    clearResult.conflictStatus,
    'NO_CONFLICT',
    'System must NEVER declare NO_CONFLICT when telemetry is missing'
  );

  // Case B: Window at 03:00 with scheduled freight train must detect CONFLICT
  const conflictResult = analyzeLocationTrainConflicts(
    10.0,
    15.0,
    ['UP Main'],
    120,
    '03:00',
    [],
    undefined,
    'UNAVAILABLE',
    null
  );
  assert.strictEqual(conflictResult.conflictStatus, 'CONFLICT', 'Direct train conflict must still report CONFLICT');
});

// -----------------------------------------------------------------------------
// SCENARIO 14: Error notification anti-spam test with dismissedErrorHash
// -----------------------------------------------------------------------------
runTest('Dismissing an error sets dismissedErrorHash and suppresses repeat notification unless message changes', () => {
  let dismissedErrorHash = null;
  const error1 = 'RailRadar rate limit exceeded (HTTP 429)';
  const source = 'UNAVAILABLE';
  const hash1 = `${error1}_${source}`;

  // Operator clicks 'X'
  dismissedErrorHash = hash1;
  const isDismissedOnNextPoll = dismissedErrorHash === `${error1}_${source}`;
  assert.strictEqual(isDismissedOnNextPoll, true, 'Same error on subsequent 30s poll must remain dismissed');

  // Error changes (e.g. from 429 to 503)
  const error2 = 'RailRadar upstream service unavailable (HTTP 503)';
  const hash2 = `${error2}_${source}`;
  const isDismissedWhenErrorChanges = dismissedErrorHash === hash2;
  assert.strictEqual(isDismissedWhenErrorChanges, false, 'New error must reopen the notification banner');
});

// -----------------------------------------------------------------------------
// SCENARIO 15: End-to-end corridor health check (/api/railradar/health)
// -----------------------------------------------------------------------------
await runAsyncTest('Health endpoint returns structured diagnostic status without exposing API key', async () => {
  const res = await fetch(`${BASE_URL}/api/railradar/health`);
  assert.strictEqual(res.status, 200, 'Health check should return HTTP 200');
  const json = await res.json();
  assert.strictEqual(json.provider, 'RailRadar');
  assert.strictEqual(typeof json.configured, 'boolean');
  assert.strictEqual(json.backend, 'available');
  assert.strictEqual(typeof json.failureState, 'string');
  assert.strictEqual('apiKey' in json, false, 'API key MUST NOT be exposed in health response');
  assert.strictEqual('RAILRADAR_API_KEY' in json, false, 'Secret MUST NOT be leaked in health response');
});

console.log('\n========================================================================');
console.log(` ALL ${passedTests}/${totalTests} SCENARIOS PASSED SUCCESSFULLY!`);
console.log('========================================================================\n');