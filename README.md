# RAIL SAMNVAY (रेल समन्वय)
## AI-Powered Automatic Block Planning for Fixed Railway Infrastructure
### Smart India Hackathon 2026 · Problem Statement 26027
**Indian Railways · South Central Railway · Vijayawada Division (BZA)**

---

## 1. Executive Summary & Problem Statement

### The Problem
Indian Railways operates one of the densest rail networks in the world. Fixed railway assets—Permanent Way (`P.Way`), Overhead Equipment (`TRD/OHE`), and Signaling & Telecommunication (`S&T`)—require regular maintenance traffic blocks. 

Currently, block coordination is heavily manual, leading to:
1. **Severe Train Detention**: Scheduled passenger and high-priority freight trains delayed by conflicting possessions.
2. **Sub-Optimal Asset Utilization**: Departments requesting separate blocks on the same track instead of bundled joint maintenance.
3. **Safety & Rule Violations**: Risk of encroaching on mandatory headway safety buffers or releasing lines without formal multi-department certifications.

### The Solution: Rail Samnvay
**Rail Samnvay** is an intelligent, G&SR-compliant decision-support platform designed to solve the railway dilemma: **maximizing maintenance time while minimizing train detention**.

```text
MAINTENANCE REQUIREMENT ≠ CANDIDATE WINDOW ≠ RECOMMENDATION ≠ SCHEDULED POSSESSION
```

A maintenance engineer submits a **Maintenance Requirement**, **NEVER an automatically created or scheduled Block**. The system analyzes engineering dependencies, spatial overlaps, and live RailRadar train telemetry. The Planning Officer formulates a **Recommended Window**, and only the **Authorized Operating / Control Authority (COA / Operations)** authorizes and schedules track possessions.

---

## 2. Where to Find the Core Implementation (Jury Quick Reference)

If evaluating the repository, the table below provides immediate links to the primary modules:

| Subsystem / Topic | Primary File / Directory | Description & Responsibilities |
| :--- | :--- | :--- |
| **Frontend Application Shell** | [`src/App.tsx`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/App.tsx) | App shell, desktop-first control room interface, role switcher, hash routing. |
| **All 9 Operational Pages** | [`src/pages/`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/pages/) | Full suite of operational workspaces (AI Planning, Approval Queue, Conflict Monitor, Execution, etc.). |
| **AI Priority Scoring Engine** | [`src/optimization/priorityEngine.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/optimization/priorityEngine.ts) | 5-factor deterministic MCDA formula: 35% Criticality, 25% Urgency, 20% Risk, 10% Traffic, 10% Resources. |
| **Train Conflict & Headway Buffers** | [`src/optimization/conflictEngine.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/optimization/conflictEngine.ts) | 15-min pre/post buffers, train conflict filtering, candidate window generation, operational shift detection. |
| **Critical Path Method (CPM Network)** | [`src/optimization/cpmNetwork.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/optimization/cpmNetwork.ts) | Directed activity graph: power isolation $\rightarrow$ signal disconnect $\rightarrow$ parallel work $\rightarrow$ muster $\rightarrow$ clearance. |
| **Spatial Overlap & Shadow Bundling** | [`src/optimization/spatialBundling.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/optimization/spatialBundling.ts) | Detects $\max(startA, startB) < \min(endA, endB)$, bundles compatible P.Way + TRD operations. |
| **Corridor Timetable & Freight** | [`src/optimization/corridorSchedule.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/optimization/corridorSchedule.ts) | Timetable movements (Karnataka Exp, Vande Bharat, etc.) & goods freight forecasts. |
| **Optimization Unified Facade** | [`src/optimization/index.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/optimization/index.ts) | Central export for all mathematical and AI planning engines. |
| **Central State & RBAC Store** | [`src/store/useSamnvayStore.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/store/useSamnvayStore.ts) | Reactive state, state machines, CP-SAT corridor slot solver, role permissions, memo generators. |
| **4-Step Requisition Wizard** | [`src/components/modals/CreateRequestModal.tsx`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/components/modals/CreateRequestModal.tsx) | Requisition capture, chainage search, auto yard limits, equipment mobilization. |
| **Live Possession Execution Console** | [`src/pages/ExecutionPage.tsx`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/pages/ExecutionPage.tsx) | 7-stage G&SR physical possession workflow with track clearance checklists and TSR management. |
| **Immutable Audit Trail** | [`src/pages/AuditTrailPage.tsx`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/pages/AuditTrailPage.tsx) | Tamper-evident ledger logging actor ID, role, action, prior state, new state, and reason. |
| **Backend Express API Server** | [`server/index.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/server/index.ts) | Modular server entrypoint routing auth, requisitions, railradar, and infrastructure. |
| **RailRadar External Integration** | [`server/integrations/railRadarService.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/server/integrations/railRadarService.ts) | Live GPS train tracker with caching, rate-limit throttling, and realistic fallback telemetry. |
| **OpenRailwayMap GIS Integration** | [`server/integrations/openRailwayMapService.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/server/integrations/openRailwayMapService.ts) | Overpass API railway track geometry, signals, switches, and 12-hour spatial caching. |
| **Cloud Realtime Synchronization** | [`src/services/firebaseSync.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/services/firebaseSync.ts) | Bidirectional real-time persistence across multiple control room workstations. |

---

## 3. System Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    RAIL SAMNVAY                                        │
│             AI Automatic Block Planning Architecture (SIH 2026 PS 26027)               │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [ Field Engineers ]        [ Planning Officer ]        [ Operating Control (COA) ]     [ MASTER Admin ]
  (P.Way / TRD / S&T)         (Planning Engine)          (Authorized Block Authority)     (Superuser / Audit)
          │                          │                               │                         │
          └──────────────────────────┼───────────────────────────────┴─────────────────────────┘
                                     ▼
                      ┌─────────────────────────────┐
                      │    Presentation Layer       │
                      │  React 18 + TypeScript +    │
                      │  TailwindCSS Control Center │
                      └──────────────┬──────────────┘
                                     │
                                     ▼
                      ┌─────────────────────────────┐
                      │    Central Reactive State   │
                      │   `useSamnvayStore.ts`      │
                      │  • RBAC & Segregation Rules │
                      │  • Multi-Stage State Machine│
                      └──────┬───────────────┬──────┘
                             │               │
            ┌────────────────┘               └────────────────┐
            ▼                                                 ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│     AI / Optimization Core    │             │      Backend Server & API     │
│       (`src/optimization/`)   │             │          (`server/`)          │
│ • Priority Scoring (35/25/20) │             │ • Express 5 REST Endpoints    │
│ • 15-min Headway Buffers      │             │ • Location Intelligence       │
│ • Spatial Shadow Bundling     │             │ • Role & Session Middleware   │
│ • CPM Directed Activity Graph │             └───────────────┬───────────────┘
│ • CP-SAT Optimization Solver  │                             │
└───────────────────────────────┘                             ▼
                                              ┌───────────────────────────────┐
                                              │     External Integrations     │
                                              │   (`server/integrations/`)    │
                                              │ • RailRadar Live API (Trains) │
                                              │ • OpenRailwayMap (Overpass)   │
                                              │ • Firebase Realtime Cloud     │
                                              └───────────────────────────────┘
```

---

## 4. Main Modules & Operational Workspaces

All 9 operational workspaces are organized directly inside [`src/pages/`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/pages/):

1. **Operations Overview ([`OverviewPage.tsx`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/pages/OverviewPage.tsx))**:
   - Executive corridor KPIs: Pending Requests, Approved Blocks, Available Windows, Active Conflicts.
   - Interactive 3D Digital Twin with layer toggles (Tracks, Trains, Signals, OHE, Maintenance blocks).
2. **Live RailRadar Train Movements ([`LiveTrainsPage.tsx`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/pages/LiveTrainsPage.tsx))**:
   - Real-time GPS train tracking along Corridor C1 (Vijayawada – Mangalagiri – Guntur).
   - Speedometers, delay progression, dynamic ETAs, and live station board indicators.
3. **Maintenance Requirements ([`BlockRequestsPage.tsx`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/pages/BlockRequestsPage.tsx))**:
   - Master filterable table of departmental maintenance requirements.
   - Multi-criteria filtering by Department (`P.Way`, `S&T`, `TRD`), Priority, Section, and Lifecycle Status.
4. **Approval & Concurrence Queue ([`ApprovalQueuePage.tsx`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/pages/ApprovalQueuePage.tsx))**:
   - Enforces the railway golden rule: **Creator cannot self-approve**.
   - Planning Officer formulates recommendations; COA / Operating Control authorizes and schedules blocks.
5. **AI Planning & CPM Network ([`AiPlanningPage.tsx`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/pages/AiPlanningPage.tsx))**:
   - Animated multi-stage corridor optimization solver.
   - Interactive Gantt chart with prominent **15-minute pre/post safety buffers**.
   - Critical Path Method (CPM) node diagram showing prerequisites, parallel tasks, total float, and critical paths.
6. **Conflict & Feasibility Monitor ([`ConflictMonitorPage.tsx`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/pages/ConflictMonitorPage.tsx))**:
   - Evaluates dynamic headway conflicts when live trains are delayed into scheduled maintenance windows.
   - One-click dynamic replanning (SHIFT / EXTEND / SPLIT) to resolve operational conflicts.
7. **Live Possession Execution ([`ExecutionPage.tsx`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/pages/ExecutionPage.tsx))**:
   - Strict 7-stage G&SR Chapter XV checklist:
     `Block Started` $\rightarrow$ `Work in Progress` $\rightarrow$ `Track Clearance` $\rightarrow$ `OHE Normalization` $\rightarrow$ `Block Released` $\rightarrow$ `Closed`.
   - Configurable Temporary Speed Restriction (TSR) lifecycle management.
8. **Operational Communication ([`CommunicationPage.tsx`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/pages/CommunicationPage.tsx))**:
   - Contextual messaging tied directly to specific block requisitions.
   - Queries between Planning Office, Control Office, and Field Departments.
9. **Immutable Audit Trail ([`AuditTrailPage.tsx`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/pages/AuditTrailPage.tsx))**:
   - Non-repudiable audit ledger recording every state change, override, cancellation, and release memo.

---

## 5. AI & Mathematical Optimization Approach

The optimization logic resides in [`src/optimization/`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/optimization/):

### A. Explainable Priority Scoring Engine ([`priorityEngine.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/optimization/priorityEngine.ts))
Uses Multi-Criteria Decision Analysis (MCDA) with deterministic weights:
$$\text{Priority} = 0.35 \times \text{Criticality} + 0.25 \times \text{Urgency} + 0.20 \times \text{Derailment Risk} + 0.10 \times \text{Traffic Density} + 0.10 \times \text{Resource Readiness}$$
Dynamic modifiers add urgency for continuation work (+15) or active TSR restrictions (+10).

### B. Headway Conflict Detection & 15-Minute Buffers ([`conflictEngine.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/optimization/conflictEngine.ts))
Enforces mandatory 15-minute planning headway buffers:
$$\text{Overlap} \iff \max(\text{Window}_{\text{start}}, \text{Train}_{\text{time}} - 15) < \min(\text{Window}_{\text{end}}, \text{Train}_{\text{time}} + 15)$$
Also enforces the 240-minute (4-hour) maximum continuous closure limit on trunk corridors.

### C. Multi-Department Spatial Shadow Bundling ([`spatialBundling.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/optimization/spatialBundling.ts))
Scans for overlapping track requests:
$$\max(\text{startKm}_A, \text{startKm}_B) < \min(\text{endKm}_A, \text{endKm}_B)$$
When compatible (e.g. P.Way track tamping and TRD catenary adjustment on UP Main), the system bundles them into a single shadow block, calculating efficiency gains and reducing overall line closures.

### D. Critical Path Method (CPM Network) ([`cpmNetwork.ts`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/src/optimization/cpmNetwork.ts))
Computes Forward and Backward passes across dependent maintenance activities:
- Early Start ($ES$) & Early Finish ($EF$)
- Late Start ($LS$) & Late Finish ($LF$)
- Total Float: $TF = LS - ES$
- Critical Path: Activities where $TF = 0$.

---

## 6. Security & RBAC Roles

The system strictly enforces Indian Railways organizational hierarchy:

| Role | Prototype Designation | Operational Authority | Restrictions |
| :--- | :--- | :--- | :--- |
| **Field Engineer** | `P.Way`, `S&T`, `TRD` Engineers | Submits maintenance requisitions, specifies equipment and chainage. | **Cannot approve or schedule blocks**. Cannot self-approve. |
| **Planning Officer** | `DOM Planning` | Formulates AI plans, runs conflict analysis, generates **Recommended Windows**. | **Does NOT authorize blocks**. Submits recommendations to Control. |
| **Operating Control** | `COA / Operations` (Chief Controller) | **Authorized Operating / Control Authority**. Formally authorizes and schedules blocks, grants possession, and releases lines. | Authorizes based on traffic concurrence. |
| **System Admin** | `MASTER` (PCOM) | Full-access prototype superuser across all screens. | Any direct block authorization logs an **`[Administrative Override]`** audit entry. |

---

## 7. How to Run, Build & Deploy

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### 1. Local Development
```bash
# Install dependencies
npm install

# Run backend API server + frontend Vite dev server concurrently
npm run dev:all
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

To run separately:
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run dev
```

### 2. Running Automated Acceptance Tests
```bash
npm test
```
Verifies:
- Priority Engine MCDA mathematical formula (35/25/20/10/10)
- Mobilization schedule and muster calculation
- Feasibility & 15-minute train headway conflict logic
- Dynamic replanning shift actions
- Configurable Temporary Speed Restriction (TSR) lifecycle

### 3. Production Build
```bash
npm run build
```
Executes:
1. `tsc` (Frontend TypeScript type verification)
2. `vite build` (Production client bundle in `dist/`)
3. `tsc -p tsconfig.server.json` (Backend TypeScript compile into `dist-server/`)

### 4. Production Start
```bash
npm start
```
Runs the compiled production server on port 3001, serving the frontend static bundle.

### 5. Deployment (Vercel)
The repository contains [`vercel.json`](file:///c:/Users/tallu/OneDrive/Documents/SIH-RAILWAY/vercel.json) configured for single-page routing:
```bash
vercel deploy --prod
```

---

## 8. Repository Layout

```text
SIH-RAILWAY/
├── docs/                       # Technical architecture, SIH judge guides & security specs
│   ├── ARCHITECTURE.md         # Full system architecture specification
│   ├── CODE_MAP.md             # Technical code map and component relationships
│   ├── DATA_FLOW.md            # Requisition-to-release lifecycle data flow
│   ├── SECURITY_RBAC.md        # Role-based access control & authorization matrix
│   └── SIH_JUDGE_GUIDE.md      # 3-minute live judge demonstration script & Q&A guide
├── server/                     # Backend API & External Integrations
│   ├── data/                   # Demonstration master data (users, seed trains)
│   ├── integrations/           # External systems (RailRadar API, OpenRailwayMap GIS)
│   ├── routes/                 # Express API endpoints (auth, requests, railradar, chat)
│   ├── services/               # Core business services (location intelligence, auth)
│   └── index.ts                # Express server entrypoint
├── src/                        # Frontend Application & AI Planning Core
│   ├── components/             # Reusable UI components
│   │   ├── auth/               # Login & authentication views
│   │   ├── chat/               # Contextual operational communication drawers
│   │   ├── layout/             # Sidebar, TopCommandBar, header controls
│   │   ├── modals/             # 4-step requisition wizard, section drawer
│   │   ├── twin/               # 3D Railway Digital Twin (Three.js)
│   │   └── vertex/             # Presentation landing showcase
│   ├── data/                   # Master railway infrastructure & corridor reference data
│   ├── hooks/                  # React custom hooks (useRailRadar telemetry)
│   ├── optimization/           # Core AI & Mathematical Optimization Subsystem
│   │   ├── conflictEngine.ts   # Train headway conflicts & candidate window generation
│   │   ├── corridorSchedule.ts # Timetable movements & goods freight forecasts
│   │   ├── cpmNetwork.ts       # Critical Path Method (CPM) directed activity network
│   │   ├── priorityEngine.ts   # 5-factor deterministic MCDA priority engine
│   │   ├── spatialBundling.ts  # Multi-department spatial overlap & shadow bundling
│   │   └── index.ts            # Subsystem facade
│   ├── pages/                  # 9 dedicated operational control room pages
│   ├── services/               # Frontend API clients & Firebase Realtime sync
│   ├── store/                  # Central reactive store & CP-SAT state machine
│   ├── types/                  # TypeScript interface definitions
│   ├── utils/                  # Date, time, chainage & helper utilities
│   ├── App.tsx                 # Root application component & hash router
│   ├── index.css               # Global Tailwind CSS design system styles
│   └── main.tsx                # React DOM entrypoint
├── test/                       # Core engine verification test suite
│   └── test_core_engines.mjs   # Acceptance verification test runner
├── index.html                  # HTML entrypoint
├── package.json                # Project dependencies & scripts
├── tsconfig.json               # Frontend TypeScript configuration
├── tsconfig.server.json         # Backend TypeScript configuration
├── vercel.json                 # Vercel deployment rewrite rules
└── vite.config.ts              # Vite configuration & dev proxy
```
