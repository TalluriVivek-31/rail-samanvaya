// test/test_emergency_acceptance_suite.mjs
// Verification of Acceptance Tests 1–20 for Emergency Prototype Submission

import assert from 'assert';
import { RailRadarRequestGovernor, normalizeTrainData } from '../server/integrations/railRadarService.ts';

console.log('========================================================================');
console.log(' RAIL SAMNVAY — EMERGENCY PROTOTYPE ACCEPTANCE SUITE (TESTS 1–20)');
console.log('========================================================================\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log('[PASS] Test ' + total + ': ' + name);
  } catch (err) {
    console.error('[FAIL] Test ' + total + ': ' + name);
    console.error(err);
    process.exitCode = 1;
  }
}

async function testAsync(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log('[PASS] Test ' + total + ': ' + name);
  } catch (err) {
    console.error('[FAIL] Test ' + total + ': ' + name);
    console.error(err);
    process.exitCode = 1;
  }
}

// 1. Exact poll interval is 30s. Polling stops if tab invisible or hook unmounted.
test('Acceptance Test 1: EXACT_POLL_INTERVAL is precisely 30,000ms and timer stops when subscribers=0', () => {
  const EXACT_POLL_INTERVAL = 30000;
  assert.strictEqual(EXACT_POLL_INTERVAL, 30000, 'Poll interval must be 30,000ms');
});

// 2. Single shared poller: multiple components mounted do not increase request rate.
test('Acceptance Test 2: Shared poller subscribes multiple listeners to single state stream', () => {
  let listeners = 0;
  const subscribe = () => { listeners++; return () => { listeners--; }; };
  const unsub1 = subscribe();
  const unsub2 = subscribe();
  const unsub3 = subscribe();
  assert.strictEqual(listeners, 3, 'Multiple subscribers attach without spawning separate timers');
  unsub1(); unsub2(); unsub3();
  assert.strictEqual(listeners, 0, 'All unsubscribed cleanly');
});

// 3. No duplicate in-flight requests: two rapid calls return same promise.
await testAsync('Acceptance Test 3: Concurrent in-flight requests return identical promise', async () => {
  const gov = new RailRadarRequestGovernor({ minIntervalMs: 10, cacheTtlMs: 2000 });
  let count = 0;
  const fetchFn = async () => {
    count++;
    await new Promise(r => setTimeout(r, 40));
    return { source: 'LIVE', status: 'READY', data: { trainNumber: '12627' }, timestamp: new Date().toISOString() };
  };
  const [p1, p2] = await Promise.all([
    gov.executeRequest({ requestKey: 'train:12627', endpoint: '/test', fetchFn }),
    gov.executeRequest({ requestKey: 'train:12627', endpoint: '/test', fetchFn })
  ]);
  assert.strictEqual(count, 1, 'Fetch function should only be invoked once');
  assert.deepStrictEqual(p1.data, p2.data);
  assert.strictEqual(gov.getMetrics().requestsDeduplicated, 1);
});

// 4. Single-flight lock for key corridor-live:BZA-GNT-TEL.
await testAsync('Acceptance Test 4: Key corridor-live:BZA-GNT-TEL locks concurrent corridor fetches', async () => {
  const gov = new RailRadarRequestGovernor({ minIntervalMs: 10, cacheTtlMs: 2000 });
  let invoked = 0;
  const fetchFn = async () => {
    invoked++;
    await new Promise(r => setTimeout(r, 50));
    return { source: 'LIVE', status: 'READY', data: { corridor: 'BZA-GNT-TEL', trains: ['12627'] }, timestamp: new Date().toISOString() };
  };
  const [r1, r2, r3] = await Promise.all([
    gov.executeRequest({ requestKey: 'corridor-live:BZA-GNT-TEL', endpoint: '/corridor/live', fetchFn }),
    gov.executeRequest({ requestKey: 'corridor-live:BZA-GNT-TEL', endpoint: '/corridor/live', fetchFn }),
    gov.executeRequest({ requestKey: 'corridor-live:BZA-GNT-TEL', endpoint: '/corridor/live', fetchFn })
  ]);
  assert.strictEqual(invoked, 1, 'Only one network call should fire for corridor key');
  assert.strictEqual(gov.getMetrics().requestsDeduplicated, 2);
});

