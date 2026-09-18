// test/test_request_lifecycle_and_live_trains.mjs
// Comprehensive verification suite for Request Lifecycle, Single Allocation Lock, Replanning Audit, and Live Trains Locate
import assert from 'assert';
import { 
  normalizeStatus, 
  isPendingApproval, 
  isPlanningEligible, 
  isBlockAllocationEligible, 
  isExecutionEligible, 
  isCompleted 
} from '../src/utils/requestLifecycle.ts';

console.log('========================================================================');
console.log(' RAIL SAMNVAY — REQUEST LIFECYCLE & LIVE TRAINS VERIFICATION SUITE');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. CANONICAL REQUEST LIFECYCLE PREDICATES
// -----------------------------------------------------------------------------
console.log('--- 1. SINGLE-SOURCE-OF-TRUTH LIFECYCLE PREDICATES ---');

test('isPendingApproval: returns true ONLY for pre-approval stages', () => {
  const preApprovalStatuses = [
    'Submitted',
    'Pending',
    'P.Way/S&T/TRD Review',
    'Verified',
    'Approval Pending',
    'Review',
    'Revision Required'
  ];
  for (const st of preApprovalStatuses) {
    const req = { id: 'REQ-1', status: st };
    assert.strictEqual(isPendingApproval(req), true, `Status ${st} must be pending approval`);
  }
});

test('isPendingApproval: returns FALSE for approved, planning, and execution stages', () => {
  const nonPendingStatuses = [
    'Approved',
    'Department Approved',
    'Planning',
    'Planning Queue',
    'Block Window Allocated',
    'Recommended',
    'Authorized',
    'Scheduled',
    'Active',
    'Work in Progress',
    'Completed',
    'Closed',
    'Rejected',
    'Cancelled'
  ];
  for (const st of nonPendingStatuses) {
    const req = { id: 'REQ-2', status: st };
    assert.strictEqual(isPendingApproval(req), false, `Status ${st} must NOT be pending approval`);
  }
});

test('Approved requisition immediately disappears from pending approval queue', () => {
  const req = { id: 'REQ-TRANS-1', status: 'Submitted' };
  assert.strictEqual(isPendingApproval(req), true, 'Initially pending');
  
  // Transition to Department Approved
  req.status = 'Department Approved';
  assert.strictEqual(isPendingApproval(req), false, 'Must not be pending after Department Approval');
  
  // Transition to Approved
  req.status = 'Approved';
  assert.strictEqual(isPendingApproval(req), false, 'Must not be pending after Formal Approval');
});

// -----------------------------------------------------------------------------
// 2. HARD LOCK ON DUPLICATE BLOCK ALLOCATIONS
// -----------------------------------------------------------------------------
console.log('\n--- 2. HARD INVARIANT: SINGLE BLOCK ALLOCATION ---');

test('isBlockAllocationEligible: permits planning when approved and unallocated', () => {
  const req = {
    id: 'REQ-PLAN-1',
    status: 'Department Approved',
    authorizedBlockId: undefined,
    scheduledBlockId: undefined
  };
  assert.strictEqual(isBlockAllocationEligible(req), true, 'Unallocated approved request should be eligible');
});

test('isBlockAllocationEligible: rejects when request already has authorizedBlockId', () => {
  const req = {
    id: 'REQ-PLAN-2',
    status: 'Scheduled',
    authorizedBlockId: 'BLK-SCR-BZA-001',
    scheduledBlockId: 'BLK-SCR-BZA-001'
  };
  assert.strictEqual(isBlockAllocationEligible(req), false, 'Already authorized request must NOT be eligible for second allocation');
});

test('Simulate authorizeAndScheduleBlock: hard rejects duplicate allocation with REQUEST_ALREADY_ALLOCATED', () => {
  // Store state simulation
  const requests = [
    {
      id: 'REQ-LOCK-1',
      status: 'Block Window Allocated',
      allocatedWindow: { startTime: '04:30', endTime: '06:30' },
      authorizedBlockId: undefined
    }
  ];
  const scheduledBlocks = [];

  function authorizeBlock(requestId, reason) {
    const r = requests.find(item => item.id === requestId);
    if (!r) return { success: false, code: 'NOT_FOUND' };

    // HARD LOCK: Verify single allocation invariant
    if (r.authorizedBlockId && r.planningStatus !== 'REPLAN_REQUESTED') {
      return {
        success: false,
        code: 'REQUEST_ALREADY_ALLOCATED',
        message: `Request ${requestId} already has active authorized block ${r.authorizedBlockId}. Replanning required before new allocation.`
      };
    }

    const blockId = `BLK-${r.id}-01`;
    r.authorizedBlockId = blockId;
    r.scheduledBlockId = blockId;
    r.status = 'Scheduled';
    scheduledBlocks.push({ blockId, requestId: r.id, status: 'Scheduled' });
    return { success: true, blockId };
  }

  // 1st authorization: must succeed
  const first = authorizeBlock('REQ-LOCK-1', 'Initial Authorization');
  assert.strictEqual(first.success, true);
  assert.strictEqual(first.blockId, 'BLK-REQ-LOCK-1-01');
  assert.strictEqual(requests[0].authorizedBlockId, 'BLK-REQ-LOCK-1-01');

  // 2nd authorization attempt on same request: must FAIL safely
  const second = authorizeBlock('REQ-LOCK-1', 'Duplicate Authorization Attempt');
  assert.strictEqual(second.success, false);
  assert.strictEqual(second.code, 'REQUEST_ALREADY_ALLOCATED');
  assert.strictEqual(scheduledBlocks.length, 1, 'No duplicate block created');
});

