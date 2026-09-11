# Rail Samnvay — Security & Role-Based Access Control (RBAC)

## 1. Core Security Model

Rail Samnvay enforces a strict, government-grade **Two-Tier Security Architecture**:
1. **Client-Side Presentation Guards**: Hides unauthorized navigation tabs, action buttons, and modal dialogs based on user permissions.
2. **Server-Side Enforcement Guards**: Rejects any state-altering request if the caller's session token or role does not possess the requisite authority.

---

## 2. User Roles & Authority Matrix

| Role | Operational Title | Key Permissions | Authorize Blocks? | Delete Blocks? |
| :--- | :--- | :--- | :---: | :---: |
| **MASTER** | Principal Chief Operations Manager (PCOM) | Full system administration, emergency overrides, cross-department arbitration | **YES** | **YES (Exclusive)** |
| **Planning Officer** | Senior Divisional Operations Manager (Planning) | Requisition approval, candidate window bundling, planning engine execution | **YES** | **NO** |
| **COA / Operations** | Chief Controller / Section Controller (BZA) | Dynamic train conflict resolution, caution orders, block grant & release | **YES** | **NO** |
| **P.Way Engineer** | Senior Section Engineer (Permanent Way) | Track maintenance requisition creation, muster certification | **NO** | **NO** |
| **TRD Engineer** | Senior Section Engineer (Traction Distribution) | 25kV OHE isolation requisition, power restoration certification | **NO** | **NO** |
| **S&T Engineer** | Senior Section Engineer (Signal & Telecom) | Signal & point disconnection requisition, interlocking testing | **NO** | **NO** |

---

## 3. Strict Safety Invariants Enforced in Code

### Invariant 1: Creator Cannot Approve Own Request
- **File**: `server/routes/requests.ts` (L55-L65)
- **Rule**: If `requesterName === sessionUser.name` and target status is `Approved`, the backend returns `HTTP 403 Forbidden` (`CREATOR_CANNOT_APPROVE`).
- **Rationale**: Prevents a field supervisor from unilaterally authorizing their own track possession without independent operational oversight.

### Invariant 2: Field Engineers Cannot Grant Track Possessions
- **File**: `server/routes/requests.ts` (L67-L77)
- **Rule**: Requisitions cannot be transitioned to `Scheduled`, `Block Started`, or `Block Released` by engineering field roles (`P.Way`, `TRD`, `S&T`).
- **Rationale**: In accordance with G&SR Chapter XV, only Operating Control (Section Controller) or authorized Planning Officers hold the authority to stop train movements.

### Invariant 3: Master-Only Maintenance Block Deletion
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
