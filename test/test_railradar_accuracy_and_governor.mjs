// test/test_railradar_accuracy_and_governor.mjs
// Comprehensive Verification Suite for RailRadar Data Accuracy, Normalization Priority,
// and Server-Side Request Governor (Concurrency, Deduplication, Exponential Backoff, Recovery)

import assert from 'assert';
import { normalizeTrainData, RailRadarRequestGovernor } from '../server/integrations/railRadarService.ts';

console.log('========================================================================');
console.log(' RAIL SAMNVAY — RAILRADAR DATA ACCURACY & GOVERNOR VERIFICATION SUITE');
console.log(' Tests 1–10: Upstream Priority, Normalization, Deduplication, Backoff & Recovery');
console.log('========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] Test ${totalTests}: ${name}`);
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`[PASS] Test ${totalTests}: ${name}`);
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// TEST 1: Train 12627 Normalization Priority (Live Operational > Schedule)
// -----------------------------------------------------------------------------
runTest('Test 1: Train 12627 normalization strictly reflects live operational data (RUNNING, +6m, MALM)', () => {
  const upstreamPayload = {
    trainNumber: '12627',
    trainName: 'Karnataka Express',
    // Live operational fields
    status: 'RUNNING',
    delay: 6,
    currStop: {
      currentStation: 'RC',
      nextStation: 'MALM' // Mantralayam Road
    },
    currentLocation: {
      latitude: 15.892,
      longitude: 77.425,
      speed: 82
    },
    // Timetable / Scheduled fields that must NOT overwrite live data
    schedule: {
      status: 'NOT_STARTED',
      delay: 0,
      nextStation: 'BNC' // Bengaluru Cantt
    },
    route: [
      { stationCode: 'SBC', stationName: 'Bengaluru City' },
      { stationCode: 'BNC', stationName: 'Bengaluru Cantt' }
    ]
  };

  const normalized = normalizeTrainData(upstreamPayload);

  // Live operational data must take priority
  assert.strictEqual(normalized.runningStatus, 'RUNNING', 'runningStatus must be RUNNING, never NOT_STARTED');
  assert.strictEqual(normalized.delayMinutes, 6, 'delayMinutes must be 6, never overwritten to 0');
  assert.strictEqual(normalized.nextStation, 'MALM', 'nextStation must be MALM (Mantralayam Road), never SBC or BNC');
  assert.strictEqual(normalized.currentStation, 'RC', 'currentStation must be RC');
  assert.strictEqual(normalized.provenance.runningStatus.source, 'LIVE_OPERATIONAL');
  assert.strictEqual(normalized.provenance.nextStation.source, 'LIVE_NEXT_STOP');
  assert.strictEqual(normalized.isLive, true);
});

// -----------------------------------------------------------------------------
// TEST 2: Missing live status defaults to UNKNOWN (never NOT_STARTED or guessed)
// -----------------------------------------------------------------------------
runTest('Test 2: Missing live status defaults strictly to UNKNOWN (no guessing NOT_STARTED)', () => {
  const missingStatusPayload = {
    trainNumber: '12723',
    trainName: 'Telangana Express',
    // No live status or runningStatus
    schedule: {
      status: 'NOT_STARTED'
    }
  };

  const normalized = normalizeTrainData(missingStatusPayload);
  assert.strictEqual(normalized.runningStatus, 'UNKNOWN', 'Must default to UNKNOWN when live status is absent');
  assert.strictEqual(normalized.provenance.runningStatus.source, 'DEFAULT_UNKNOWN');
});

// -----------------------------------------------------------------------------
// TEST 3: Positive Delay Preservation (+6 min not converted to 0 or "On Time")
// -----------------------------------------------------------------------------
runTest('Test 3: Delay of 6 min is preserved as exactly 6, never coerced to 0 or On Time', () => {
  const delayPayload = {
    trainNumber: '12615',
    trainName: 'Grand Trunk Express',
    status: 'RUNNING',
    delayMinutes: 6,
    currStop: { nextStation: 'BPQ' }
  };

  const normalized = normalizeTrainData(delayPayload);
  assert.strictEqual(normalized.delayMinutes, 6, 'Must preserve delay of 6 min');
  assert.notStrictEqual(normalized.delayMinutes, 0, 'Must NOT coerce delay to 0');
});

