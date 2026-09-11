# Rail Samnvay — Technical Code Map

```text
USER INTERFACE / ROLE WORKSPACE
       │
       ▼
FRONTEND ROUTER & APP SHELL
       │
       ▼
REACTIVE STATE & CACHING LAYER
       │
       ▼
BACKEND API & SECURITY GATEWAY
       │
       ▼
INTELLIGENCE & DECISION ENGINES
 ├── Priority Scoring
 ├── Location Intelligence
 ├── Train Movement Analysis
 ├── 3-Way Conflict Engine
 ├── CPM Activity Graph
 └── Multi-Block Optimizer
       │
       ▼
HUMAN AUTHORIZATION & EXECUTION
       │
       ▼
AUDIT TRAIL & FIREBASE PERSISTENCE
```

---

## Direct Source File Mapping

### 1. Application Shell & Presentation
- **App Shell & RBAC Routing**: `src/App.tsx`
- **Top Command Bar & Telemetry**: `src/components/samnvay/TopCommandBar.tsx`
- **Navigation Sidebar**: `src/components/samnvay/Sidebar.tsx`
- **Authentication Gateway**: `src/components/auth/LoginPage.tsx`

### 2. Operational Workspaces (Pages)
- **Executive Corridor Dashboard**: `src/components/samnvay/pages/OverviewPage.tsx`
- **Live RailRadar Train Movements**: `src/components/samnvay/pages/LiveTrainsPage.tsx`
- **Maintenance Requirements Table**: `src/components/samnvay/pages/BlockRequestsPage.tsx`
- **Officer Approval & Concurrence Queue**: `src/components/samnvay/pages/ApprovalQueuePage.tsx`
- **AI Planning & CPM Schedule Review**: `src/components/samnvay/pages/AiPlanningPage.tsx`
- **Dynamic Conflict & Feasibility Monitor**: `src/components/samnvay/pages/ConflictMonitorPage.tsx`
- **Live Possession Execution Console**: `src/components/samnvay/pages/ExecutionPage.tsx`
- **Contextual Operational Communication**: `src/components/samnvay/pages/CommunicationPage.tsx`
- **Official Immutable Audit Trail**: `src/components/samnvay/pages/AuditTrailPage.tsx`

### 3. Requisition & Dialog Modules
- **4-Step Maintenance Requisition Wizard**: `src/components/samnvay/CreateRequestModal.tsx`
- **Section & Line Detail Drawer**: `src/components/samnvay/SectionDetailDrawer.tsx`
- **Operational Chat Drawer**: `src/components/samnvay/chat/RailwayChatDrawer.tsx`

### 4. Intelligence, Algorithms & Decision Logic
- **Priority Scoring (35/25/20/10/10)**: `src/components/samnvay/CreateRequestModal.tsx` (L218-L221)
- **Train Conflicts & Feasibility**: `src/utils/conflictPlanner.ts` (`analyzeLocationTrainConflicts`)
- **Spatial Overlap & Shadow Bundling**: `src/utils/conflictPlanner.ts` (`evaluateMultiDepartmentOverlaps`)
- **Critical Path Method (CPM Graph)**: `src/utils/conflictPlanner.ts` (`calculateCpmActivityNetwork`)
- **Railway Chainage Normalization**: `src/utils/railwayLocation.ts`

### 5. Backend Server & External Integration
- **Server Entrypoint**: `server/index.ts`
- **Auth & Session Service**: `server/services/authService.ts`, `server/routes/auth.ts`
- **Location Intelligence Service**: `server/services/locationIntelligenceService.ts`
- **OpenRailwayMap Overpass Bridge**: `server/services/openRailwayMapService.ts`
- **RailRadar Live Train Service**: `server/services/railRadarService.ts`, `server/routes/railradar.ts`
- **Requests & RBAC Approval Service**: `server/routes/requests.ts`
- **Operational Communication Routes**: `server/routes/chat.ts`

### 6. Data Storage & Cloud Sync
- **Central Workflow Store**: `src/store/useSamnvayStore.ts`
- **Firebase Initialization**: `src/services/firebase.ts`
- **Firebase Realtime Sync Manager**: `src/services/firebaseSync.ts`
- **Infrastructure Master Reference**: `src/data/infrastructureMasterData.ts`
- **Corridor C1 Baseline Data**: `src/data/corridorData.ts`
