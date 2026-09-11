# RAIL SAMNVAY (रेल समन्वय)
## AI-Powered Automatic Block Planning for Fixed Railway Infrastructure
### Smart India Hackathon 2026 · Problem Statement 26027

---

## 1. Executive Summary & Core Principle

**Rail Samnvay** is an intelligent, G&SR-compliant decision-support system designed to solve the critical railway dilemma: **maximizing infrastructure maintenance time while minimizing passenger & freight train detention**.

### The Core Operational Principle

> **USER REQUESTS MAINTENANCE WORK → SYSTEM UNDERSTANDS RAILWAY CONTEXT → AUTHORIZED OFFICERS APPROVE THE REQUIREMENT → SYSTEM PLANS THE POSSESSION → AUTHORIZED CONTROLLER SCHEDULES & AUTHORIZES THE BLOCK**

A field engineer submits a **Maintenance Requirement**, **NEVER an automatically created or scheduled Block**. The system evaluates engineering dependencies, spatial overlaps, live train movements, and safety clearances before an authorized Railway Officer grants or schedules any track possession.

---

## 2. End-to-End Operational Pipeline

```text
       [ Field Maintenance Engineer ]
                     │
                     ▼
       1. Maintenance Requisition Form
          (P.Way / TRD / S&T / Mechanical)
                     │
                     ▼
       2. Location Intelligence Engine
          (Chainage normalization, Station Yard Limits, Affected Tracks)
                     │
                     ▼
       3. AI-Assisted Priority Scoring
          (Criticality 35%, Urgency 25%, Derailment Risk 20%, Traffic 10%, Resources 10%)
                     │
                     ▼
       4. Multi-Department Concurrence & Approval Queue
          (Strict RBAC: Creator ≠ Approver; Planning Officer Review)
                     │
                     ▼
       5. Dynamic Timetable & RailRadar Train Movement Analysis
          (Scheduled passenger paths, Goods freight forecasts, Live GPS delays)
                     │
                     ▼
       6. 3-Way Spatial & Headway Conflict Detection
          (max(startA, startB) < min(endA, endB), 15-min safety margins)
                     │
                     ▼
       7. Critical Path Method (CPM) Activity Network
          (Power isolation, Signal disconnection, Parallel execution, Line clearance)
                     │
                     ▼
       8. Constrained Block Allocation Optimizer
          (Multi-department shadow bundling, Continuous closure limits <= 240m)
                     │
                     ▼
       9. System Allocation Recommendation
          ("Block Window Allocated" — Not yet a line possession)
                     │
                     ▼
      10. Human Officer Authorization (Section Controller / PCOM)
          (Issues Official Block Memo: "Scheduled")
                     │
                     ▼
      11. Real-Time Execution Lifecycle
          (7-Stage G&SR Checklist: Block Started → WIP → Work Completed → Released)
                     │
                     ▼
      12. Permanent Non-Repudiable Audit Trail
          (Actor ID, Role, Timestamp, Prior State, New State, Reason)
```

---

## 3. SIH Judge Code Map (Direct File Pointers)

