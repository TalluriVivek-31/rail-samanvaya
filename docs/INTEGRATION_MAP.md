# Rail Samnvay — External & Internal Integration Map

| Integration / System | Purpose | Implementation File | Status | Technical Details |
| :--- | :--- | :--- | :--- | :--- |
| **RailRadar API** | Live GPS train tracking, real-time delays, speeds | `server/services/railRadarService.ts`<br>`src/services/railRadarClient.ts` | **LIVE (with DEMO fallback)** | REST proxy with 15-second cache; live mode toggle in top command bar. |
| **OpenRailwayMap** | Track geometry, signal positions, turnout topology | `server/services/openRailwayMapService.ts` | **LIVE PROTOTYPE** | Overpass Turbo API querying OSM railway nodes with 12-hour server cache. |
| **Firebase RTDB** | Bidirectional real-time multi-device cloud persistence | `src/services/firebase.ts`<br>`src/services/firebaseSync.ts` | **LIVE** | Native Web SDK WebSocket listeners syncing `/samnvay` node across users. |
| **Track Management System (TMS)** | Track inspection logs, rail defects | `src/types/infrastructure.ts` | **PROTOTYPE ADAPTER** | Standardized IR data contract for future enterprise integration. |
| **Control Office Application (COA)** | Train charting and headway slots | `src/types/infrastructure.ts` | **PROTOTYPE ADAPTER** | Structured schema modeling IR divisional control room train orders. |
| **Signalling Maintenance (SMMS)** | Interlocking disconnection notices | `src/types/infrastructure.ts` | **PROTOTYPE ADAPTER** | Models joint S&T disconnection and point locking memos. |
| **Traction Distribution (TDMS)** | 25kV OHE power isolation permits | `src/types/infrastructure.ts` | **PROTOTYPE ADAPTER** | Captures power block requirements and earthing discharge permits. |

---

### Clarification for SIH Judges:
- **RailRadar**: Uses real external API endpoints when a valid key is provided, falling back seamlessly to authentic Vijayawada Division train movements in demo mode.
- **OpenRailwayMap**: Genuine live OpenStreetMap railway geospatial data used as supplementary spatial context.
- **Firebase Realtime Database**: Actively connected and syncing live data in real time.
- **Indian Railways Enterprise Systems (TMS/COA/SMMS/TDMS)**: Modeled as high-fidelity prototype adapters with authentic schema fields adhering to Indian Railways Indian Railway Permanent Way Manual (IRPWM) and General & Subsidiary Rules (G&SR).
