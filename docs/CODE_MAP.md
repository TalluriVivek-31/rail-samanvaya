# Rail Samnvay — Technical Code Map
### Indian Railways · Automatic Block Planning Subsystem (SIH 2026 PS 26027)

```text
USER INTERFACE / ROLE WORKSPACE
       │
       ▼
FRONTEND ROUTER & APP SHELL (`src/App.tsx`)
       │
       ▼
REACTIVE STATE & CACHING LAYER (`src/store/useSamnvayStore.ts`)
       │
       ▼
BACKEND API & SECURITY GATEWAY (`server/index.ts` + `server/routes/`)
       │
       ▼
INTELLIGENCE & OPTIMIZATION ENGINES (`src/optimization/`)
 ├── Priority Scoring (35/25/20/10/10) (`src/optimization/priorityEngine.ts`)
 ├── Train Headway Conflict & Buffers (`src/optimization/conflictEngine.ts`)
 ├── Spatial Overlap & Shadow Bundling (`src/optimization/spatialBundling.ts`)
 ├── Critical Path Method (CPM Graph) (`src/optimization/cpmNetwork.ts`)
 ├── Corridor Timetable & Freight Forecast (`src/optimization/corridorSchedule.ts`)
 └── Location Intelligence Normalizer (`src/utils/railwayLocation.ts`)
       │
       ▼
EXTERNAL INTEGRATIONS (`server/integrations/`)
 ├── RailRadar API (Live Train GPS & Delays) (`server/integrations/railRadarService.ts`)
 └── OpenRailwayMap (Overpass Track GIS) (`server/integrations/openRailwayMapService.ts`)
       │
       ▼
HUMAN AUTHORIZATION & G&SR EXECUTION (`src/pages/ApprovalQueuePage.tsx`, `src/pages/ExecutionPage.tsx`)
       │
       ▼
AUDIT TRAIL & CLOUD SYNC (`src/pages/AuditTrailPage.tsx`, `src/services/firebaseSync.ts`)
```

---

## Direct Source File Mapping

### 1. Application Shell & Layout
- **App Shell & Hash Routing**: `src/App.tsx`
- **Top Command Bar & Telemetry**: `src/components/layout/TopCommandBar.tsx`
- **Navigation Sidebar & Role Switcher**: `src/components/layout/Sidebar.tsx`
- **Authentication Gateway**: `src/components/auth/LoginPage.tsx`
- **3D Digital Twin**: `src/components/twin/DigitalTwin3D.tsx`

### 2. Operational Workspaces (`src/pages/`)
- **Executive Corridor Dashboard**: `src/pages/OverviewPage.tsx`
- **Live RailRadar Train Movements**: `src/pages/LiveTrainsPage.tsx`
- **Maintenance Requirements Table**: `src/pages/BlockRequestsPage.tsx`
- **Officer Approval & Concurrence Queue**: `src/pages/ApprovalQueuePage.tsx`
- **AI Planning & CPM Schedule Review**: `src/pages/AiPlanningPage.tsx`
- **Dynamic Conflict & Feasibility Monitor**: `src/pages/ConflictMonitorPage.tsx`
- **Live Possession Execution Console**: `src/pages/ExecutionPage.tsx`
- **Contextual Operational Communication**: `src/pages/CommunicationPage.tsx`
- **Official Immutable Audit Trail**: `src/pages/AuditTrailPage.tsx`
- **Unified Pages Export**: `src/pages/index.ts`

### 3. Requisition & Modal Components (`src/components/modals/` & `src/components/chat/`)
- **4-Step Maintenance Requisition Wizard**: `src/components/modals/CreateRequestModal.tsx`
- **Section & Track Asset Detail Drawer**: `src/components/modals/SectionDetailDrawer.tsx`
- **Role Switch & Login Modal**: `src/components/modals/LoginModal.tsx`
- **Contextual Operational Chat Drawer**: `src/components/chat/RailwayChatDrawer.tsx`
- **Nearby Correlated Work Widget**: `src/components/chat/NearbyWorkWidget.tsx`

### 4. Intelligence & Optimization Subsystem (`src/optimization/`)
- **Deterministic 5-Factor Priority Engine**: `src/optimization/priorityEngine.ts` (35% Crit, 25% Urg, 20% Risk, 10% Traf, 10% Res)
- **Train Conflicts & 15-min Headway Margins**: `src/optimization/conflictEngine.ts` (`analyzeLocationTrainConflicts`)
- **Dynamic Replanning on Train Delays**: `src/optimization/conflictEngine.ts` (`detectOperationalShift`)
- **Asset Availability Model**: `src/optimization/conflictEngine.ts` (`calculateCorridorAssetAvailability`)
- **Spatial Overlap & Multi-Department Shadow Bundling**: `src/optimization/spatialBundling.ts` (`evaluateMultiDepartmentOverlaps`)
- **Critical Path Method (CPM Network Graph)**: `src/optimization/cpmNetwork.ts` (`calculateCpmActivityNetwork`)
- **Scheduled Timetable & Freight Forecasts**: `src/optimization/corridorSchedule.ts` (`SCHEDULED_CORRIDOR_MOVEMENTS`)
- **Subsystem Facade & Re-export**: `src/optimization/index.ts` (also exposed via `src/utils/conflictPlanner.ts`)
- **Railway Chainage Normalization**: `src/utils/railwayLocation.ts`

### 5. Backend Server (`server/`) & External Integrations (`server/integrations/`)
- **Express Server Entrypoint**: `server/index.ts`
- **External Integration — RailRadar (Live Trains)**: `server/integrations/railRadarService.ts`
- **External Integration — OpenRailwayMap (Overpass GIS)**: `server/integrations/openRailwayMapService.ts`
- **Requisition & RBAC Approval Service**: `server/routes/requests.ts`
- **RailRadar Live Telemetry Routes**: `server/routes/railradar.ts`
- **Infrastructure & Spatial Master Routes**: `server/routes/infrastructure.ts`
- **Authentication Routes & RBAC**: `server/routes/auth.ts`, `server/services/authService.ts`
- **Location Intelligence Service**: `server/services/locationIntelligenceService.ts`
- **Operational Communication Routes**: `server/routes/chat.ts`

### 6. Central State, Cloud Sync & Data Master
- **Central State & RBAC Workflow Store**: `src/store/useSamnvayStore.ts`
- **Firebase Realtime Database Initialization**: `src/services/firebase.ts`
- **Firebase Realtime Sync Manager**: `src/services/firebaseSync.ts`
- **Infrastructure Master Reference**: `src/data/infrastructureMasterData.ts`
- **Corridor C1 Baseline Data**: `src/data/corridorData.ts`
