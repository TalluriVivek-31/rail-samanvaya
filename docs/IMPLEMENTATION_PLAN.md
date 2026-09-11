# Rail Samnvay — Comprehensive File Implementation Plan

This document details the exact role, inputs, processing algorithms, outputs, and judge Q&A relevance for every critical file in the **Rail Samnvay** codebase.

---

### FILE 1: `src/utils/conflictPlanner.ts`
- **PATH**: `trainsamanvaya/src/utils/conflictPlanner.ts`
- **PURPOSE**: Core decision-support and planning mathematical engine. Performs candidate window generation, feasibility evaluation against passenger & freight paths, multi-department spatial overlap detection, and formal Critical Path Method (CPM) activity network analysis.
- **INPUT**:
  - Requisition parameters: `startKm`, `endKm`, `selectedTracks`, `durationMinutes`, `requestedTime`.
  - Timetable scheduled paths (`SCHEDULED_CORRIDOR_MOVEMENTS`).
  - Live train movements (`LiveTrainPosition[]`) from RailRadar.
  - Planning configuration parameters (`headwayBufferMinutes: 15`).
- **PROCESSING**:
  1. `analyzeLocationTrainConflicts`: Identifies whether train passages cross the maintenance interval within headway safety margins. Flags impossible durations (>240m).
  2. `evaluateMultiDepartmentOverlaps`: Calculates spatial intersection $\max(\text{startA}, \text{startB}) < \min(\text{endA}, \text{endB})$. Determines cross-department task compatibility (P.Way + TRD).
  3. `calculateCpmActivityNetwork`: Constructs directed acyclic graph. Performs forward pass (ES, EF) and backward pass (LS, LF) to calculate Total Float ($TF = LS - ES$). Identifies critical vs parallel tasks.
- **OUTPUT**:
  - Candidate windows (`CandidatePlanningWindow[]`) categorized as `FEASIBLE`, `CONFLICT`, or `INSUFFICIENT_DURATION`.
  - Recommended window with justification string.
  - Formal CPM analysis (`CpmAnalysisResult`) with utilization percentage $\le 100\%$.
- **USED BY**: `AiPlanningPage.tsx`, `CreateRequestModal.tsx`, `ConflictMonitorPage.tsx`, `useSamnvayStore.ts`.
- **WHY IMPORTANT FOR RAIL SAMNVAY**: Proves the application contains authentic railway operations engineering mathematics rather than hardcoded mock cards.
- **JUDGE QUESTION**: *"Where is your optimization math and how do you calculate critical path for maintenance?"*

---

### FILE 2: `src/components/samnvay/CreateRequestModal.tsx`
- **PATH**: `trainsamanvaya/src/components/samnvay/CreateRequestModal.tsx`
- **PURPOSE**: 4-step maintenance requisition wizard for departmental engineers. Integrates dynamic station identification, track asset detection, priority calculation, and operational preference capture.
- **INPUT**: Department, work category, chainage (`KM 12/400`), tracks, machines, workforce, and preferred timing.
- **PROCESSING**:
  1. Executes real-time chainage lookup via `detectLocationInfrastructure`.
  2. Computes 5-factor deterministic priority score:
     $$\text{Score} = \text{round}(0.35 \times \text{Crit} + 0.25 \times \text{Urg} + 0.20 \times \text{Risk} + 0.10 \times \text{Traf} + 0.10 \times \text{Res})$$
  3. Formats requisition with status **`Submitted`**.
- **OUTPUT**: Dispatches new requisition to `useSamnvayStore.createRequest` with full audit trace.
- **USED BY**: `BlockRequestsPage.tsx`, `OverviewPage.tsx`.
- **WHY IMPORTANT**: Demonstrates adherence to the core railway workflow: field users submit **Maintenance Requirements**, never scheduled blocks.
- **JUDGE QUESTION**: *"How do field engineers enter maintenance work and what safety information is captured?"*

---

### FILE 3: `server/services/locationIntelligenceService.ts`
- **PATH**: `trainsamanvaya/server/services/locationIntelligenceService.ts`
- **PURPOSE**: Resolves physical railway infrastructure, chainage formatting, station yard limit intersections, and cross-section boundaries.
- **INPUT**: Start KM and End KM (strings like `"12/400"` or numbers).
- **PROCESSING**:
  - Normalizes chainage strings to decimal values (`12.400`).
  - Evaluates station boundary intervals (e.g. Mangalagiri yard KM 12.000 to 13.500).
  - Determines if the work intersects station limits or open block sections.