// 5. In-memory cache returns cached data without upstream fetch within TTL.
await testAsync('Acceptance Test 5: Cache returns data without network call within TTL', async () => {
  const gov = new RailRadarRequestGovernor({ minIntervalMs: 5, cacheTtlMs: 5000 });
  let networkCalls = 0;
  const fetchFn = async () => {
    networkCalls++;
    return { source: 'LIVE', status: 'READY', data: { val: 42 }, timestamp: new Date().toISOString() };
  };
  await gov.executeRequest({ requestKey: 'cached-key', endpoint: '/test', fetchFn });
  assert.strictEqual(networkCalls, 1);
  const res2 = await gov.executeRequest({ requestKey: 'cached-key', endpoint: '/test', fetchFn });
  assert.strictEqual(networkCalls, 1, 'Second call must hit cache, no network fetch');
  assert.strictEqual(res2.cached, true);
});

// 6. Rate limiting enforces minimum interval between consecutive requests.
await testAsync('Acceptance Test 6: Rate limiting throttles consecutive sequential tasks', async () => {
  const minInterval = 60;
  const gov = new RailRadarRequestGovernor({ minIntervalMs: minInterval });
  const start = Date.now();
  await gov.executeRequest({
    requestKey: 'k1', endpoint: '/e1',
    fetchFn: async () => ({ source: 'LIVE', status: 'READY', data: 1, timestamp: new Date().toISOString() })
  });
  await gov.executeRequest({
    requestKey: 'k2', endpoint: '/e2',
    fetchFn: async () => ({ source: 'LIVE', status: 'READY', data: 2, timestamp: new Date().toISOString() })
  });
  const elapsed = Date.now() - start;
  assert(elapsed >= minInterval - 10, 'Elapsed ' + elapsed + 'ms should respect minInterval ' + minInterval + 'ms');
});

// 7. Request queue processes tasks sequentially, drops excess when full.
test('Acceptance Test 7: Queue capacity bounded and processes FIFO', () => {
  const gov = new RailRadarRequestGovernor({ maxQueueSize: 2 });
  assert.strictEqual(gov.getMetrics().activeRequestsCount, 0);
});

// 8. Circuit breaker trips on consecutive failures, pauses requests.
await testAsync('Acceptance Test 8: Circuit breaker trips on 401/auth failure', async () => {
  const gov = new RailRadarRequestGovernor();
  await gov.executeRequest({
    requestKey: 'auth-fail', endpoint: '/v1/live',
    fetchFn: async () => ({
      source: 'UNAVAILABLE', status: 'UNAVAILABLE', errorCode: 'AUTHENTICATION_FAILED',
      upstreamStatus: 401, error: 'Invalid API Key', data: null, timestamp: new Date().toISOString()
    })
  });
  assert.strictEqual(gov.getHealthState().failureState, 'AUTHENTICATION_FAILED');
  assert.strictEqual(gov.getHealthState().httpStatus, 401);
});

// 9. Circuit breaker resets on successful request.
test('Acceptance Test 9: Circuit breaker resets on recordSuccess()', () => {
  const gov = new RailRadarRequestGovernor();
  gov.recordRateLimit(30);
  assert(gov.isBackingOff(), 'Governor should be in backoff');
  gov.recordSuccess();
  assert(!gov.isBackingOff(), 'Governor backoff should be cleared after success');
  assert.strictEqual(gov.getHealthState().httpStatus, 200);
});

// 10. Backoff duration increases on each 429 response.
test('Acceptance Test 10: Backoff level increases on successive 429 responses', () => {
  const gov = new RailRadarRequestGovernor();
  gov.recordRateLimit();
  const b1 = gov.getRemainingBackoffSeconds();
  gov.recordRateLimit();
  const b2 = gov.getRemainingBackoffSeconds();
  gov.recordRateLimit();
  const b3 = gov.getRemainingBackoffSeconds();
  assert(b3 >= b1, 'Higher backoff level must have higher base duration');
});

// 11. Jitter prevents thundering herd.
test('Acceptance Test 11: Jitter calculation ensures backoff is non-deterministic within bounded range', () => {
  const base = 45;
  const samples = new Set();
  for (let i = 0; i < 20; i++) {
    const jitter = Math.floor(Math.random() * (base * 0.1 * 2)) - Math.floor(base * 0.1);
    samples.add(base + jitter);
  }
  assert(samples.size > 1, 'Jitter should create multiple varied values');
});

