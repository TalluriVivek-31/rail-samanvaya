# Rail Samnvay — System Architecture

## 1. High-Level Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               FRONTEND (React + Vite + Tailwind)                       │
│                                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │   Requirements   │  │  Approval Queue  │  │ Planning Engine  │  │ Conflict Monitor│ │
│  │     Workspace    │  │  (Multi-Dept)    │  │   (CPM/Bundle)   │  │ (Timetable+GPS) │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘ │
│           │                     │                     │                     │          │
│  ┌────────┴─────────────────────┴─────────────────────┴─────────────────────┴────────┐ │
│  │                 Reactive Zustand-Style Store (useSamnvayStore.ts)                 │ │
│  │                     • In-Memory Cache • LocalStorage Fallback                     │ │
│  └────────┬───────────────────────────────────────────┬──────────────────────────────┘ │
└───────────┼───────────────────────────────────────────┼────────────────────────────────┘
            │                                           │
            │ REST API (Bearer Token)                   │ WebSocket / Event Listeners
            ▼                                           ▼
┌───────────────────────────────────────┐   ┌────────────────────────────────────────────┐
│      BACKEND (Node.js + Express)      │   │        CLOUD PERSISTENCE (Firebase)        │
│                                       │   │                                            │
│  • Auth & Session Validator           │   │  • Realtime Database (RTDB)                │
│  • RBAC & Self-Approval Guard         │   │  • Multi-user cross-device state sync      │
│  • RailRadar API Gateway / Cache      │   │  • Cloud nodes: /requests, /blockPlans,    │
│  • OpenRailwayMap Overpass Bridge     │   │    /liveConflicts, /conversations, /audit  │
│  • Location Intelligence Service      │   │                                            │
└───────────┬───────────────────────────┘   └────────────────────────────────────────────┘
            │
            ├──────────────────────────────────────────┐
            ▼                                          ▼
┌───────────────────────────────────────┐  ┌─────────────────────────────────────────────┐
│       EXTERNAL RAILWAY APIS           │  │             GIS RAILWAY DATA                │
│                                       │  │                                             │
│  • RailRadar Live Train Tracker       │  │  • OpenRailwayMap (Overpass Turbo API)      │
│    (Train movements, speed, delay)    │  │    (Track geometry, signals, turnouts)      │
│    Status: LIVE API (with DEMO)       │  │    Status: LIVE PROTOTYPE (12h Cache)       │
└───────────────────────────────────────┘  └─────────────────────────────────────────────┘
```

---

## 2. Component Implementation Status

| Component | Technology | Implementation File | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Framework** | React 18, Vite 6, TypeScript | `src/App.tsx` | **LIVE** | Fast SPA with role-based routing. |
| **Styling & Design System** | Tailwind CSS, Plus Jakarta Sans | `src/index.css` | **LIVE** | Modern railway typography and styling. |
| **State Management** | Custom Reactive Store | `src/store/useSamnvayStore.ts` | **LIVE** | Centralized workflow & state machine. |
| **Cloud Sync** | Firebase Realtime Database | `src/services/firebaseSync.ts` | **LIVE** | Real-time cross-device data synchronization. |
| **Backend Server** | Node.js Express 5, TypeScript | `server/index.ts` | **LIVE** | API routes for auth, trains, requests, chat. |
| **RailRadar Integration** | REST Proxy + In-memory Cache | `server/services/railRadarService.ts` | **LIVE / DEMO** | Connects to external API when key provided; realistic demo fallback. |
| **Location Intelligence** | Chainage Math & Station Matrix | `server/services/locationIntelligenceService.ts` | **LIVE** | Resolves chainage, yards, station boundaries. |
| **OpenRailwayMap GIS** | Overpass API + In-memory Cache | `server/services/openRailwayMapService.ts` | **LIVE** | Fetches track geometry and signals. |
| **Priority Engine** | Deterministic 5-factor equation | `src/components/samnvay/CreateRequestModal.tsx` | **LIVE** | Mathematically weighted: 35/25/20/10/10. |
| **CPM Network Engine** | Directed Activity Graph (ES/EF/LS/LF) | `src/utils/conflictPlanner.ts` | **LIVE** | Activity network with total float calculation. |
| **Conflict Engine** | 3-Way Spatial Overlap & Headways | `src/utils/conflictPlanner.ts` | **LIVE** | Timetable paths + RailRadar live GPS movements. |
| **Master Delete Control** | Role-Guarded Store Action | `src/store/useSamnvayStore.ts` | **LIVE** | Cascading cleanup and audit logging. |
| **Legacy Systems (TMS/COA)** | Standardized Railway Adapters | `src/types/infrastructure.ts` | **PROTOTYPE** | Architecture-ready mock interface adapters. |

---

## 3. Data Flow Architecture

1. **Requisition Entry**: Department engineer inputs chainage and task specifications.
2. **Location Resolution**: System calculates affected track length, cross-sections, and station boundaries.
3. **Priority Calculation**: 5 weighted scores produce overall priority index (0–100).
4. **Approval Processing**: Officer validates necessity and safety preconditions (creator self-approval blocked).
5. **Conflict & CPM Evaluation**: Analyzes candidate traffic windows against scheduled + delayed trains.
6. **Authorization & Memo Generation**: Authorized Section Controller commits the block (`Scheduled`).
7. **Execution**: Tracks live field handoffs and line normalization.
8. **Audit Logging & Cloud Sync**: Persists all state changes to Firebase and local audit ledger.