// -----------------------------------------------------------------------------
// TEST 4: Governor Single-Flight Locking (5 components mount -> 1 upstream dispatch)
// -----------------------------------------------------------------------------
await runAsyncTest('Test 4: Governor Single-Flight Locking deduplicates 5 concurrent requests into 1 dispatch', async () => {
  const governor = new RailRadarRequestGovernor({ minIntervalMs: 10 });
  let upstreamFetchCount = 0;

  const mockFetcher = async () => {
    upstreamFetchCount++;
    // Simulate 50ms network delay
    await new Promise(r => setTimeout(r, 50));
    return {
      status: 200,
      headers: {},
      data: { trainNumber: '12627', status: 'RUNNING' },
      upstreamTimestamp: Date.now()
    };
  };

  // Launch 5 simultaneous requests for the exact same key
  const promises = [
    governor.execute('/v1/trains/12627/live', mockFetcher),
    governor.execute('/v1/trains/12627/live', mockFetcher),
    governor.execute('/v1/trains/12627/live', mockFetcher),
    governor.execute('/v1/trains/12627/live', mockFetcher),
    governor.execute('/v1/trains/12627/live', mockFetcher)
  ];

  const results = await Promise.all(promises);

  // Exactly 1 upstream fetch must have taken place
  assert.strictEqual(upstreamFetchCount, 1, 'Only 1 upstream fetch must be dispatched for 5 concurrent callers');
  // All 5 callers must receive the exact same data
  for (const res of results) {
    assert.strictEqual(res.data.trainNumber, '12627');
    assert.strictEqual(res.data.status, 'RUNNING');
  }

  const metrics = governor.getMetrics();
  assert.strictEqual(metrics.requestsSent, 1, 'Metrics: exactly 1 request sent to upstream');
  assert.strictEqual(metrics.requestsDeduplicated, 4, 'Metrics: exactly 4 deduplicated calls');
});

// -----------------------------------------------------------------------------
// TEST 5: Out-of-Order Timestamp Protection
// -----------------------------------------------------------------------------
await runAsyncTest('Test 5: Out-of-order responses do not overwrite newer cached telemetry', async () => {
  const governor = new RailRadarRequestGovernor({ minIntervalMs: 10 });

  const newerTime = 1700000010000;
  const olderTime = 1700000000000;

  // Prime cache with newer response
  await governor.execute('/v1/trains/test/live', async () => ({
    status: 200,
    headers: {},
    data: { position: 'NEWER' },
    upstreamTimestamp: newerTime
  }));

  // Attempt to write older response to same key
  await governor.execute('/v1/trains/test/live', async () => ({
    status: 200,
    headers: {},
    data: { position: 'OLDER' },
    upstreamTimestamp: olderTime
  }), true); // force refresh

  // The cached value must remain NEWER because olderTime < newerTime
  const cached = governor.getCached('/v1/trains/test/live');
  assert.ok(cached, 'Cache entry exists');
  assert.strictEqual(cached.response.data.position, 'NEWER', 'Cache must NOT be overwritten by older response');
});

// -----------------------------------------------------------------------------
// TEST 6: HTTP 429 Exponential Backoff Activation & Short-Circuit
// -----------------------------------------------------------------------------
await runAsyncTest('Test 6: HTTP 429 triggers exponential backoff and short-circuits immediate retries', async () => {
  const governor = new RailRadarRequestGovernor({ minIntervalMs: 10 });
  let callCount = 0;

  const rateLimitingFetcher = async () => {
    callCount++;
    const err = new Error('HTTP 429 Too Many Requests');
    (err).status = 429;
    throw err;
  };

  // First call should fail with 429 and trigger backoff
  const res1 = await governor.execute('/v1/corridor', rateLimitingFetcher);
  assert.strictEqual(res1.upstreamStatus, 429);
  assert.strictEqual(callCount, 1, 'First call hit the network');

  assert.strictEqual(governor.isBackingOff(), true, 'Governor must be in backoff mode');
  assert.ok(governor.getRemainingBackoffSeconds() > 0, 'Backoff seconds must be positive');

  // Immediate second call while in backoff should short-circuit WITHOUT hitting the network
  const res2 = await governor.execute('/v1/corridor', rateLimitingFetcher);
  assert.strictEqual(res2.upstreamStatus, 429);
  assert.strictEqual(res2.errorCode, 'RATE_LIMIT_EXCEEDED');
  assert.strictEqual(callCount, 1, 'Second call must NOT hit network during backoff');
});

