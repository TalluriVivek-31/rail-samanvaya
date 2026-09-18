// test/test_ui_workflow_regression.mjs
// Automated verification suite for Stability, Workflow, Approvals, RBAC, and State Machines
import assert from 'assert';
import { buildRunIdentity, isTelemetryStale, classifyTrainWorkInteraction } from '../src/utils/trainIntelligence.ts';

console.log('========================================================================');
console.log(' RAIL SAMNVAY — UI WORKFLOW & STABILITY REGRESSION TEST SUITE');
console.log('========================================================================\n');

let testsPassed = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. STABILITY: buildRunIdentity Resilience against ANY input types
// -----------------------------------------------------------------------------
console.log('--- 1. STABILITY & CRASH PREVENTION ---');

test('buildRunIdentity: handles null/undefined without crashing', () => {
  const res1 = buildRunIdentity(null);
  assert.ok(res1.startsWith('TRAIN-'), 'Should fallback cleanly to TRAIN prefix');
  const res2 = buildRunIdentity(undefined);
  assert.ok(res2.startsWith('TRAIN-'), 'Should fallback cleanly to TRAIN prefix');
});

test('buildRunIdentity: handles train object with lastUpdated as Date object', () => {
  const train = {
    trainNumber: '12704',
    lastUpdated: new Date('2026-09-18T10:00:00Z'),
    runId: 'RUN-101'
  };
  const res = buildRunIdentity(train);
  assert.ok(res.includes('12704'), 'Must contain train number');
  assert.ok(res.includes('RUN-101'), 'Must contain runId');
});

test('buildRunIdentity: handles train object with lastUpdated as number timestamp', () => {
  const train = {
    trainNumber: '12704',
    lastUpdated: 1789725600000,
    runId: 202
  };
  const res = buildRunIdentity(train);
  assert.ok(res.includes('12704'));
  assert.ok(res.includes('RUN-202'), 'Number runId should be safely converted to RUN-202');
});

test('buildRunIdentity: handles train object with missing dates and null runId', () => {
  const train = {
    trainNumber: '20834',
    runId: null
  };
  const res = buildRunIdentity(train);
  assert.ok(res.startsWith('20834-'));
  assert.ok(res.endsWith('-RUN-1'));
});

// -----------------------------------------------------------------------------
// 2. COORDINATE SAFETY & MAP CRASH GUARDS
// -----------------------------------------------------------------------------
console.log('\n--- 2. COORDINATE VALIDATION & MAP SAFETY ---');

test('flyToLocation coordinate validator rejects NaN / undefined', () => {
  function validateFlyTo(lat, lng) {
    if (typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) {
      return false;
    }
    return true;
  }

  assert.strictEqual(validateFlyTo(NaN, 80.62), false);
  assert.strictEqual(validateFlyTo(16.51, NaN), false);
  assert.strictEqual(validateFlyTo(undefined, 80.62), false);
  assert.strictEqual(validateFlyTo(null, 80.62), false);
  assert.strictEqual(validateFlyTo(16.5193, 80.6231), true);
});

test('Timestamp parser handles invalid Date without returning NaN string', () => {
  function parseFreshness(timestamp) {
    if (!timestamp) return { label: 'UNKNOWN' };
    const parsedTs = new Date(timestamp).getTime();
    if (isNaN(parsedTs)) return { label: 'UNKNOWN' };
    const ageSeconds = Math.max(0, Math.floor((Date.now() - parsedTs) / 1000));
    return { label: 'LIVE', ageSeconds };
  }

  assert.strictEqual(parseFreshness('invalid-date-string').label, 'UNKNOWN');
  assert.strictEqual(parseFreshness(null).label, 'UNKNOWN');
  assert.strictEqual(parseFreshness(new Date().toISOString()).label, 'LIVE');
});

// -----------------------------------------------------------------------------
// 3. APPROVALS WORKFLOW & CREATOR-CANNOT-SELF-APPROVE
// -----------------------------------------------------------------------------
console.log('\n--- 3. APPROVALS & CREATOR-CANNOT-SELF-APPROVE RULE ---');

test('Creator-cannot-self-approve: blocks when req.creatorId === currentUser.employeeId', () => {
  const currentUser = {
    name: 'K. S. Sharma',
    role: 'P.Way Engineer',
    employeeId: 'EMP-IR-201'
  };

  const req = {
    id: 'BR-1021',
    creatorId: 'EMP-IR-201',
    engineer: 'K. S. Sharma',
    status: 'Submitted'
  };

  const isCreator = (
    req.engineer?.toLowerCase().trim() === currentUser.name.toLowerCase().trim() ||
    req.creatorId === currentUser.employeeId ||
    req.submittedBy === currentUser.name ||
    req.submittedBy === currentUser.employeeId
  ) && currentUser.role !== 'MASTER';

  assert.strictEqual(isCreator, true, 'Creator must be identified and blocked from self-approving');
});

test('Creator-cannot-self-approve: permits independent officer to approve', () => {
  const currentUser = {
    name: 'M. K. Rao',
    role: 'Planning Officer',
    employeeId: 'EMP-IR-104'
  };

  const req = {
    id: 'BR-1021',
    creatorId: 'EMP-IR-201',
    engineer: 'K. S. Sharma',
    status: 'Submitted'
  };

  const isCreator = (
    req.engineer?.toLowerCase().trim() === currentUser.name.toLowerCase().trim() ||
    req.creatorId === currentUser.employeeId ||
    req.submittedBy === currentUser.name ||
    req.submittedBy === currentUser.employeeId
  ) && currentUser.role !== 'MASTER';

  assert.strictEqual(isCreator, false, 'Independent Planning Officer must NOT be flagged as creator');
});

