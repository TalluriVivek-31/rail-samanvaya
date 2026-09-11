# Rail Samnvay — Datasets & Reference Data Map

| Dataset / Reference | Purpose | Implementation Source | Type | Used By | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Corridor Infrastructure Master** | Track layout, KM ranges, cross-overs, gradients, station yard limits | `src/data/infrastructureMasterData.ts` | Reference Model | Requisitions, Station Identification, Conflict Engine | **Operational Reference** |
| **Corridor Baseline (C1)** | Vijayawada – Mangalagiri – Guntur sections | `src/data/corridorData.ts` | Reference Model | Overview dashboard, section metrics | **Operational Reference** |
| **Passenger Timetable Paths** | Scheduled trains, speeds, passing times | `src/utils/conflictPlanner.ts` | Timetable Schedule | Candidate window generator, conflict checker | **Operational Schedule** |
| **Goods Freight Forecasts** | Container and coal rake movement windows | `src/utils/conflictPlanner.ts` | Operational Forecast | Feasibility analysis, shadow bundling | **Operational Forecast** |
| **Live Train Telemetry** | Dynamic train position, GPS delay, speed | `server/services/railRadarService.ts` | Live Feed / Demo | Live Trains page, real-time replanning | **Live API + High-Fidelity Demo** |
| **OpenRailwayMap GIS** | Track coordinates, turnouts, railway geometry | `server/services/openRailwayMapService.ts` | Live Geospatial API | Location Intelligence context | **Live API (12h Cache)** |
| **Default User Roster** | Railway officers, designations, roles, permissions | `src/store/useSamnvayStore.ts` | Security Matrix | Authentication, RBAC, session management | **Operational Reference** |