// -----------------------------------------------------------------------------
// TEST 7: Retry-After Header Honored
// -----------------------------------------------------------------------------
await runAsyncTest('Test 7: Upstream Retry-After header is strictly honored', async () => {
  const governor = new RailRadarRequestGovernor({ minIntervalMs: 10 });

  const retryAfterFetcher = async () => {
    const err = new Error('Rate Limited');
    (err).status = 429;
    (err).headers = { 'retry-after': '45' };
    throw err;
  };

  const res = await governor.execute('/v1/quota-test', retryAfterFetcher);
  assert.strictEqual(res.upstreamStatus, 429);
  assert.strictEqual(res.backoffSeconds, 45, 'Response should expose backoffSeconds of 45');
  assert.strictEqual(governor.isBackingOff(), true);

  const remainingSec = governor.getRemainingBackoffSeconds();
  assert.ok(remainingSec >= 44 && remainingSec <= 46, `Remaining seconds (${remainingSec}) should be ~45s`);
});

// -----------------------------------------------------------------------------
// TEST 8: Repeated 429s Escalate Backoff Intervals
// -----------------------------------------------------------------------------
await runAsyncTest('Test 8: Consecutive 429 errors increase backoff count (15s -> 45s -> 90s -> 120s)', async () => {
  const governor = new RailRadarRequestGovernor({ minIntervalMs: 10 });

  // Simulate 3 successive 429 backoff increments
  governor.recordRateLimit(null);
  assert.strictEqual(governor.isBackingOff(), true);
  const backoff1 = governor.getRemainingBackoffSeconds();
  assert.ok(backoff1 >= 13 && backoff1 <= 18, `Level 1 backoff: ${backoff1}s`);

  governor.recordRateLimit(null);
  const backoff2 = governor.getRemainingBackoffSeconds();
  assert.ok(backoff2 >= 40 && backoff2 <= 50, `Level 2 backoff: ${backoff2}s`);

  governor.recordRateLimit(null);
  const backoff3 = governor.getRemainingBackoffSeconds();
  assert.ok(backoff3 >= 80 && backoff3 <= 100, `Level 3 backoff: ${backoff3}s`);
});

// -----------------------------------------------------------------------------
// TEST 9: Recovery on 200 OK Resets Backoff to 0
// -----------------------------------------------------------------------------
await runAsyncTest('Test 9: Successful 200 OK response immediately resets backoff to 0', async () => {
  const governor = new RailRadarRequestGovernor({ minIntervalMs: 10 });

  // Cause backoff
  governor.recordRateLimit(null);
  assert.strictEqual(governor.isBackingOff(), true);

  // Reset via success
  governor.recordSuccess();
  assert.strictEqual(governor.isBackingOff(), false, 'Backoff must be cleared');
  assert.strictEqual(governor.getRemainingBackoffSeconds(), 0, 'Backoff seconds must reset to 0');
});

// -----------------------------------------------------------------------------
// TEST 10: Circuit Breaker on 401/403 Authentication Failure
// -----------------------------------------------------------------------------
await runAsyncTest('Test 10: Circuit Breaker trips immediately on 401/403 to prevent quota burn', async () => {
  const governor = new RailRadarRequestGovernor({ minIntervalMs: 10 });
  let networkCalls = 0;

  const authFailingFetcher = async () => {
    networkCalls++;
    const err = new Error('Unauthorized');
    (err).status = 401;
    throw err;
  };

  const res1 = await governor.execute('/v1/protected', authFailingFetcher);
  assert.strictEqual(res1.upstreamStatus, 401);
  assert.strictEqual(networkCalls, 1);

  const health = governor.getHealthState();
  assert.strictEqual(health.failureState, 'AUTHENTICATION_FAILED', 'Circuit breaker must trip to AUTHENTICATION_FAILED');

  // Next call must be blocked immediately without hitting network
  const res2 = await governor.execute('/v1/protected', authFailingFetcher);
  assert.strictEqual(res2.errorCode, 'AUTHENTICATION_FAILED');
  assert.strictEqual(networkCalls, 1, 'No further network calls while breaker is tripped');
});

console.log('\n========================================================================');
console.log(` RESULTS: ${passedTests} of ${totalTests} TESTS PASSED`);
console.log('========================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
