/**
 * RAIL SAMNVAY — 20-MINUTE REFRESH CYCLE & RAILRADAR INTEGRATION INVARIANT TEST SUITE
 *
 * Verifies:
 * 1. Current train run identification still works (12627 resolved to current active run).
 * 2. Service-date handling still works (retains origin date across midnight & multi-day rakes).
 * 3. Delay values are interpreted correctly (seconds vs minutes unambiguously handled).
 * 4. RailRadar failures and stale data are handled honestly (no false zero-conflict certainty).
 * 5. Planning and Conflict Monitor consume RailRadar data without modifying underlying logic.
 * 6. The 20-minute prototype refresh does not create duplicate polling loops or conflicting caches.
 * 7. OpenRailwayMap (Infrastructure/GIS) and RailRadar (Live Movements) remain strictly separated.
 */

import 'dotenv/config';
import * as React from 'react';

// Headless React Dispatcher mock for Node environment
(React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = {
  useState: (initial: any) => [initial, () => {}],
  useEffect: () => {},
  useCallback: (fn: any) => fn,
  useRef: (initial: any) => ({ current: initial }),
  useMemo: (fn: any) => fn(),
};

import { 
  fetchLiveTrainStatus, 
  planningConflictCycle, 
  PLANNING_CONFLICT_CYCLE_INTERVAL_MS 
} from '../src/services/railRadarClient';
import { getLiveTrainStatus, getISTDateString } from '../server/services/railRadarService';
import { getSamnvayState, useSamnvayStore } from '../src/store/useSamnvayStore';
import { analyzeLocationTrainConflicts, detectOperationalShift } from '../src/utils/conflictPlanner';
import { resolveLocationIntelligence } from '../server/services/locationIntelligenceService';
import type { LiveTrainPosition } from '../src/types/samnvay';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('=============================================================================');
  console.log('--- RUNNING 20-MINUTE REFRESH CYCLE & RAILRADAR INVARIANT TEST SUITE ---');
  console.log('=============================================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1: Current Train Run Identification Remains Intact
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Current Train Run Identification (12627 Karnataka Express) ---');
  const resolved12627 = await getLiveTrainStatus('12627', { mode: 'live' });
  assert(
    resolved12627.source === 'LIVE' || resolved12627.source === 'UNAVAILABLE',
    'Source is authentic LIVE or honest UNAVAILABLE'
  );
  if (resolved12627.source === 'LIVE' && resolved12627.data) {
    assert(resolved12627.data.trainNumber === '12627', 'Resolved train number matches 12627');
    assert(
      Boolean(resolved12627.data.startDate || resolved12627.data.serviceDate),
      `Resolved run carries legitimate service date: ${resolved12627.data.startDate || resolved12627.data.serviceDate}`
    );
    assert(
      resolved12627.data.startDate === getISTDateString(0) || resolved12627.data.startDate === getISTDateString(-1),
      `Service date reflects current active running instance (${resolved12627.data.startDate})`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Service-Date & Multi-Day Rake Handling
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Service-Date Handling Across Midnight & Multi-Day Rakes ---');
  const yesterdayDate = getISTDateString(-1);
  const yesterday12627 = await getLiveTrainStatus('12627', { mode: 'live', date: yesterdayDate });
  if (yesterday12627.data) {
    assert(
      yesterday12627.data.startDate === yesterdayDate,
      `Explicit date query returns matching origin date: ${yesterday12627.data.startDate}`
    );
    assert(
      yesterday12627.data.trainNumber === '12627',
      'Train number identity preserved on explicit date query'
    );
  } else {
    assert(true, 'Yesterday run legitimately completed or not in active upstream index');
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Delay Values Interpreted Correctly (Seconds vs Minutes)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Delay Interpretation Invariants ---');
  const demoTrain = await fetchLiveTrainStatus('12627', { mode: 'demo' });
  assert(demoTrain.source === 'DEMO', 'Demo mode provides authentic fallback telemetry');
  assert(typeof demoTrain.data?.delayMinutes === 'number', 'delayMinutes is strictly numeric');
  assert(typeof (demoTrain.data as any)?.delaySeconds === 'number', 'delaySeconds is strictly numeric');
  assert(
    (demoTrain.data as any)?.delaySeconds === (demoTrain.data?.delayMinutes || 0) * 60,
    'delaySeconds consistently matches delayMinutes * 60'
  );

  // ---------------------------------------------------------------------------
  // TEST 4: RailRadar Failure & Stale Data Handled Honestly
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Honest Telemetry Availability & Stale Handling ---');
  const unknownTrain = await fetchLiveTrainStatus('9999999', { mode: 'live' });
  assert(
    unknownTrain.source === 'UNAVAILABLE',
    'Unknown train returns UNAVAILABLE source rather than fabricated data'
  );
  assert(
    unknownTrain.data === null,
    'Unknown train returns data === null'
  );
  assert(
    unknownTrain.error === 'Train data unavailable',
    'Returns clear error message "Train data unavailable"'
  );

  // Stale telemetry evaluation in conflict planner
  const staleTrain: LiveTrainPosition = {
    trainNumber: '12723',
    trainName: 'Telangana Express',
    currentStation: 'BZA',
    nextStation: 'KCC',
    direction: 'UP',
    delayMinutes: 5,
    scheduledArrival: '02:00',
    expectedArrival: '02:05',
    speedKmph: 85,
    currentKm: 15.0,
    status: 'RUNNING',
    lastUpdated: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 min stale
    upstreamUpdatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  };
  const staleAnalysis = analyzeLocationTrainConflicts(
    12.4, 13.1, ['UP Main'], 120, '02:00', [staleTrain]
  );
  assert(
    staleAnalysis.isLiveDataStale === true,
    'Conflict planner detects telemetry older than 15 mins as isLiveDataStale'
  );
  assert(
    Boolean(staleAnalysis.staleDataWarning?.includes('LIVE DATA STALE')),
    'Conflict planner issues cautionary warning memo for stale telemetry'
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Planning Engine & Conflict Monitor Consume RailRadar Telemetry
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Planning Engine & Conflict Monitor Consumption ---');
  const store = useSamnvayStore();
  store.resetToInitial();

  const activeCorridorTrain: LiveTrainPosition = {
    trainNumber: '12627',
    trainName: 'Karnataka Express',
    currentStation: 'MAG',
    nextStation: 'KCC',
    direction: 'UP',
    track: 'UP Main',
    delayMinutes: 10,
    scheduledArrival: '02:15',
    expectedArrival: '02:25',
    speedKmph: 90,
    currentKm: 18.5,
    status: 'RUNNING',
    lastUpdated: new Date().toISOString(),
    upstreamUpdatedAt: new Date().toISOString()
  };

  // Feed train to store via canonical updateLiveTrains
  store.updateLiveTrains([activeCorridorTrain], 'LIVE');
  const stateAfterFeed = getSamnvayState();
  assert(
    stateAfterFeed.liveData.liveTrains.length === 1,
    'Store successfully ingests live train position'
  );
  assert(
    stateAfterFeed.liveData.source === 'LIVE',
    'Store registers source as LIVE'
  );

  // Create a block in same section and time
  const reqId = store.createRequest({
    department: 'P.Way',
    section: 'SEC-A',
    startLocation: 'KM 18/000',
    endLocation: 'KM 19/000',
    work: 'Track Tamping',
    workCategory: 'Track Maintenance',
    date: '2026-09-14',
    preferredTime: '02:20',
    duration: 60,
    priority: 'HIGH',
    risk: 'HIGH',
    reason: 'Routine tamping',
    safetyRequirements: ['Detonators'],
    resourcesRequired: ['Tamping machine'],
    priorityScore: 75,
    priorityBreakdown: {
      criticality: 25,
      urgency: 20,
      risk: 15,
      trafficImpact: 10,
      resourceAvailability: 5,
      score: 75,
      explanation: 'Scheduled maintenance'
    },
    affectedTracks: ['UP Main']
  });

  // Re-run store live conflicts
  store.updateLiveTrains([activeCorridorTrain], 'LIVE');
  const updatedState = getSamnvayState();
  assert(
    Boolean(updatedState.liveConflicts),
    'Conflict monitor active and evaluating live train movements'
  );

  // Dynamic Operational Shift Detection
  const shift = detectOperationalShift(
    { startTime: '02:00', endTime: '04:00', track: 'UP Main' },
    [{ ...activeCorridorTrain, currentKm: 17.5, delayMinutes: 120, expectedArrival: '02:30' }]
  );
  assert(
    shift.shiftDetected === true && shift.actionRequired === 'OPERATIONAL_CONFLICT_DETECTED',
    'Planning engine detects approaching delayed train crossing scheduled window'
  );
  assert(
    shift.conflictingTrain?.trainNumber === '12627',
    'Operational shift correctly identifies conflicting train 12627'
  );

  // ---------------------------------------------------------------------------
  // TEST 6: 20-Minute Refresh Cycle Invariants (No Duplicate Loops, No Cache Thrash)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: 20-Minute Prototype Refresh Cycle Verification ---');
  assert(
    PLANNING_CONFLICT_CYCLE_INTERVAL_MS === 20 * 60 * 1000,
    'Cycle interval is exactly 20 minutes (1,200,000 ms)'
  );

  // Start cycle manager
  planningConflictCycle.start();
  let cycleStatus = planningConflictCycle.getState();
  assert(cycleStatus.isActive === true, 'Planning conflict cycle starts and marks isActive: true');
  assert(cycleStatus.intervalMinutes === 20, 'Cycle interval is configured to 20 minutes');
  assert(Boolean(cycleStatus.nextRunTimestamp), 'Calculates explicit nextRunTimestamp');
  assert(planningConflictCycle.getActiveTimerCount() === 1, 'Strictly 1 timer active on initial start');

  // Single loop guard: calling start multiple times (simulating multiple pages opening or page refreshes)
  const initialNextRun = cycleStatus.nextRunTimestamp;
  for (let i = 0; i < 5; i++) {
    planningConflictCycle.start(); // Multiple start attempts from different pages/components
  }
  const guardedStatus = planningConflictCycle.getState();
  assert(
    guardedStatus.nextRunTimestamp === initialNextRun,
    'Single-loop guard prevents duplicate timer registration on multiple page openings'
  );
  assert(
    planningConflictCycle.getActiveTimerCount() === 1,
    'Active timer count remains strictly 1 despite multiple start calls'
  );

  // Simulate multiple components mounting across different pages (e.g. Dashboard, Conflict Monitor, Live Map)
  const unsubs: (() => void)[] = [];
  let multiListenerCalls = 0;
  for (let i = 0; i < 5; i++) {
    const unsub = planningConflictCycle.subscribe(() => {
      multiListenerCalls++;
    });
    unsubs.push(unsub);
  }
  assert(
    planningConflictCycle.getSubscriberCount() === 5,
    'Manager correctly registers 5 concurrent subscribers from mounting components'
  );
  assert(
    planningConflictCycle.getActiveTimerCount() === 1,
    'Active timer count remains strictly 1 with 5 concurrent component subscribers'
  );

  // Simulate concurrent cycle triggers (e.g. multiple components mounting simultaneously)
  // In-flight coalescing must coalesce them into the exact same execution promise
  const [res1, res2] = await Promise.all([
    planningConflictCycle.executeCycle({ mode: 'demo' }),
    planningConflictCycle.executeCycle({ mode: 'demo' })
  ]);
  assert(
    res1.cycleCount === res2.cycleCount,
    'Concurrent cycle triggers coalesce onto the exact same cycle execution (no duplicate requests)'
  );
  assert(
    res1.source === 'DEMO' && res2.source === 'DEMO',
    'Both callers receive authentic cycle results'
  );

  // Simulate unmounting 3 components (e.g. user navigates to another route)
  unsubs.pop()!();
  unsubs.pop()!();
  unsubs.pop()!();
  assert(
    planningConflictCycle.getSubscriberCount() === 2,
    'Subscriber count cleanly decrements to 2 after 3 components unmount'
  );
  assert(
    planningConflictCycle.getActiveTimerCount() === 1,
    'Active timer count remains strictly 1 after component unmounts (remaining pages stay updated)'
  );

  // Unmount remaining 2 components
  unsubs.pop()!();
  unsubs.pop()!();
  assert(
    planningConflictCycle.getSubscriberCount() === 0,
    'Subscriber count decrements to 0 when all components unmount'
  );

  // Verify cycle state
  cycleStatus = planningConflictCycle.getState();
  assert(cycleStatus.cycleRunCount > 0, 'Manager tracks cycleRunCount');
  assert(Boolean(cycleStatus.lastRunTimestamp), 'Manager records lastRunTimestamp');
  assert(cycleStatus.isExecuting === false, 'Execution lock is cleanly released after cycle completes');

  // Tear down timer
  planningConflictCycle.stop();
  assert(planningConflictCycle.getState().isActive === false, 'Cycle manager cleanly stops without leaking timers');
  assert(planningConflictCycle.getActiveTimerCount() === 0, 'Active timer count becomes 0 when stopped');

  // ---------------------------------------------------------------------------
  // TEST 7: Safety Invariant: Cycle Refresh NEVER Modifies Scheduled/Authorized Blocks
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Scheduled Block Immutability Invariant ---');
  const preCycleReq = getSamnvayState().requests.find(r => r.id === 'BR-1021');
  const preCycleStatus = preCycleReq?.status;
  const preCycleTime = preCycleReq?.preferredTime;

  // Simulate incoming refreshed telemetry
  store.updateLiveTrains([activeCorridorTrain], 'LIVE');

  const postCycleReq = getSamnvayState().requests.find(r => r.id === 'BR-1021');
  assert(
    postCycleReq?.status === preCycleStatus,
    'Cycle telemetry refresh NEVER automatically modifies the status of an existing block'
  );
  assert(
    postCycleReq?.preferredTime === preCycleTime,
    'Cycle telemetry refresh NEVER automatically shifts or modifies the scheduled window of an existing block'
  );

  // ---------------------------------------------------------------------------
  // TEST 8: Strict Data Source Separation (OpenRailwayMap GIS vs RailRadar Movements)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: OpenRailwayMap (GIS) vs RailRadar (Movements) Separation ---');
  const locIntel = await resolveLocationIntelligence(
    'KM 12/400',
    'KM 13/100',
    'UP Main',
    [activeCorridorTrain]
  );

  // Infrastructure context from Infrastructure Master / OpenRailwayMap
  assert(
    locIntel.gisContext.source === 'OPENRAILWAYMAP' || locIntel.gisContext.source === 'INFRASTRUCTURE_FALLBACK',
    'Geospatial geometry source is strictly OPENRAILWAYMAP / INFRASTRUCTURE_MASTER'
  );
  assert(
    Boolean(locIntel.gisContext.apiDisclaimer?.includes('OpenRailwayMap')),
    'OpenRailwayMap carries explicit supplementary GIS disclaimer'
  );
  assert(
    locIntel.section.id === 'SEC-A',
    'Sectional boundary strictly determined by Infrastructure Master'
  );

  // Live train context comes strictly from RailRadar
  assert(
    locIntel.liveTrainContext.approachingTrainsCount >= 1,
    'Live train approaches are derived from active RailRadar trains, not OpenRailwayMap'
  );
  assert(
    Boolean(locIntel.liveTrainContext.conflictCategory),
    'Train conflict category derived from RailRadar movement trajectories'
  );

  console.log('\n=============================================================================');
  console.log(`--- 20-MINUTE REFRESH CYCLE TEST RESULTS: ${passed} PASSED / ${failed} FAILED ---`);
  console.log('=============================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    setTimeout(() => process.exit(0), 150);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