| Judge Question | Actual Source File | Implementation Role |
| :--- | :--- | :--- |
| **How does maintenance enter?** | `src/components/samnvay/CreateRequestModal.tsx` | 4-step wizard capturing department work, chainage, tracks, and equipment. |
| **Where is priority calculated?** | `src/components/samnvay/CreateRequestModal.tsx` (L218-L221)<br>Verified in: `test/test_core_engines.mjs` (L6-L26) | Deterministic 5-factor weighted formula: 35% Crit, 25% Urg, 20% Risk, 10% Traf, 10% Res. |
| **How are conflicts detected?** | `src/utils/conflictPlanner.ts` (L92-L267) | Evaluates track approach, 15-min safety headway buffers, and impossible duration (>240m). |
| **Where is shadow bundling / spatial overlap?** | `src/utils/conflictPlanner.ts` (L278-L394) | Computes `max(startA, startB) < min(endA, endB)`, bundles compatible P.Way + TRD tasks. |
| **Where is the CPM algorithm?** | `src/utils/conflictPlanner.ts` (L412-L614) | Forward/Backward pass computing ES, EF, LS, LF, Total Float ($TF = LS - ES$), and critical path. |
| **Where is the optimization logic?** | `src/utils/conflictPlanner.ts` (L128-L266)<br>Backend solver bridge: `server/routes/requests.ts` | Constrained optimization evaluating candidate time slots, duration limits, and train windows. |
| **How do live trains enter?** | `server/services/railRadarService.ts`<br>Frontend client: `src/services/railRadarClient.ts` | Proxies live RailRadar train positions, delay times, and corridor speeds (LIVE + DEMO fallback). |
| **How is railway location identified?** | `server/services/locationIntelligenceService.ts`<br>Master data: `src/data/infrastructureMasterData.ts` | Normalizes Indian Railways chainage (`KM 12/400`), resolves station yard boundaries. |
| **Where is OpenRailwayMap used?** | `server/services/openRailwayMapService.ts` | Overpass API railway track geometry, signal positions, switches, with 12-hour server caching. |
| **How does approval & RBAC work?** | `server/routes/requests.ts` (L55-L95)<br>Store: `src/store/useSamnvayStore.ts` (L800-L1050) | Strict G&SR enforcement: Creator cannot self-approve; field engineers cannot schedule blocks. |
| **Where is the MASTER delete block capability?** | `src/store/useSamnvayStore.ts` (L1147-L1210) | MASTER (PCOM) role can delete requisitions/blocks, cascading across queues with full audit log. |
| **How is cloud synchronization handled?** | `src/services/firebase.ts`<br>Sync engine: `src/services/firebaseSync.ts` | Bidirectional real-time cloud sync to Firebase Realtime Database across multiple devices. |
| **How are official actions recorded?** | `src/components/samnvay/pages/AuditTrailPage.tsx`<br>Logger: `src/store/useSamnvayStore.ts` (L557-L573) | Immutable append-only audit log tracking timestamp, employee ID, role, action, and rationale. |

---

## 4. Live Judge Demonstration Workflow (3-Minute Script)

1. **Log in as Field Engineer (`P.Way Engineer` - S. Narayanan)**:
   - Go to `http://localhost:5173/`.
   - Open **Requirements** (`#requests`) and click **+ New Maintenance Requirement**.
   - Input chainage `12/400` to `13/100` on `UP Main`.
   - Point out that **Station Identification** automatically detects `Mangalagiri (MAG) - Station Yard Limit Intersection`.
   - Submit the requisition. Observe that status is **"Submitted"** (NOT a block, NO memo number).
2. **Review Priority & Overlaps**:
   - Point out the **Priority Score (87/100)** calculated using the 5-factor deterministic formula.
   - Point out the **Multi-Department Spatial Overlap** warning: TRD has an adjacent OHE work requisition on the same track.
3. **Switch Role to Planning Officer (`Planning Officer` - M. K. Rao)**:
   - Open **Approval Queue** (`#approval`).
   - Try to self-approve with the creator user (system blocks it).
   - Click **Approve**. The requisition status moves to **"Approved"** (approved for planning, not scheduled).
4. **Run Planning & Optimization Engine**:
   - Open **Planning Engine** (`#planning`).
   - View the candidate windows evaluated against scheduled timetable trains and live RailRadar feeds.
   - Point out **Slot 01 (02:00-04:00)** is flagged as **CONFLICT** due to Karnataka Express (`Train 12627`).
   - Point out **Slot 02 (04:30-06:30)** is recommended as **FEASIBLE** (zero conflicts, 15-min headway buffers preserved).
   - Inspect the **CPM Activity Network**: shows Power Isolation (15m) $\rightarrow$ Parallel Track & OHE Work (120m) $\rightarrow$ Track Clearance (15m) $\rightarrow$ Line Release (5m). Total Float for TRD = 60m.
5. **Switch Role to Section Controller (`COA / Operations` - P. Murthy)**:
   - Click **Authorize & Schedule Block**.
   - System assigns official Block Memo (`BLK-2026-0015`) and moves status to **"Scheduled"**.
6. **Track Execution in Control Room**:
   - Open **Execution** (`#execution`).
   - Progress through the 7 G&SR stages: `Block Started` $\rightarrow$ `Work in Progress` $\rightarrow$ `Work Completed` $\rightarrow$ `Block Released`.
7. **Inspect Audit Trail & Cloud Sync**:
   - Open **Audit Trail** (`#audit`). Show the complete immutable log of all actions with actor stamps.
   - Point to the header **`CLOUD SYNC: ACTIVE`** pill demonstrating live Firebase Realtime Database persistence.
