<USER_REQUEST>
# RAIL SAMNVAY — RAILRADAR CURRENT RUN / JOURNEY IDENTITY FIX

## CRITICAL ISSUE

The delay formatting pipeline has already been fixed and tested.

However, a more serious problem remains.

When searching:

**12627 Karnataka Express**

the UI currently shows:

```text
12627 Karnataka Express
UP Line
LIVE RAILRADAR
RUNNING

Originated: 2026-09-12
Telemetry: 20:28:33 IST

Current: Surgaon Banjari (SGBJ)
...
```

The application is repeatedly returning an old/incorrect running instance even after previous fixes.

Do NOT treat this as a delay-formatting problem.

The primary problem to investigate is:

> **TRAIN NUMBER ≠ CURRENT RUN INSTANCE**

A successful train-number identity check does NOT prove that the returned journey is the correct current/latest running instance.

---

# 1. DO A COMPLETE TRACE FIRST

Before modifying anything, trace:

```text
User search
↓
LiveTrainsPage
↓
useRailRadar
↓
railRadarClient
↓
Express route
↓
railRadarService
↓
cache
↓
RailRadar API
↓
raw response
↓
normalization
↓
store
↓
UI
```

For train `12627`, log the complete relevant identity information from the RAW upstream response.

Do not log credentials or API keys.

Inspect fields such as:

```text
trainNumber
trainName
origin
destination
originDate
journeyDate
runDate
startDate
departureDate
status
telemetry timestamp
lastUpdated
currentLocation
current station
```

Also inspect whether RailRadar provides:

```text
run ID
journey ID
instance ID
train UID
service date
origin date
```

Do not assume field names.

Use the actual upstream schema.

---

# 2. THE CURRENT IDENTITY CHECK IS INSUFFICIENT

The existing check:

```text
requested train number == returned train number
```

must remain.

But add a second layer:

```text
TRAIN NUMBER IDENTITY
+
RUN/JOURNEY IDENTITY
+
FRESHNESS
```

The system must distinguish:

```text
12627 on 2026-09-12
```

from:

```text
12627 on 2026-09-13
```

They are not the same running instance.

---

# 3. DO NOT BLINDLY USE TODAY'S DATE

IMPORTANT:

Do NOT simply force:

```text
runDate = systemDate
```

because that can be wrong for overnight trains.

The system must understand the actual railway journey instance.

For example:

```text
Train originates on:
2026-09-13

Current telemetry:
2026-09-14 01:20
```

This may still be the same train journey.

Therefore:

**CURRENT DATE ≠ AUTOMATIC TRAIN RUN DATE**

Resolve the run using the upstream API's actual journey/run metadata.

---

# 4. DETERMINE THE CORRECT RUN USING RAILRADAR DATA

Find out how RailRadar itself identifies the current running instance.

Use the upstream API documentation/schema and actual raw responses.

Possible cases:

### CASE A

RailRadar provides an explicit run/journey ID.

Use it.

### CASE B

RailRadar provides an explicit origin/service date.

Use it.

### CASE C

RailRadar provides multiple runs/instances.

Select the current/latest valid running instance according to RailRadar's own semantics.

### CASE D

RailRadar only provides train-number-level information.

Do NOT invent a run identity.

Instead:

```text
Current run identity unavailable
```

and clearly mark the limitation.

Never fabricate a journey date.

---

# 5. SEARCH BEHAVIOR

When the user searches:

```text
12627
```

the application must request the current/latest available running instance from RailRadar.

Do not:

* reuse a previous fixed date
* reuse yesterday's run
* reuse the last train object
* use a hardcoded origin date
* use the application startup date
* use stale localStorage data
* use stale React state
* use an old cached run
* select the first historical result blindly

---

# 6. CACHE MUST INCLUDE RUN IDENTITY

The current cache key:

```text
train:12627
```

may be insufficient.

If RailRadar exposes run/service date/instance ID, include it in the cache identity.

For example conceptually:

```text
train:12627:<run-instance>
```

or

```text
train:12627:<service-date>
```

ONLY if that service-date/run identifier is actually supplied by RailRadar.

Do not invent cache dimensions.

If the current run cannot be identified safely, prefer a fresh upstream request rather than displaying a potentially wrong cached run.

---

# 7. SEARCH RESET

When searching for a new train:

```text
setTrain(null)
setError(null)
```

must happen immediately.

This part of the existing fix should remain.

The UI must never temporarily show:

```text
Previous train
```

while the new train is being resolved.

---

# 8. RESPONSE VALIDATION

Before a train response is accepted by the application, validate:

```text
Requested train number
        ↓
Returned train number
        ↓
Run/journey identity
        ↓
Telemetry timestamp
        ↓
Current location
        ↓
Train status
        ↓
Freshness
```

If the run identity cannot be verified:

```text
Train run identity unavailable
```

is safer than displaying potentially incorrect telemetry.

---

# 9. IMPORTANT: DO NOT CONFUSE TELEMETRY FRESHNESS WITH RUN CORRECTNESS

This is a critical bug class.

Example:

```text
Telemetry timestamp:
20:28:33

Timestamp age:
10 seconds
```

That means the telemetry is fresh.

It does NOT prove that:

```text
Originated:
2026-09-12
```

is the correct running instance.

Therefore maintain separate validation:

```text
Freshness = valid
Run identity = valid/invalid
```

Both must be checked.

---

# 10. TEST 12627 SPECIFICALLY

Run the application and search:

```text
12627
```

Record the RAW RailRadar response.

Do not only record the normalized object.

The final test must show:

```text
Requested:
12627

Raw returned train:
12627

Raw run/service identity:
<actual value>

Raw origin/run date:
<actual value>

Raw telemetry timestamp:
<actual value>

Resolved current run:
<actual value>

Normalized run identity:
<actual value>

UI origin date:
<actual value>
```

Every date must be traceable to upstream data.

---

# 11. TEST MULTIPLE TRAINS

Do not fix 12627 with a train-specific condition.

Test at least:

```text
12627
12723
12615
53344
```

The code must contain ZERO logic such as:

```typescript
if (trainNumber === "12627") {
   ...
}
```

No train-specific date patches.

---

# 12. TEST DATE TRANSITIONS

Test scenarios around midnight.

Example:

```text
23:55
00:05
01:00
04:00
```

Verify that an overnight train does not incorrectly switch to a new journey merely because the system date changed.

The journey instance must come from railway/run semantics, not a naive date comparison.

---

# 13. TEST HISTORICAL RUN PROTECTION

If RailRadar returns:

```text
12627
Originated: 2026-09-12
```

while the correct current running instance is:

```text
12627
Originated: 2026-09-13
```

the application must reject the stale instance if RailRadar provides enough information to identify the current run.

Do NOT silently display the older run.

---

# 14. NO FAKE FALLBACK

Remove any fallback that creates a plausible-looking train object.

Never do:

```text
If RailRadar fails
→ use demo train
```

for a LIVE search.

LIVE mode must follow:

```text
Valid upstream data
→ display

Invalid/unavailable upstream data
→ Train data unavailable
```

Demo data belongs only to explicit DEMO mode.

---

# 15. DO NOT FIX THIS IN THE UI

Do not change:

```text
Originated: ...
```

using frontend date manipulation.

The UI should display the already validated canonical value from the backend.

Correct architecture:

```text
RailRadar raw response
        ↓
Backend run resolution
        ↓
Canonical LiveTrainPosition
        ↓
Client
        ↓
UI
```

---

# 16. CANONICAL DATA MODEL

Extend the internal train model if necessary.

Use fields based on actual RailRadar data, for example:

```typescript
trainNumber
trainName
runId
journeyId
serviceDate
originDate
telemetryTimestamp
currentLocation
status
delaySeconds
```

Only add fields that can be populated reliably.

Do NOT create fake IDs.

If RailRadar has no run ID, leave it null.

---

# 17. VERY IMPORTANT: DISTINGUISH THESE THREE DATES

The system must not confuse:

### A. SYSTEM DATE

```text
Current application date/time
```

### B. SERVICE / ORIGIN DATE

```text
Date this train journey started
```

### C. TELEMETRY TIMESTAMP

```text
When RailRadar reported this observation
```

These are different concepts.

Example:

```text
System:
2026-09-13 01:30

Origin Date:
2026-09-12

Telemetry:
2026-09-13 01:28
```

This can be perfectly valid for an overnight train.

---

# 18. FINAL ACCEPTANCE CRITERIA

The fix is accepted only if:

### Test 1

Search:

```text
12627
```

and the application resolves the correct current/latest RailRadar running instance.

### Test 2

Search:

```text
12627
→ 12723
→ 12615
→ 53344
```

No previous train data appears.

### Test 3

Repeat the same search several times.

The resolved run identity remains correct.

### Test 4

Refresh the page.

The application still resolves the correct current run.

### Test 5

Wait for another polling cycle.

Telemetry updates without changing to an unrelated historical run.

### Test 6

Simulate RailRadar returning an old/stale run.

The application rejects it or clearly marks it unavailable.

### Test 7

Simulate missing run identity.

The application does NOT invent a date or run ID.

### Test 8

Cross midnight.

Overnight trains remain attached to the correct journey instance.

---

# 19. FINAL REPORT REQUIRED

After implementation, report:

```text
ROOT CAUSE:
<exact cause>

RAILRADAR FIELD RESPONSIBLE:
<actual field>

RUN IDENTIFIER:
<actual field/value>

SERVICE DATE:
<actual field/value>

TELEMETRY TIMESTAMP:
<actual field/value>

CACHE ISSUE:
<yes/no + explanation>

FRONTEND STATE ISSUE:
<yes/no + explanation>

NORMALIZATION ISSUE:
<yes/no + explanation>

FIX:
<exact files and logic changed>

TESTS:
<all tests>

12627 RESULT:
<actual current run>

12723 RESULT:
<actual current run>

12615 RESULT:
<actual current run>

53344 RESULT:
<actual current run>
```

Do not report success merely because the UI displays a different date.

Prove that the displayed run is the correct RailRadar running instance from the upstream response.

## CORE RULE

The application must answer:

> **"Which 12627 is currently running?"**

not merely:

> **"Can I find a train whose number is 12627?"**

A train number identifies the service.

A valid run/journey identity identifies the actual train instance being tracked.

Do not claim this issue is fixed until that distinction is verified end-to-end.

</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-09-13T20:35:41+05:30.
</ADDITIONAL_METADATA>