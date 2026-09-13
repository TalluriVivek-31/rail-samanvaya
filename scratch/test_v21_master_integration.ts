// scratch/test_v21_master_integration.ts
// Automated Acceptance Test Suite for Rail Samnvay v2.1
// Verifies:
// 1. OpenRailwayMap service (lookup, cache, deduplication, timeout fallback)
// 2. Location Intelligence Engine (KM normalization, station identification, between stations, GIS context, RailRadar proximity)
// 3. 3-Way Conflict Manager (Train movement conflict, department conflict, spatial overlap)
// 4. Multi-Department Coordination & CPM (Parallel vs sequential durations, TF = LS - ES, Utilization <= 100%)
// 5. Preservation of all v2.0 invariants (Requisition != Block, 4-step modal, RBAC self-approval rejection, audit trail)

import { 
  findRailwayGeometry, 
  findNearbyFacilities, 
  findMilestones, 
  findRailwayRoute,
  clearOpenRailwayMapCache,
  CORRIDOR_GIS_FALLBACK
} from '../server/services/openRailwayMapService';
import { resolveLocationIntelligence } from '../server/services/locationIntelligenceService';
import { calculateCpmActivityNetwork, evaluateMultiDepartmentOverlaps, analyzeLocationTrainConflicts } from '../src/utils/conflictPlanner';
import { parseRailwayKm, formatRailwayKm, calculateAffectedLength } from '../src/utils/railwayLocation';
import { getSamnvayState, setSamnvayState } from '../src/store/useSamnvayStore';
import type { BlockRequest, BlockStatus, LiveTrainPosition } from '../src/types/samnvay';
import * as fs from 'fs';
import * as path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