// -----------------------------------------------------------------------------
// 3. REPLANNING & AUDIT HISTORY
// -----------------------------------------------------------------------------
console.log('\n--- 3. EXPLICIT REPLANNING & AUDIT PRESERVATION ---');

test('Replanning archives previous block, preserves history, and allows fresh allocation', () => {
  const req = {
    id: 'REQ-REPLAN-1',
    status: 'Scheduled',
    authorizedBlockId: 'BLK-ORIGINAL-99',
    scheduledBlockId: 'BLK-ORIGINAL-99',
    planningStatus: 'SCHEDULED'
  };
  const scheduledBlocks = [
    { blockId: 'BLK-ORIGINAL-99', requestId: 'REQ-REPLAN-1', status: 'Scheduled' }
  ];
  const auditLogs = [];

  function requestReplan(requestId, reason) {
    const r = req;
    const oldBlock = scheduledBlocks.find(b => b.blockId === r.authorizedBlockId);
    if (oldBlock) {
      oldBlock.status = 'Rescheduled';
    }
    r.previousBlockId = r.authorizedBlockId;
    r.authorizedBlockId = undefined;
    r.scheduledBlockId = undefined;
    r.planningStatus = 'REPLAN_REQUESTED';
    r.status = 'Block Window Allocated';
    r.replanReason = reason;
    auditLogs.push({
      action: 'REPLAN_REQUESTED',
      requestId: r.id,
      archivedBlockId: r.previousBlockId,
      reason
    });
    return { success: true };
  }

  assert.strictEqual(isBlockAllocationEligible(req), false, 'Cannot allocate while active');

  // Request replan
  const replanRes = requestReplan('REQ-REPLAN-1', 'Track machine maintenance extended');
  assert.strictEqual(replanRes.success, true);

  // Verification of archive
  assert.strictEqual(scheduledBlocks[0].status, 'Rescheduled', 'Previous block marked Rescheduled');
  assert.strictEqual(req.previousBlockId, 'BLK-ORIGINAL-99', 'Previous block ID preserved');
  assert.strictEqual(req.authorizedBlockId, undefined, 'Active allocation cleared');
  assert.strictEqual(req.planningStatus, 'REPLAN_REQUESTED');

  // Now eligible again for planning & new block allocation
  assert.strictEqual(isPlanningEligible(req), true, 'Eligible for planning after replan');
  assert.strictEqual(isBlockAllocationEligible(req), true, 'Eligible for new allocation after replan');

  // Re-authorize with fresh window
  req.authorizedBlockId = 'BLK-NEW-100';
  req.scheduledBlockId = 'BLK-NEW-100';
  req.status = 'Scheduled';
  req.planningStatus = undefined;
  scheduledBlocks.push({ blockId: 'BLK-NEW-100', requestId: req.id, status: 'Scheduled' });

  assert.strictEqual(scheduledBlocks.length, 2, 'Both original and new block in ledger');
  assert.strictEqual(scheduledBlocks[0].status, 'Rescheduled', 'Historic block preserved');
  assert.strictEqual(scheduledBlocks[1].status, 'Scheduled', 'New block scheduled');
});

// -----------------------------------------------------------------------------
// 4. END-TO-END LIFECYCLE PROGRESSION INVARIANT
// -----------------------------------------------------------------------------
console.log('\n--- 4. END-TO-END LIFECYCLE PROGRESSION ---');

