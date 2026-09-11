# Rail Samnvay — Complete Data Flow & Lifecycle Specification

## 1. The Core Lifecycle Invariant

```text
[ Maintenance Requirement ]  ──>  [ Department Verification ]  ──>  [ Planning Optimization ]  ──>  [ Authorized Block ]
       (Field User)                      (Officer Review)                    (AI & CPM Engine)             (Controller Memo)
```

A **Maintenance Requirement** is NEVER born as a block. It represents requested engineering work. The system plans candidate windows, and an authorized human officer converts the recommendation into an official scheduled possession.

---

## 2. Step-by-Step Data Flow

### Step 1: Requisition Creation
- **Actor**: Field Maintenance Engineer (P.Way, TRD, S&T, or Mechanical).
- **Component**: `src/components/samnvay/CreateRequestModal.tsx`
- **Data Captured**:
  - Department, work category, maintenance category.
  - Track chainage: Start KM (`12/400`) & End KM (`13/100`).
  - Affected tracks: `UP Main`, `DOWN Main`, `Loop Line`.
  - Machine, workforce, and material inputs.
  - Preferred timing (e.g. `02:00` or flexible window).
- **Output**: Requisition entity created in status **`Submitted`**.
- **Important**: Status is NEVER `Scheduled` at this step. No block memo number exists.

### Step 2: Location Intelligence & Station Boundary Check
- **Component**: `server/services/locationIntelligenceService.ts`
- **Processing**:
  - Normalizes chainage strings to decimal values (`12.400` to `13.100`).
  - Computes linear work distance (`700 metres`).
  - Resolves station yard limits vs. block section intervals.
  - Identifies station context: `Mangalagiri (MAG) - Station Yard Limit Intersection`.

### Step 3: AI-Assisted Priority Scoring
- **Component**: `src/components/samnvay/CreateRequestModal.tsx` (L218-L221)
- **Formula**:
  $$\text{Priority Score} = 0.35 \times \text{Crit} + 0.25 \times \text{Urg} + 0.20 \times \text{Risk} + 0.10 \times \text{Traffic} + 0.10 \times \text{Resources}$$
- **Output**: Deterministic score between 0 and 100 with category tag (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).

### Step 4: Department Review & Approval
- **Actor**: Divisional Operations Manager / Planning Officer (`Planning Officer`).
- **Component**: `src/components/samnvay/pages/ApprovalQueuePage.tsx`
- **Security Check**:
  - Creator cannot approve their own requisition (`isSameUser` check in `server/routes/requests.ts`).
  - Field engineers cannot approve or schedule blocks.
- **Action**: Officer clicks **Approve**.
- **Output**: Status updates from `Submitted` $\rightarrow$ **`Approved`** (approved for planning).

### Step 5: Train Movement & Conflict Evaluation
- **Component**: `src/utils/conflictPlanner.ts` (`analyzeLocationTrainConflicts`)
- **Inputs**:
  - Timetable passenger paths (`Karnataka Express 12627` at 02:25 IST).
  - Goods freight forecasts (`BZA-GOODS-412` at 03:40 IST).
  - Real-time RailRadar train positions and GPS delays.
- **Evaluation**:
  - `Slot 01 (02:00–04:00)`: Detected as **`CONFLICT`** due to train passage violating 15-minute headway margin.
  - `Slot 02 (04:30–06:30)`: Detected as **`FEASIBLE`** (zero train conflicts).
  - Duration > 240 mins: Flagged as **`IMPOSSIBLE_DURATION`**.

### Step 6: CPM Directed Activity Network
- **Component**: `src/utils/conflictPlanner.ts` (`calculateCpmActivityNetwork`)
- **Activity Sequence**:
  1. `ACT-TRD-ISO`: 25kV OHE Power Isolation & Discharge (15m, Critical)
  2. `ACT-PWAY-MAIN`: Main Track Renewal (120m, Critical)
  3. `ACT-TRD-MAIN`: Catenary Cantilever Adjustment (60m, Parallel, Total Float = 60m)
  4. `ACT-INSP-CLR`: Track Clearance & Gang Muster Certification (15m, Critical)
  5. `ACT-FINAL-REL`: Operating Block Memo Cancellation (5m, Critical)
- **Metrics**:
  - Critical Path Duration = 155 minutes.
  - Block Utilization % = (Critical Path / Available Window) $\times$ 100 $\le 100\%$.

### Step 7: System Planning Recommendation
- **Component**: `src/components/samnvay/pages/AiPlanningPage.tsx`
- **Output**: Status transitions to **`Block Window Allocated`** (Proposed bundle).
- **Important**: Still NOT a scheduled line possession. No train is halted yet.

### Step 8: Human Officer Authorization & Scheduling
- **Actor**: Section Controller (`COA / Operations` or `MASTER`).
- **Action**: Officer clicks **Authorize & Schedule Block**.
- **Output**: Official Block Memo assigned (`BLK-2026-0015`), status becomes **`Scheduled`**.

### Step 9: Live 7-Stage Execution Tracking
- **Component**: `src/components/samnvay/pages/ExecutionPage.tsx`
- **Lifecycle Stages**:
  1. `Scheduled`
  2. `Caution Order Issued`
  3. `Line Verified Clear`
  4. `Block Started` (Traffic & Power Block Granted)
  5. `Work in Progress`
  6. `Work Completed` (Track Certified Fit)
  7. `Block Released` (Line Normalization)

### Step 10: Non-Repudiable Audit Logging & Cloud Sync
- **Component**: `src/store/useSamnvayStore.ts` & `src/services/firebaseSync.ts`
- **Actions Recorded**: Every status change, approval, rejection, memo issuance, or deletion is permanently recorded in `auditLogs` with actor name, role, timestamp, and explanation, and synchronized live to Firebase.