- **OUTPUT**: Enriched `LocationIntelligenceResult` with station codes, section codes, line tracks, and GIS metadata.
- **USED BY**: Backend API `/api/infrastructure/location-context`, frontend `CreateRequestModal.tsx`.
- **WHY IMPORTANT**: Prevents unrealistic time-only scheduling by anchoring every request to physical track geometry.
- **JUDGE QUESTION**: *"How does the system know where the maintenance work is situated?"*

---

### FILE 4: `server/services/railRadarService.ts`
- **PATH**: `trainsamanvaya/server/services/railRadarService.ts`
- **PURPOSE**: Integrates live GPS train movement tracking from the RailRadar API with caching, proxying, and realistic Indian Railways demo fallback.
- **INPUT**: Corridor bounding box, station codes, or train numbers.
- **PROCESSING**:
  - Calls external RailRadar REST endpoints when `RAILRADAR_API_KEY` is present.
  - Implements an in-memory 15-second cache to prevent external rate-limiting.
  - Supplies high-fidelity Vijayawada Division train movement telemetry in DEMO mode.
- **OUTPUT**: Standardized array of `LiveTrainPosition` objects with current KM, delay, speed, and expected zone arrival.
- **USED BY**: Backend route `server/routes/railradar.ts`, frontend hook `useRailRadar.ts`.
- **WHY IMPORTANT**: Connects maintenance block planning to real-world dynamic train movements and delays.
- **JUDGE QUESTION**: *"How do live trains enter your planning system?"*

---

### FILE 5: `server/routes/requests.ts`
- **PATH**: `trainsamanvaya/server/routes/requests.ts`
- **PURPOSE**: Server-side RBAC validation and authorization enforcement for the maintenance lifecycle.
- **INPUT**: HTTP POST requests with Bearer session tokens, `requestId`, `targetStatus`, and remarks.
- **PROCESSING**:
  1. Validates caller session token against active credentials.
  2. **Self-Approval Guard**: Strictly rejects approval if `requesterName === sessionUser.name` (Rule: Creator cannot approve own request).
  3. **Role Authority Guard**: Restricts `Approved` and `Scheduled` statuses to `Planning Officer`, `COA`, or `MASTER`.
- **OUTPUT**: JSON response confirming transition or HTTP 403 Forbidden with security error code.
- **USED BY**: Frontend `authClient.ts`, `useSamnvayStore.ts`.
- **WHY IMPORTANT**: Ensures security rules cannot be bypassed by browser console manipulation.
- **JUDGE QUESTION**: *"How do you prevent a field engineer from approving their own block?"*

---

### FILE 6: `src/store/useSamnvayStore.ts`
- **PATH**: `trainsamanvaya/src/store/useSamnvayStore.ts`
- **PURPOSE**: Centralized state management and workflow engine. Houses the 17-stage state machine, audit logging, Master role deletion control, and cloud sync hooks.
- **INPUT**: Actions dispatched by user interactions (creation, approval, rescheduling, deletion).
- **PROCESSING**:
  - Maintains `requests`, `blockPlans`, `liveConflicts`, `conversations`, `auditLogs`, and `executionSteps`.
  - Enforces `MASTER` role guard for `deleteMaintenanceBlock(requestId, reason)`.
  - Triggers subscribers for Firebase Realtime Database persistence.
- **OUTPUT**: Reactive store hook `useSamnvayStore()` consumed by all UI workspaces.
- **USED BY**: Entire frontend application.
- **WHY IMPORTANT**: Provides a single source of truth for the entire railway control room.
- **JUDGE QUESTION**: *"Where does the application maintain its workflow and audit state?"*

---

### FILE 7: `src/services/firebaseSync.ts`
- **PATH**: `trainsamanvaya/src/services/firebaseSync.ts`
- **PURPOSE**: Bidirectional real-time cloud synchronization between the local store and Firebase Realtime Database.
- **INPUT**: Local store mutations and remote Firebase node changes.
- **PROCESSING**:
  - Debounces local mutations (400ms) to prevent server flooding.
  - Subscribes to remote `/samnvay` node to update local store when other officers make changes.
  - Emits connection telemetry (`connected`, `permission_denied`, `offline`).
- **OUTPUT**: Synchronized state across multiple browser tabs and mobile devices.
- **USED BY**: `src/App.tsx`, `TopCommandBar.tsx`.
- **WHY IMPORTANT**: Enables true multi-department collaboration across Indian Railways offices.
- **JUDGE QUESTION**: *"Is Firebase actually used and how do multiple officers stay synchronized?"*