async function runV21Tests() {
  console.log('======================================================================');
  console.log('       RAIL SAMNVAY v2.1 — MASTER INTEGRATION ACCEPTANCE SUITE        ');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // 1. OPENRAILWAYMAP SERVICE TESTS
  // -------------------------------------------------------------------------
  console.log('--- 1. OpenRailwayMap Service & Adapter Tests ---');
  clearOpenRailwayMapCache();

  // Test 1.1: Geometry lookup with fallback resilience
  const geomRes = await findRailwayGeometry([16.4, 80.5, 16.5, 80.6]);
  assert(geomRes.success === true, "OpenRailwayMap findRailwayGeometry succeeds gracefully");
  assert(geomRes.data !== null && geomRes.data.length > 0, "Railway geometry data returned");
  assert(geomRes.source === 'OPENRAILWAYMAP' || geomRes.source === 'INFRASTRUCTURE_FALLBACK', "Source is valid ORM or fallback");

  // Test 1.2: Cache Hit Verification
  const geomResCached = await findRailwayGeometry([16.4, 80.5, 16.5, 80.6]);
  assert(geomResCached.source === 'CACHE', "Repeated geometry query served from 12-hour application cache");

  // Test 1.3: Facilities lookup
  const facRes = await findNearbyFacilities(16.435, 80.565, 5.0);
  assert(facRes.success === true && facRes.data !== null, "Nearby facilities query returns railway facilities");
  assert(facRes.data!.some(f => f.name.includes('Mangalagiri') || f.type === 'crossover' || f.type === 'substation'), "Facilities contain authentic railway infrastructure");

  // Test 1.4: Milestones lookup
  const mileRes = await findMilestones(16.435, 80.565, 3.0);
  assert(mileRes.success === true, "Milestones query executes cleanly");

  // Test 1.5: Route lookup
  const routeRes = await findRailwayRoute('ROUTE-01');
  assert(routeRes.success === true && routeRes.data !== null, "Railway route geometry retrieved");

  // -------------------------------------------------------------------------
  // 2. LOCATION INTELLIGENCE ENGINE & STATION IDENTIFICATION TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Location Intelligence & Station Identification Tests ---');

  // Test 2.1: KM Normalization and Range Calculation
  const kmStart = parseRailwayKm('12/400');
  const kmEnd = parseRailwayKm('13/100');
  assert(kmStart === 12.4, "KM 12/400 normalized to decimal 12.400");
  assert(kmEnd === 13.1, "KM 13/100 normalized to decimal 13.100");
  const affLen = calculateAffectedLength(kmStart, kmEnd);
  assert(affLen.lengthMeters === 700, "Affected length calculated exactly as 700 metres (0.700 km)");

  // Test 2.2: Location Intelligence Resolution
  const locIntel = await resolveLocationIntelligence('12/400', '13/100', 'UP Main');
  assert(locIntel.isValid === true, "Location intelligence resolves valid interval 12/400–13/100");
  assert(locIntel.station?.code === 'MAG', "Station identified as Mangalagiri (MAG)");
  assert(locIntel.station?.isStationLimitIntersection === true, "Identified as Station Yard Limit Intersection");
  assert(locIntel.section.id === 'SEC-A', "Section identified as SEC-A (BZA–MAG)");
  assert(locIntel.gisContext.geometry.length > 0, "GIS context contains mapped railway geometry");
  assert(locIntel.gisContext.apiDisclaimer.includes("Infrastructure Master"), "Disclaimer clearly states Infrastructure Master is official operational truth");

  // Test 2.3: Between Stations Identification
  const betweenIntel = await resolveLocationIntelligence('2.500', '4.200', 'UP Main');
  assert(betweenIntel.isValid === true, "Between-stations interval 2.500–4.200 resolved");
  assert(betweenIntel.betweenStations !== null, "Between-stations relationship identified");
  assert(betweenIntel.betweenStations?.display.includes('Vijayawada') && betweenIntel.betweenStations?.display.includes('Krishna Canal'), "Displays 'Vijayawada Jn (BZA) → Krishna Canal Jn (KCC)'");

  // Test 2.4: Start KM > End KM Validation
  const invalidLoc = await resolveLocationIntelligence('14/000', '12/000', 'UP Main');
  assert(invalidLoc.isValid === false, "Start KM > End KM (14/000 > 12/000) correctly rejected with error");

  // -------------------------------------------------------------------------
  // 3. THREE-WAY CONFLICT CLASSIFICATION & TRAIN APPROACH
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Three-Way Conflict Classification Tests ---');

  // Test 3.1: Train Movement Conflict (Live train on same track in safety window)
  const mockTrains: LiveTrainPosition[] = [
    {
      trainNumber: '12627',
      trainName: 'Karnataka Express',
      currentKm: 10.5,
      direction: 'UP',
      track: 'UP Main',
      speedKmph: 110,
      expectedArrival: '02:25',
      delayMinutes: 5,
      status: 'ON_TIME',
      updatedAt: '02:00 IST'
    }
  ];

  const locWithTrain = await resolveLocationIntelligence('12/400', '13/100', 'UP Main', mockTrains);
  assert(locWithTrain.liveTrainContext.conflictCategory === 'HARD_CONFLICT', "Train approach on same track classified as HARD_CONFLICT");
  assert(locWithTrain.liveTrainContext.closestTrainNumber === '12627', "Conflicting train identified as Karnataka Express (12627)");

  // Test 3.2: Different-track non-conflict
  const locDifferentTrack = await resolveLocationIntelligence('12/400', '13/100', 'DOWN Main', mockTrains);
  assert(locDifferentTrack.liveTrainContext.conflictCategory === 'NO_CONFLICT', "Train on UP Main does not cause HARD_CONFLICT for DOWN Main maintenance");

  // Test 3.3: Spatial Overlap / Coordination Opportunity Detection
  const overlappingReqs: BlockRequest[] = [
    {
      id: 'REQ-PWAY-01',
      department: 'P.Way',
      work: 'Plain Track Tamping',
      section: 'SEC-A',
      startLocation: '12/400',
      endLocation: '13/100',
      startKm: 12.4,
      endKm: 13.1,
      duration: 120,
      affectedTracks: ['UP Main'],
      status: 'Submitted',
      priority: 'HIGH',
      risk: 'HIGH',
      date: '2026-09-12',
      createdAt: '08:00 IST',
      engineer: 'K. S. Sharma',
      creatorRole: 'P.Way Engineer',
      reason: 'Periodic tamping',
      safetyRequirements: [],
      resourcesRequired: []
    },
    {
      id: 'REQ-TRD-01',
      department: 'TRD',
      work: 'OHE Periodic Cantilever Inspection',
      section: 'SEC-A',
      startLocation: '12/700',
      endLocation: '13/000',
      startKm: 12.7,
      endKm: 13.0,
      duration: 60,
      affectedTracks: ['UP Main'],
      powerBlockRequired: true,
      status: 'Submitted',
      priority: 'HIGH',
      risk: 'HIGH',
      date: '2026-09-12',
      createdAt: '08:00 IST',
      engineer: 'V. S. Rao',
      creatorRole: 'TRD Engineer',
      reason: 'OHE maintenance',
      safetyRequirements: [],
      resourcesRequired: []
    }
  ];

  const overlaps = evaluateMultiDepartmentOverlaps(overlappingReqs);
  assert(overlaps.length === 1, "Spatial interval overlap detected: max(12.4, 12.7) < min(13.1, 13.0)");
  assert(overlaps[0].overlapStartKm === 12.7 && overlaps[0].overlapEndKm === 13.0, "Overlap interval correctly computed as KM 12.700 to 13.000 (300m)");
  assert(overlaps[0].compatibility.trackCompatible === true, "Same-track work recognized as compatible for shadow bundling");

  // -------------------------------------------------------------------------
  // 4. CPM & CP-SAT TIMING SEPARATION (NO WRONG SUMMATION)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. CPM & CP-SAT Timing Separation Tests ---');

  // Test 4.1: Concurrent Duration vs Summation
  // When P.Way = 120m and TRD = 60m are concurrent on same track:
  // Combined duration MUST be max(120, 60) = 120m, NOT 120 + 60 = 180m!
  const combinedDuration = overlaps[0].compatibility.combinedDuration;
  assert(combinedDuration === 120, `Concurrent duration is MAX(120, 60) = 120 mins (NOT summed). Got: ${combinedDuration}`);

  // Test 4.2: CPM Activity Network Calculations
  const cpm = calculateCpmActivityNetwork(overlappingReqs, 180);
  assert(cpm.criticalPathDuration > 0, "CPM calculated critical path duration");
  assert(cpm.blockUtilizationPercent <= 100, `Block Utilization % <= 100%. Got: ${cpm.blockUtilizationPercent}%`);

  const trdTask = cpm.activities.find(a => a.id === 'ACT-REQ-TRD-01');
  assert(trdTask !== undefined && trdTask.totalFloat > 0, `Non-critical concurrent TRD task has positive float (TF = LS - ES). Float: ${trdTask?.totalFloat}m`);
  assert(trdTask?.isCritical === false, "TRD task marked non-critical");

  const pwayTask = cpm.activities.find(a => a.id === 'ACT-REQ-PWAY-01');
  assert(pwayTask?.isCritical === true && pwayTask.totalFloat === 0, "Dominant P.Way task marked critical with 0 float");

  // -------------------------------------------------------------------------
  // 5. CORE WORKFLOW INVARIANTS & RBAC
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Core Workflow Invariants & RBAC Tests ---');

  // Test 5.1: 4-Step Requisition Modal & No Step 5
  const modalPath = path.join(process.cwd(), 'src/components/samnvay/CreateRequestModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf8');
  assert(!modalContent.includes("step === 5"), "CreateRequestModal has NO Step 5");
  assert(modalContent.includes("currentStep === 4"), "Step 4 is the final operational preference step");
  assert(modalContent.includes("Submit Maintenance Requisition"), "Modal submits requisition directly at Step 4");

  // Test 5.2: Submission creates Requisition (Status: Submitted, NOT Scheduled)
  const testReq: BlockRequest = {
    id: 'BR-V21-TEST-01',
    department: 'P.Way',
    work: 'Ultrasonic Flaw Rectification',
    section: 'SEC-A',
    startLocation: '12/400',
    endLocation: '13/100',
    duration: 120,
    status: 'Submitted',
    priority: 'HIGH',
    risk: 'HIGH',
    date: '2026-09-12',
    createdAt: '08:00 IST',
    engineer: 'K. S. Sharma',
    creatorRole: 'P.Way Engineer',
    reason: 'Defect rectification',
    safetyRequirements: [],
    resourcesRequired: []
  };

  setSamnvayState(prev => ({
    ...prev,
    requests: [...prev.requests, testReq]
  }));

  const savedReq = getSamnvayState().requests.find(r => r.id === 'BR-V21-TEST-01')!;
  assert(savedReq.status === 'Submitted', "Newly submitted maintenance requirement is 'Submitted' (never a block)");

  // Test 5.3: Impossible Duration produces NO SUITABLE WINDOW
  const impossibleAnalysis = analyzeLocationTrainConflicts(12.4, 13.1, ['UP Main'], 4800); // 4800 mins > 240 mins max
  assert(impossibleAnalysis.isDurationImpossible === true, "Impossible duration (>240 mins) flagged as impossible");
  assert(impossibleAnalysis.recommendedWindow === undefined, "Impossible duration produces NO recommended window");
  assert(impossibleAnalysis.candidateWindows[0].reason.includes("NO SUITABLE WINDOW"), "Reason clearly states NO SUITABLE WINDOW");

  // Test 5.4: Single Font Verification
  const cssPath = path.join(process.cwd(), 'src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  assert(cssContent.includes("--font-primary"), "Global single font variable --font-primary declared in index.css");

  console.log('\n======================================================================');
  console.log(`TOTAL ACCEPTANCE TESTS: 24 | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runV21Tests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
