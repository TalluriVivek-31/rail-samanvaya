# Rail Samanvaya — AI-Powered Railway Maintenance Block Planning & Coordination Platform
### Indian Railways • Operations Command & Digital Twin Center

---

> [!IMPORTANT]
> **ENVIRONMENT MODE: SIMULATION DATA**
> Rail Samanvaya runs with simulated railway infrastructure and train movement telemetry. **No external railway API keys or network dependencies are required.**

---

## 1. Vision & Control Room Aesthetic

Rail Samanvaya is an **AI-assisted railway maintenance block planning and coordination platform** designed for Indian Railways. Built with a **modern mission control & digital twin aesthetic**, it eschews generic SaaS dashboards in favor of a technical, high-contrast control room environment.

```text
┌────────────────────────────────────────────────────────────────────────┐
│ TOP COMMAND BAR: Rail Samanvaya | AI BLOCK PLANNING | 10 SEP 2026 | ...│
├────────────┬───────────────────────────────────────────────────────────┤
│            │                                                           │
│ SIDEBAR    │ MAIN OPERATIONS AREA:                                     │
│ 1. Overview│ • Overview (4 KPIs + 3D Twin + Layer Controls + Drawer)   │
│ 2. Requests│ • Block Requests (Table + Multi-Filters + Create Request) │
│ 3. Approval│ • Approval Queue (Concurrence matrix + RBAC check)        │
│ 4. Planning│ • AI Planning (Animated Solver + 5 Factors + Gantt)       │
│ 5. Conflict│ • Conflict Monitor (Conflict Alert + Recommendation)      │
│ 6. Execute │ • Execution Tracker (6-step lifecycle with timestamps)    │
│ 7. Audit   │ • Audit Trail (Immutable event log)                       │
│            │                                                           │
│ Role Switch│                                                           │
└────────────┴───────────────────────────────────────────────────────────┘
```

---

## 2. Palette & Design Specifications

### Restrained Professional Palette
* **Primary Background**: `#07111F`
* **Secondary Background**: `#0B1726`
* **Surface**: `#101F31`
* **Elevated Surface**: `#14263A`
* **Railway Accents**:
  * Railway Red: `#D83A3A` (Critical / Conflicts / Blocked)
  * Signal Green: `#27C77A` (Approved / Clear / On Time)
  * Amber Warning: `#F4B740` (Caution / Planning / Buffers)
  * Electric Blue: `#3B82F6` (Operational Focus / Actions)
  * Cyan: `#22D3EE` (Telemetry / AI Recommendations / Digital Twin)
* **Text**:
  * Primary: `#F4F7FA`
  * Secondary: `#A9B7C7`
  * Muted: `#657589`

---

## 3. Core Modules & Pages

### 1. Operations Overview (Section 6 & 7)
* **4 Operational KPI Cards**:
  1. `Pending Requests`: **12** (*4 high priority*)
  2. `Approved Blocks`: **08** (*Next 7 days*)
  3. `Available Windows`: **28** (*Across active corridors*)
  4. `Active Conflicts`: **02** (*Express train overlap alert*)
* **3D Railway Digital Twin**:
  * Parallel UP, DN, and loop tracks with metallic steel rails and concrete ballast.
  * Stations (Sections C1, C2, C3), signal posts with active aspects (Green, Amber, Red), catenary OHE wires, moving passenger and freight trains.
  * Interactive section hover tooltip: `SECTION C1`, `KM 214/3 – KM 217/8`, `Traffic: HIGH`, `Current status: Available`.
  * Click-to-inspect section slide-over drawer with TSR status and approaching train ETAs.
  * Layer toggles: `☑ Tracks`, `☑ Trains`, `☑ Signals`, `☑ OHE`, `☑ Maintenance blocks`.

### 2. Maintenance Block Requests (Section 8 & 9)
* Filter controls: Department (`P.Way`, `S&T`, `TRD`), Priority (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), Section (`C1`, `C2`, `C3`), Status (`Pending`, `Approved`, `Planning`, `Completed`).
* Operational table: Sample requests (`BR-1024`, `BR-1025`, `BR-1026`, etc.).
* Standardized **Create Block Request** form with instant submission to the approval queue.

### 3. Approval Command Center (Section 10)
* Visual lifecycle flow: `REQUESTED → REVIEW → APPROVED → PLANNING`.
* Multi-role review cards with actions: `APPROVE`, `REJECT`, `RETURN FOR REVISION`.
* **Strict RBAC Rule**: The request creator can never approve their own request! Requires review by MASTER or Planning Officer.

### 4. AI Block Planner & Priority Engine (Sections 11, 12, 13)
* Planning control panel: Planning period, corridor, departments, concurrent blocks, safety buffer.
* `GENERATE OPTIMAL PLAN` with animated multi-stage solver:
  * *Analyzing timetable...*
  * *Checking corridor availability...*
  * *Resolving maintenance conflicts...*
  * *Optimizing asset availability...*
  * *OPTIMAL PLAN GENERATED*
* **Explainable Priority Model** with 5 weighted factors:
  $$\text{Priority} = 0.35 \times \text{Criticality} + 0.25 \times \text{Urgency} + 0.20 \times \text{Risk} + 0.10 \times \text{Traffic Impact} + 0.10 \times \text{Resource Availability}$$
* **Gantt Planning Timeline** across 06:00 to 18:00 with prominent **15-minute safety buffers** rendered before and after maintenance possessions.

### 5. Conflict Monitor (Section 14)
* Dedicated operational conflict detection: `BR-1026` TRD OHE Maintenance vs Express train `12627 Karnataka Express` on Section `C1` at 14:30 – 16:30.
* AI recommendation: *"Move block to 16:45 – 18:45"*.
* Action buttons: `ACCEPT RECOMMENDATION` (actively shifts window and resolves conflict) and `VIEW ALTERNATIVES`.

### 6. 6-Step Execution Tracker (Section 15)
* Step 01: `Request Approved` (Completed)
* Step 02: `Block Granted` (Completed)
* Step 03: `Safety Protection` (Current live possession — Detonators & flags confirmed)
* Step 04: `Maintenance Started`
* Step 05: `Maintenance Completed`
* Step 06: `Block Released`
* Interactive progression with timestamps and field officer confirmations.

### 7. Immutable Dispatch Audit Trail (Section 16)
* Chronological event timeline recording timestamp, user, role, action, request ID, and status.

### 8. Role System & Professional Railway Login (Sections 21 & 22)
* Roles: `MASTER`, `Planning Officer`, `COA / Operations`, `P.Way Engineer`, `S&T Engineer`, `TRD Engineer`.
* Role switcher in top bar + dedicated Railway Operations Login modal with employee ID and password authentication.

---

## 4. Running the Platform

### Prerequisites
* Node.js (v18 or higher; tested on Node.js v24)
* npm (v9 or higher)

### Commands
```bash
# In the project workspace
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```

Open `http://localhost:5173` in your browser.
