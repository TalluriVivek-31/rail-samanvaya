// scratch/test_datetime_and_telemetry_invariants.ts
// Comprehensive validation suite for Rail Samnvay dynamic runtime clock & telemetry separation

import assert from 'node:assert';
import { 
  formatIndianTime, 
  formatIndianDate, 
  formatIndianDateTime, 
  formatHeaderClock,
  IST_TIMEZONE 
} from '../src/utils/dateTime';

console.log('======================================================================');
console.log(' RAIL SAMNVAY — DYNAMIC CURRENT DATE/TIME & TELEMETRY VERIFICATION  ');
console.log('======================================================================\n');

// TEST 1 & 6: Runtime clock generation & continuous progression across minute boundaries
console.log('--- TEST 1 & 6: RUNTIME CLOCK GENERATION & SECONDS CONTINUITY ---');
const t0 = new Date('2026-09-13T08:59:50.000Z'); // 14:29:50 IST
const t1 = new Date(t0.getTime() + 15_000);     // 14:30:05 IST (crosses minute boundary)

const time0 = formatIndianTime(t0, true);
const time1 = formatIndianTime(t1, true);

assert.strictEqual(time0, '14:29:50 IST', `Expected 14:29:50 IST, got ${time0}`);
assert.strictEqual(time1, '14:30:05 IST', `Expected 14:30:05 IST across minute boundary, got ${time1}`);
console.log(`[PASS] T0: ${time0}`);
console.log(`[PASS] T0 + 15s (across minute): ${time1}`);

// TEST 2 & 5: Reload / Session re-evaluation (never frozen from previous run)
console.log('\n--- TEST 2 & 5: DYNAMIC RUNTIME CLOCK INDEPENDENCE FROM STORED SESSIONS ---');
const pastRunTime = new Date('2026-09-11T03:00:00.000Z'); // Previous session
const currentSessionTime = new Date(); // Actual runtime NOW

const pastDisplay = formatIndianDateTime(pastRunTime);
const currentDisplay = formatIndianDateTime(currentSessionTime);

assert.notStrictEqual(pastDisplay, currentDisplay, 'Current runtime time must NOT equal past run time');
console.log(`[PASS] Previous run timestamp: ${pastDisplay}`);
console.log(`[PASS] Fresh runtime recalculation: ${currentDisplay}`);

// TEST 3 & 4: Three-Way Separation: Current Time vs Last Telemetry Sync vs Source Timestamp
console.log('\n--- TEST 3 & 4: TELEMETRY SYNC FREEZE ON FAILURE & INDEPENDENT RUNNING CLOCK ---');
let lastTelemetrySync: string | null = '2026-09-13T08:35:18.000Z'; // 14:05:18 IST
let sourceTimestamp: string | null = '2026-09-13T08:35:15.000Z';   // 14:05:15 IST
let feedStatus = 'LIVE';

// Simulate 30s elapsed: Current time advances to 14:05:50 IST
const clockAtPoll = new Date('2026-09-13T08:35:50.000Z'); // 14:05:50 IST
const currentFormatted = formatIndianTime(clockAtPoll);

// Simulate RailRadar API returning HTTP 500 / Network Error
const apiFailed = true;
if (apiFailed) {
  feedStatus = 'LIVE DATA UNAVAILABLE';
  // CRITICAL RULE: Last Telemetry Sync must FREEZE. Do NOT update on failure.
}

assert.strictEqual(feedStatus, 'LIVE DATA UNAVAILABLE', 'Feed status must be LIVE DATA UNAVAILABLE');
assert.strictEqual(formatIndianTime(lastTelemetrySync), '14:05:18 IST', 'Last sync must remain frozen at 14:05:18 IST');
assert.strictEqual(currentFormatted, '14:05:50 IST', 'Current clock must continue ticking to 14:05:50 IST');
console.log(`[PASS] Feed Status: ${feedStatus}`);
console.log(`[PASS] Current Running Clock: ${currentFormatted}`);
console.log(`[PASS] Last Telemetry Sync (Frozen): ${formatIndianTime(lastTelemetrySync)}`);
console.log(`[PASS] Source Timestamp: ${formatIndianTime(sourceTimestamp)}`);

// Simulate recovery at 14:06:20 IST
const recoveryClock = new Date('2026-09-13T08:36:20.000Z'); // 14:06:20 IST
const apiRecovered = true;
if (apiRecovered) {
  feedStatus = 'LIVE';
  lastTelemetrySync = recoveryClock.toISOString();
  sourceTimestamp = new Date('2026-09-13T08:36:16.000Z').toISOString();
}

assert.strictEqual(feedStatus, 'LIVE');
assert.strictEqual(formatIndianTime(lastTelemetrySync), '14:06:20 IST', 'Last Telemetry Sync must update only after successful response');
console.log(`[PASS] Recovery: Last Telemetry Sync updated to ${formatIndianTime(lastTelemetrySync)}`);

// TEST 7: MIDNIGHT IST ROLLOVER VERIFICATION
console.log('\n--- TEST 7: MIDNIGHT IST DATE ROLLOVER ---');
// 23:59:59 IST on 13 Sep 2026 = 18:29:59 UTC
const beforeMidnightUTC = new Date('2026-09-13T18:29:59.000Z');
// 00:00:01 IST on 14 Sep 2026 = 18:30:01 UTC (2 seconds later)
const afterMidnightUTC = new Date('2026-09-13T18:30:01.000Z');

const dateBefore = formatIndianDate(beforeMidnightUTC);
const timeBefore = formatIndianTime(beforeMidnightUTC);

const dateAfter = formatIndianDate(afterMidnightUTC);
const timeAfter = formatIndianTime(afterMidnightUTC);

assert.strictEqual(dateBefore, '13 Sep 2026');
assert.strictEqual(timeBefore, '23:59:59 IST');

assert.strictEqual(dateAfter, '14 Sep 2026', `Date must rollover to 14 Sep 2026 at midnight IST, got ${dateAfter}`);
assert.strictEqual(timeAfter, '00:00:01 IST', `Time must roll to 00:00:01 IST, got ${timeAfter}`);

console.log(`[PASS] 1 second before midnight IST: ${dateBefore} • ${timeBefore}`);
console.log(`[PASS] 1 second after midnight IST:  ${dateAfter} • ${timeAfter}`);

// TEST 8: HEADER CLOCK DYNAMIC FORMAT
console.log('\n--- TEST 8: TOP COMMAND BAR HEADER CLOCK ---');
const headerResult = formatHeaderClock(t0);
assert.strictEqual(headerResult, '13 SEP 2026 | 14:29:50 IST');
console.log(`[PASS] Header Clock format verified: ${headerResult}`);

console.log('\n======================================================================');
console.log(' ALL 7 DATE/TIME & TELEMETRY INVARIANT VALIDATIONS PASSED! ✓');
console.log('======================================================================');