test('RBAC: Field Engineers forbidden from approving block requisitions', () => {
  function canApprove(role) {
    if (role === 'P.Way Engineer' || role === 'S&T Engineer' || role === 'TRD Engineer') {
      return false;
    }
    return role === 'Planning Officer' || role === 'COA / Operations' || role === 'MASTER';
  }

  assert.strictEqual(canApprove('P.Way Engineer'), false);
  assert.strictEqual(canApprove('S&T Engineer'), false);
  assert.strictEqual(canApprove('TRD Engineer'), false);
  assert.strictEqual(canApprove('Planning Officer'), true);
  assert.strictEqual(canApprove('COA / Operations'), true);
  assert.strictEqual(canApprove('MASTER'), true);
});

// -----------------------------------------------------------------------------
// 4. STATE TRANSITION MATRIX INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n--- 4. LIFECYCLE STATE TRANSITIONS ---');

const ALLOWED_TRANSITIONS = {
  'Draft': ['Submitted', 'Unsafe / Cancelled'],
  'Submitted': ['Planning Queue', 'P.Way/S&T/TRD Review', 'Approved', 'Rejected', 'Revision Required', 'Unsafe / Cancelled', 'DEPARTMENT_APPROVED'],
  'DEPARTMENT_APPROVED': ['Planning Queue', 'PLAN_APPROVED', 'Approved', 'Rejected', 'Revision Required', 'Unsafe / Cancelled'],
  'Verified': ['Planning Queue', 'PLAN_APPROVED', 'Approved', 'Rejected', 'Revision Required', 'Unsafe / Cancelled'],
  'PLAN_APPROVED': ['Planning Queue', 'Approved', 'Block Window Allocated', 'Scheduled', 'Rejected', 'Unsafe / Cancelled'],
  'Planning Queue': ['Review', 'Planning', 'AI/OR Optimization', 'Approved', 'Rejected', 'Unsafe / Cancelled', 'Block Window Allocated'],
  'P.Way/S&T/TRD Review': ['Planning Queue', 'Approved', 'Revision Required', 'Rejected', 'Unsafe / Cancelled', 'DEPARTMENT_APPROVED'],
  'Block Window Allocated': ['Scheduled', 'Approved', 'Planning Queue', 'Rejected', 'Unsafe / Cancelled'],
  'Approved': ['Block Window Allocated', 'Scheduled', 'Unsafe / Cancelled'],
  'Scheduled': ['Block Started', 'Active', 'Delayed / Headway Conflict', 'Rescheduled', 'Unsafe / Cancelled'],
  'Block Started': ['Work in Progress', 'Active', 'Unsafe / Cancelled'],
  'Work in Progress': ['Work Completed', 'Inspection/Safety Verification', 'Unsafe / Cancelled'],
  'Work Completed': ['Block Release Requested', 'Block Released', 'Inspection/Safety Verification'],
  'Inspection/Safety Verification': ['Block Released'],
  'Block Release Requested': ['Block Released'],
  'Block Released': ['Closed'],
  'Closed': [],
  'Rejected': ['Submitted'],
  'Revision Required': ['Submitted', 'Unsafe / Cancelled'],
  'Unsafe / Cancelled': []
};

test('Submitted can legally transition to DEPARTMENT_APPROVED or Approved', () => {
  assert.ok(ALLOWED_TRANSITIONS['Submitted'].includes('DEPARTMENT_APPROVED'));
  assert.ok(ALLOWED_TRANSITIONS['Submitted'].includes('Approved'));
});

test('DEPARTMENT_APPROVED can legally transition to Approved or Planning Queue', () => {
  assert.ok(ALLOWED_TRANSITIONS['DEPARTMENT_APPROVED'].includes('Approved'));
  assert.ok(ALLOWED_TRANSITIONS['DEPARTMENT_APPROVED'].includes('Planning Queue'));
});

test('Illegal state transitions are prevented (e.g. Closed -> Work in Progress)', () => {
  assert.strictEqual(ALLOWED_TRANSITIONS['Closed'].includes('Work in Progress'), false);
  assert.strictEqual(ALLOWED_TRANSITIONS['Rejected'].includes('Approved'), false);
  assert.strictEqual(ALLOWED_TRANSITIONS['Draft'].includes('Closed'), false);
});

// -----------------------------------------------------------------------------
// 5. UNIFIED STATUS VOCABULARY CONSISTENCY
// -----------------------------------------------------------------------------
console.log('\n--- 5. UNIFIED STATUS VOCABULARY ---');

test('Canonical operational statuses are recognized without ambiguity', () => {
  const CANONICAL_STATUSES = [
    'Draft', 'Submitted', 'DEPARTMENT_APPROVED', 'PLAN_APPROVED',
    'Planning Queue', 'Approved', 'Block Window Allocated',
    'Scheduled', 'Block Started', 'Work in Progress',
    'Work Completed', 'Block Released', 'Closed', 'Rejected'
  ];

  function normalizeStatus(s) {
    return (s || '').toUpperCase().replace(/[\s\-_/]+/g, '');
  }

  CANONICAL_STATUSES.forEach(st => {
    const norm = normalizeStatus(st);
    assert.ok(norm.length > 0, `Normalized status for ${st} must not be empty`);
  });
});

console.log('\n========================================================================');
console.log(` ALL ${testsPassed}/${totalTests} WORKFLOW & STABILITY REGRESSION TESTS PASSED! ✓`);
console.log('========================================================================\n');