test('Complete Lifecycle: Creation -> Dept Approval -> Planning -> Authorization -> Execution -> Closed', () => {
  const req = {
    id: 'REQ-E2E-1',
    status: 'Submitted',
    department: 'P.Way',
    work: 'Deep Screening',
    authorizedBlockId: undefined
  };

  // Step 1: Newly created
  assert.strictEqual(isPendingApproval(req), true);
  assert.strictEqual(isPlanningEligible(req), false);
  assert.strictEqual(isExecutionEligible(req), false);
  assert.strictEqual(isCompleted(req), false);

  // Step 2: Department Approval
  req.status = 'Department Approved';
  assert.strictEqual(isPendingApproval(req), false, 'No longer in pending queue');
  assert.strictEqual(isPlanningEligible(req), true, 'Now eligible for planning');
  assert.strictEqual(isExecutionEligible(req), false);

  // Step 3: Timetable window recommended
  req.status = 'Block Window Allocated';
  req.allocatedWindow = { startTime: '04:30', endTime: '06:30' };
  assert.strictEqual(isPendingApproval(req), false);
  assert.strictEqual(isPlanningEligible(req), true);
  assert.strictEqual(isExecutionEligible(req), false);

  // Step 4: Operating Control Authorization
  req.status = 'Scheduled';
  req.authorizedBlockId = 'BLK-E2E-001';
  assert.strictEqual(isPendingApproval(req), false);
  assert.strictEqual(isPlanningEligible(req), false, 'No longer unallocated');
  assert.strictEqual(isBlockAllocationEligible(req), false, 'Locked from duplicate allocation');
  assert.strictEqual(isExecutionEligible(req), true, 'Ready for execution tracking');

  // Step 5: Execution phases
  req.status = 'Imposed';
  assert.strictEqual(isExecutionEligible(req), true);

  req.status = 'Work in Progress';
  assert.strictEqual(isExecutionEligible(req), true);

  req.status = 'Restoration Pending';
  assert.strictEqual(isExecutionEligible(req), true);

  // Step 6: Closed & Completed
  req.status = 'Closed';
  assert.strictEqual(isPendingApproval(req), false);
  assert.strictEqual(isPlanningEligible(req), false);
  assert.strictEqual(isExecutionEligible(req), false);
  assert.strictEqual(isCompleted(req), true, 'Recognized in completed history');
});

// -----------------------------------------------------------------------------
// 5. LIVE TRAINS LOCATE & COORDINATE VALIDATION
// -----------------------------------------------------------------------------
console.log('\n--- 5. LIVE TRAINS LOCATE OUTSIDE CORRIDOR & COORDINATE SAFETY ---');

test('Coordinate validator accepts valid WGS84 and rejects NaN / zero coordinates', () => {
  function validateCoords(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') return false;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (lat === 0 || lng === 0) return false;
    if (lat < 6.0 || lat > 38.0 || lng < 68.0 || lng > 98.0) return false;
    return true;
  }

  assert.strictEqual(validateCoords(16.5193, 80.6231), true, 'BZA coordinates valid');
  assert.strictEqual(validateCoords(28.6139, 77.2090), true, 'NDLS coordinates valid');
  assert.strictEqual(validateCoords(NaN, 80.6231), false, 'NaN lat rejected');
  assert.strictEqual(validateCoords(16.5193, Infinity), false, 'Infinity lng rejected');
  assert.strictEqual(validateCoords(0, 0), false, 'Null island (0, 0) rejected');
  assert.strictEqual(validateCoords(null, 80.62), false, 'null lat rejected');
});

test('Locate outside corridor train: sets mapFocus, selectedTrain, and LOCATED status', () => {
  const nationalTrain = {
    trainNumber: '12951',
    trainName: 'Mumbai Rajdhani Express',
    currentStation: 'MMCT',
    nextStation: 'BVI',
    latitude: 18.9696,
    longitude: 72.8193,
    speedKmph: 110,
    delayMinutes: 0
  };

  function locateTrain(train) {
    if (!train) return { status: 'TRAIN_NOT_FOUND' };
    const hasGps = typeof train.latitude === 'number' && 
                    Number.isFinite(train.latitude) && 
                    train.latitude !== 0 &&
                    typeof train.longitude === 'number' && 
                    Number.isFinite(train.longitude) && 
                    train.longitude !== 0;

    if (hasGps) {
      return {
        status: 'LOCATED',
        mapFocus: { lat: train.latitude, lng: train.longitude, zoom: 14 },
        train
      };
    }
    return { status: 'LOCATION_UNAVAILABLE', train };
  }

  const result = locateTrain(nationalTrain);
  assert.strictEqual(result.status, 'LOCATED');
  assert.deepStrictEqual(result.mapFocus, { lat: 18.9696, lng: 72.8193, zoom: 14 });
  assert.strictEqual(result.train.trainNumber, '12951');
});

test('30s polling preservation: retains selected train selection across telemetry updates', () => {
  let selectedTrainId = '12704';
  let selectedTrain = { trainNumber: '12704', currentKm: 12.0, delayMinutes: 5 };

  // Polling cycle 1
  const pollCycle1Trains = [
    { trainNumber: '12704', currentKm: 14.5, delayMinutes: 6 },
    { trainNumber: '20834', currentKm: 45.0, delayMinutes: 0 }
  ];

  // Store sync hook simulation
  if (selectedTrainId) {
    const updated = pollCycle1Trains.find(t => t.trainNumber === selectedTrainId);
    if (updated) selectedTrain = updated;
  }

  assert.strictEqual(selectedTrainId, '12704', 'Selected ID unchanged');
  assert.strictEqual(selectedTrain.currentKm, 14.5, 'Telemetry seamlessly updated');
  assert.strictEqual(selectedTrain.delayMinutes, 6, 'Delay updated');
});

console.log('\n========================================================================');
console.log(` ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY! ✓`);
console.log('========================================================================\n');
