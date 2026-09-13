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

import { getLiveTrainStatus, normalizeTrainData, getISTDateString, clearRailRadarCache } from '../server/services/railRadarService.js';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('  RAIL SAMNVAY — RAILRADAR RUN IDENTITY RESOLUTION TEST SUITE   ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  async function testCase(name: string, fn: () => Promise<void>) {
    total++;
    console.log(`[TEST ${total}] ${name}`);
    try {
      await fn();
      passed++;
      console.log(`>>> [TEST ${total}] PASSED\n`);
    } catch (err: any) {
      console.error(`>>> [TEST ${total}] FAILED:`, err.message, '\n');
    }
  }

  // Clear cache before test
  clearRailRadarCache();

  // -------------------------------------------------------------
  // Test 1: 12627 Karnataka Express Current Run Resolution
  // -------------------------------------------------------------
  await testCase('12627 Karnataka Express: Resolves current active run (2026-09-13)', async () => {
    const res = await getLiveTrainStatus('12627', { mode: 'live', forceRefresh: true });
    assert(res.source === 'LIVE', `Response source must be LIVE, got: ${res.source}`);
    assert(res.data !== null, 'Response data must not be null');
    assert(res.data.trainNumber === '12627', `Train number must be 12627, got: ${res.data.trainNumber}`);
    
    // Core check: Must be the active running rake (2026-09-13), NOT the old 2-day-old run (2026-09-12)
    const activeDate = res.data.startDate;
    assert(
      activeDate === '2026-09-13' || activeDate === getISTDateString(0) || activeDate === getISTDateString(-1),
      `startDate must be active running instance (2026-09-13), got: ${res.data.startDate}`
    );
    assert(res.data.serviceDate === activeDate, `serviceDate must match activeDate ${activeDate}, got: ${res.data.serviceDate}`);
    assert(res.data.status === 'RUNNING', `status must be RUNNING, got: ${res.data.status}`);
    assert(typeof res.data.delayMinutes === 'number', 'delayMinutes must be numeric');
    assert(typeof res.data.delaySeconds === 'number', 'delaySeconds must be numeric');
    assert(!!res.data.upstreamUpdatedAt, `upstreamUpdatedAt must be present: ${res.data.upstreamUpdatedAt}`);
    
    console.log(`    Detail: Train ${res.data.trainNumber} (${res.data.trainName})`);
    console.log(`    Resolved Date: ${res.data.startDate}`);
    console.log(`    Location: ${res.data.currentStationName} (${res.data.currentStation})`);
    console.log(`    Delay: ${res.data.delayMinutes}m (${res.data.delaySeconds}s)`);
    console.log(`    Telemetry: ${res.data.upstreamUpdatedAt}`);
  });

  // -------------------------------------------------------------
  // Test 2: Sequential Multi-train Query Isolation (12627 -> 12723 -> 12615 -> 53344)
  // -------------------------------------------------------------
  await testCase('Multi-train Query Isolation: No state leakage across trains', async () => {
    const trains = ['12627', '12723', '12615', '53344'];
    const results: Record<string, any> = {};

    for (const tr of trains) {
      if (tr !== '12627') await sleep(6500);
      const res = await getLiveTrainStatus(tr, { mode: 'live', forceRefresh: false });
      assert(res.source === 'LIVE', `Train ${tr} source must be LIVE, got: ${res.source}`);
      assert(res.data !== null, `Train ${tr} data must not be null`);
      assert(res.data.trainNumber === tr, `Train ${tr} returned number must be ${tr}, got: ${res.data.trainNumber}`);
      results[tr] = res.data;
      console.log(`    Train ${tr}: Location = ${res.data.currentStationName || res.data.currentStation}, Date = ${res.data.startDate}`);
    }

    // Verify all 4 trains returned distinct objects with their own identities
    assert(results['12627'].trainNumber === '12627', '12627 retained identity');
    assert(results['12723'].trainNumber === '12723', '12723 retained identity');
    assert(results['12615'].trainNumber === '12615', '12615 retained identity');
    assert(results['53344'].trainNumber === '53344', '53344 retained identity');

    assert(results['12627'].currentStation !== results['12723'].currentStation, '12627 and 12723 stations are distinct');
  });

  // -------------------------------------------------------------
  // Test 3: Cache Invariant: Run-keyed caching prevents run collisions
  // -------------------------------------------------------------
  await testCase('Cache Invariant: Subsequent requests hit cache without mutating run identity', async () => {
    const cachedRes = await getLiveTrainStatus('12627', { mode: 'live', forceRefresh: false });
    assert(cachedRes.cached === true, 'Subsequent request must be served from cache');
    assert(cachedRes.data.trainNumber === '12627', 'Cached train number must be 12627');
    assert(
      cachedRes.data.startDate === '2026-09-13' || cachedRes.data.startDate === getISTDateString(0) || cachedRes.data.startDate === getISTDateString(-1),
      `Cached startDate must be active running instance, got: ${cachedRes.data.startDate}`
    );
  });

  // -------------------------------------------------------------
  // Test 4: Manual Invalidation (forceRefresh) busts cache cleanly
  // -------------------------------------------------------------
  await testCase('Cache Invalidation: forceRefresh forces fresh upstream query', async () => {
    await sleep(7000);
    const freshRes = await getLiveTrainStatus('12627', { mode: 'live', forceRefresh: true });
    assert(freshRes.cached === false, 'forceRefresh request must NOT be cached');
    assert(freshRes.data.trainNumber === '12627', 'Fresh train number must be 12627');
    assert(
      freshRes.data.startDate === '2026-09-13' || freshRes.data.startDate === getISTDateString(0) || freshRes.data.startDate === getISTDateString(-1),
      'Fresh train startDate must be active running instance'
    );
  });

  // -------------------------------------------------------------
  // Test 5: Explicit Date Querying: Allows querying specific runs
  // -------------------------------------------------------------
  await testCase('Explicit Date Query: Querying explicit date returns matching run', async () => {
    await sleep(7000);
    const targetDate = '2026-09-13';
    const dateRes = await getLiveTrainStatus('12627', { mode: 'live', forceRefresh: false, date: targetDate });
    assert(dateRes.source === 'LIVE', 'Explicit date run source must be LIVE');
    assert(dateRes.data.startDate === targetDate, `Explicit date run startDate must be ${targetDate}, got: ${dateRes.data.startDate}`);
    assert(dateRes.data.trainNumber === '12627', 'Explicit date run trainNumber must be 12627');
    console.log(`    Explicit date 12627 location: ${dateRes.data.currentStationName} (${dateRes.data.currentStation})`);
  });

  // -------------------------------------------------------------
  // Test 6: Stale Run Rejection in Normalization
  // -------------------------------------------------------------
  await testCase('Normalization: Rejects run if returned date does not match expected date', async () => {
    const rawMock = {
      success: true,
      data: {
        trainNumber: '12627',
        trainName: 'Karnataka Express',
        startDate: '2026-09-10', // Stale run from 3 days ago
        status: 'running',
        lastUpdatedAt: '2026-09-13T20:00:00+05:30'
      }
    };

    const normalized = normalizeTrainData(rawMock, '12627', '2026-09-13');
    assert(normalized === null, 'normalizeTrainData must return null when startDate mismatches expectedDate');
  });

  // -------------------------------------------------------------
  // Test 7: Missing Run Identity Protection (Never fabricate dates)
  // -------------------------------------------------------------
  await testCase('Run Identity Protection: Never fabricate missing run/service date', async () => {
    const rawNoDate = {
      success: true,
      data: {
        trainNumber: '12627',
        trainName: 'Karnataka Express',
        // Missing startDate and originDate
        status: 'running',
        lastUpdatedAt: '2026-09-13T20:00:00+05:30'
      }
    };

    const normalized = normalizeTrainData(rawNoDate, '12627');
    assert(normalized !== null, 'Normalization succeeds');
    assert(normalized.startDate === undefined, 'startDate must be undefined when missing upstream');
    assert(normalized.serviceDate === undefined, 'serviceDate must be undefined when missing upstream');
    assert(normalized.runId === null, 'runId must be null');
    assert(normalized.journeyId === null, 'journeyId must be null');
  });

  // -------------------------------------------------------------
  // Test 8: Midnight / Overnight Journey Continuity Simulation
  // -------------------------------------------------------------
  await testCase('Midnight Crossover: Overnight train remains attached to originating run', async () => {
    const yesterdayRun = {
      data: {
        trainNumber: '12622',
        trainName: 'Tamil Nadu Express',
        startDate: '2026-09-13',
        status: 'running',
        lastUpdatedAt: '2026-09-14T01:05:00+05:30',
        currentLocation: {
          stationCode: 'BZA',
          stationName: 'Vijayawada Jn',
          status: 'departed'
        }
      }
    };

    const normYest = normalizeTrainData(yesterdayRun, '12622', '2026-09-13');
    assert(normYest !== null, 'Yesterday run correctly normalized');
    assert(normYest.startDate === '2026-09-13', 'Service date matches origin date 2026-09-13');
    assert(normYest.status === 'RUNNING', 'Status remains RUNNING across midnight');
    assert(normYest.telemetryTimestamp === '2026-09-14T01:05:00+05:30', 'Telemetry timestamp reflects actual observation time');
  });

  console.log('================================================================');
  console.log(`  RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================');

  if (passed < total) {
    process.exit(1);
  }
}

runTests();