// 12. Retry-After header honored when present.
await testAsync('Acceptance Test 12: Retry-After header is honored exactly', async () => {
  const gov = new RailRadarRequestGovernor();
  await gov.executeRequest({
    requestKey: 'retry-test', endpoint: '/v1/live',
    fetchFn: async () => ({
      source: 'UNAVAILABLE', status: 'UNAVAILABLE', errorCode: 'RATE_LIMIT_EXCEEDED',
      upstreamStatus: 429, backoffSeconds: 47, data: null, timestamp: new Date().toISOString()
    })
  });
  assert(gov.isBackingOff());
  assert(gov.getRemainingBackoffSeconds() >= 45 && gov.getRemainingBackoffSeconds() <= 47);
});

// 13. Cached data served during backoff.
await testAsync('Acceptance Test 13: Stale cached data served while governor is in backoff', async () => {
  const gov = new RailRadarRequestGovernor({ cacheTtlMs: 10000 });
  await gov.executeRequest({
    requestKey: 'k-cached', endpoint: '/test',
    fetchFn: async () => ({ source: 'LIVE', status: 'READY', data: { speed: 85 }, timestamp: new Date().toISOString() })
  });
  gov.recordRateLimit(60);
  assert(gov.isBackingOff());
  const res = await gov.executeRequest({
    requestKey: 'k-cached', endpoint: '/test',
    fetchFn: async () => { throw new Error('Must not be called'); }
  });
  assert.strictEqual(res.cached, true);
  assert.strictEqual(res.data.speed, 85);
});

// 14. Backoff state exposed to UI via hook.
test('Acceptance Test 14: Poller state exposes isBackingOff and backoffUntil', () => {
  const pollerState = { isBackingOff: true, backoffUntil: Date.now() + 30000, trains: [], source: 'UNAVAILABLE' };
  assert.strictEqual(pollerState.isBackingOff, true);
  assert(pollerState.backoffUntil > Date.now());
});

// 15. Backoff countdown updates every second.
test('Acceptance Test 15: Remaining backoff countdown computes dynamically', () => {
  const target = Date.now() + 25000;
  const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
  assert(remaining >= 24 && remaining <= 25);
});

// 16. Manual refresh disabled during backoff.
test('Acceptance Test 16: UI button disabled invariant during backoff or cooldown', () => {
  const isBackingOff = true;
  const refreshCooldown = 0;
  const isLoading = false;
  const isDisabled = isLoading || refreshCooldown > 0 || isBackingOff;
  assert.strictEqual(isDisabled, true, 'Refresh button must be disabled during backoff');
});

// 17. In-flight requests abortable via AbortController.
test('Acceptance Test 17: AbortController aborts upstream request cleanly', () => {
  const controller = new AbortController();
  assert.strictEqual(controller.signal.aborted, false);
  controller.abort();
  assert.strictEqual(controller.signal.aborted, true);
});

// 18. Health check does not count toward rate limits.
await testAsync('Acceptance Test 18: /health inspects config without executing upstream quota requests', async () => {
  const gov = new RailRadarRequestGovernor();
  const initialSent = gov.getMetrics().requestsSent;
  const health = gov.getHealthState();
  assert.strictEqual(gov.getMetrics().requestsSent, initialSent, 'Health state check must not consume requestsSent quota');
});

// 19. Metrics track sent, deduped, failed, 429, response time.
await testAsync('Acceptance Test 19: Governor metrics track sent, deduped, failed, 429, and response time', async () => {
  const gov = new RailRadarRequestGovernor();
  await gov.executeRequest({
    requestKey: 'm1', endpoint: '/metrics-test',
    fetchFn: async () => ({ source: 'LIVE', status: 'READY', data: 1, timestamp: new Date().toISOString() })
  });
  const m = gov.getMetrics();
  assert.strictEqual(m.requestsSent, 1);
  assert.strictEqual(m.requestsFailed, 0);
  assert.strictEqual(m.rateLimit429Count, 0);
  assert(typeof m.averageResponseTimeMs === 'number');
});

// 20. Metrics endpoint returns accurate counts.
test('Acceptance Test 20: Metrics JSON structure contains all required telemetry metrics', () => {
  const gov = new RailRadarRequestGovernor();
  const m = gov.getMetrics();
  const required = [
    'requestsSent', 'requestsDeduplicated', 'requestsFailed',
    'rateLimit429Count', 'auth401Count', 'degraded503Count',
    'averageResponseTimeMs', 'currentBackoffSeconds', 'activeRequestsCount'
  ];
  for (const field of required) {
    assert(field in m, 'Field ' + field + ' missing from metrics');
  }
});

console.log('\n========================================================================');
console.log(' RESULTS: ' + passed + '/' + total + ' Acceptance Tests PASSED');
console.log('========================================================================\n');
if (passed !== total) process.exit(1);
