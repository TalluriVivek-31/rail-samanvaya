# Rail Samnvay — Security & Role-Based Access Control (RBAC)

## 1. Core Security Model

Rail Samnvay enforces a strict, government-grade **Two-Tier Security Architecture**:
1. **Client-Side Presentation Guards**: Hides unauthorized navigation tabs, action buttons, and modal dialogs based on user permissions.
2. **Server-Side Enforcement Guards**: Rejects any state-altering request if the caller's session token or role does not possess the requisite authority.

---

> [!IMPORTANT]
> **Railway Operational Authority Notice:**  
> **"Rail Samnvay models an Authorized Operating / Control Authority for operational validation and block authorization. The exact competent authority and workflow can vary by block type, division and applicable railway operating rules."**

---

## 2. User Roles & Authority Matrix

| Role | Operational Title | Key Permissions | Authorize Blocks? | Delete Blocks? |
| :--- | :--- | :--- | :---: | :---: |
| **MASTER** | Principal Chief Operations Manager (PCOM) / Prototype Admin | Prototype full system administration, emergency overrides, cross-department arbitration | **YES (`[Administrative Override]`)** | **YES (Exclusive)** |
| **Planning Officer** | Senior Divisional Operations Manager (Planning) | Requisition evaluation, technical isolation review, CPM activity network, CP-SAT optimization, recommendation generation (`sendToControl`) | **NO (Formulates Recommendation)** | **NO** |
| **COA / Operations** | Chief Train Controller / Section Controller (BZA) | **Authorized Operating / Control Authority**: Train conflict evaluation, caution orders, **Block Authorization & Scheduling**, Block Memo issuance, Block Started & Released | **YES (Operating Authority)** | **NO** |
| **P.Way Engineer** | Senior Section Engineer (Permanent Way) | Track maintenance requirement creation, chainage identification, muster certification | **NO** | **NO** |
| **TRD Engineer** | Senior Section Engineer (Traction Distribution) | 25kV OHE isolation requirement creation, power restoration certification | **NO** | **NO** |
| **S&T Engineer** | Senior Section Engineer (Signal & Telecom) | Signal & point disconnection requirement creation, interlocking testing | **NO** | **NO** |

---

## 3. Strict Safety Invariants Enforced in Code

### Invariant 1: Creator Cannot Approve Own Request
- **File**: `server/routes/requests.ts` (L55-L65) & `src/store/useSamnvayStore.ts`
- **Rule**: If `requesterName === sessionUser.name` and target status is `Approved`, the system returns `HTTP 403 Forbidden` (`SELF_APPROVAL_FORBIDDEN`).
- **Rationale**: Prevents a field supervisor from unilaterally authorizing their own track possession without independent operational oversight.

### Invariant 2: Operating Control Exclusively Authorizes & Schedules Possessions
- **File**: `server/routes/requests.ts` (L75-L105) & `src/store/useSamnvayStore.ts` (L1800-L1890)
- **Rule**: Requisitions can only be transitioned to `Scheduled` by the Authorized Operating / Control Authority (`COA / Operations`). Planning Officers formulate recommended windows and submit to Control (`sendToControl`); they cannot grant or schedule blocks. Maintenance field roles (`P.Way`, `TRD`, `S&T`) cannot authorize or schedule.
- **Rationale**: In accordance with G&SR Chapter XV, only Operating Control (Chief Train Controller / Section Controller) holds the authority to stop train movements and issue official Block Memos.

### Invariant 3: MASTER Actions Log Administrative Override
- **File**: `server/routes/requests.ts` (L90-L102) & `src/store/useSamnvayStore.ts` (L1815-L1885)
- **Rule**: If `MASTER` exercises administrative authority to directly authorize/schedule a block or override status, the system appends `[Administrative Override]` to the audit log and status remarks.
- **Rationale**: Clear non-repudiation distinguishing legitimate prototype superuser testing from standard operating control governance.

### Invariant 4: Master-Only Maintenance Block Deletion
- **File**: `src/store/useSamnvayStore.ts` (L1147-L1210)
- **Rule**: Only the `MASTER` role can permanently delete an active requisition or block.
- **Cascade**: Deletion automatically purges bundled block plans, live conflicts, and resets execution steps, while permanently appending an immutable record in the **Audit Trail**.

---

## 4. Credential & Environment Protection

- **No Secrets in Frontend Bundles**: External API keys (`RAILRADAR_API_KEY`) are accessed strictly through backend proxies (`server/services/railRadarService.ts`).
- **Environment Variables**:
  - `RAILRADAR_API_KEY`: External train tracking key (optional; system falls back to high-fidelity demo telemetry).
  - `PORT`: Server port (default: 3001).
- **Session Authentication**: Uses secure Bearer token headers validated on every mutation endpoint.
