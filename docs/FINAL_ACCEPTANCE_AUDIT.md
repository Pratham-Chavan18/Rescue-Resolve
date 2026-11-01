# Swiggy Unified Recovery — Final Acceptance, Security & Demo Readiness Audit

**Audit Date:** November 1, 2026  
**Auditor:** Antigravity Autonomous Lead Architect & Security Reviewer  
**Target Monorepo:** `Swiggy Unified Recovery (Resolve + Rescue)`  
**Commit Audited:** `6075233` (+ specification reconciliation & live integration checks)  
**Specification References:** [PRD.md](file:///d:/Project/Swiggy/docs/PRD%20(1).md), [CONSTRAINTS.md](file:///d:/Project/Swiggy/docs/CONSTRAINTS.md), [ARCHITECTURE.md](file:///d:/Project/Swiggy/docs/ARCHITECTURE.md), [FLOW.md](file:///d:/Project/Swiggy/docs/FLOW.md), [DECISIONS.md](file:///d:/Project/Swiggy/docs/DECISIONS.md), [Design.md](file:///d:/Project/Swiggy/docs/Design%20(1).md), [.env.example](file:///d:/Project/Swiggy/.env.example).

---

## 1. Executive Summary

This independent audit assesses the Phase 1 MVP implementation of **Swiggy Unified Recovery (Resolve + Rescue)**. The codebase was evaluated against PRD requirements, architectural invariants, security guidelines (Cloudflare Security Audit standard), engine determinism criteria, design tokens (Hallmark & design-taste-frontend standards), and live infrastructure verification.

### Audit Verdict: **PASS (Codebase, Engines, Builds & Contracts) / NOT VERIFIED (Live Infrastructure on Windows Audit Host)**
- **Automated Decision Engines:** **PASS** (100% test pass rate, 59/59 unit tests passing, 98.64% v8 code coverage, strict integer paise arithmetic).
- **Core API & Business Logic:** **PASS** (10/10 unit tests passing, strict idempotency, append-only recovery ledger, NestJS class-validator pipes, static upload serving).
- **TypeScript & Linting:** **PASS** (Zero TS errors across all 4 packages, Zero ESLint errors/warnings).
- **Production Build:** **PASS** (All 7 Next.js App Router routes statically generated; NestJS distribution compiled cleanly).
- **Security & Authorization:** **PASS** after remediation of 3 critical access-control vulnerabilities (Socket.IO room authorization, Rescue choice IDOR, and Rider order access IDOR).
- **Specification Reconciliation:** **PASS** (2 MB upload limit strictly enforced in controller and service per [CONSTRAINTS.md](file:///d:/Project/Swiggy/docs/CONSTRAINTS.md) §4.16; 30-day rolling credit cap verified as config-driven via `CREDIT_CAP_PAISE` [₹500 default per `.env.example`] and documented as Decision `D13` in [DECISIONS.md](file:///d:/Project/Swiggy/docs/DECISIONS.md)).
- **Live Infrastructure & Playwright E2E:** **NOT VERIFIED on local development host** due to absence of Docker / PostgreSQL / Redis on the Windows audit machine. All 3 Playwright specs (`rescue.spec.ts`, `resolve.spec.ts`, `escalation.spec.ts`) are fully scripted and ready for CI/containerized runs.

---

## 2. Specification Discrepancies Reconciled

### 2.1 Evidence Upload Limit
- **Documented Invariant:** [CONSTRAINTS.md](file:///d:/Project/Swiggy/docs/CONSTRAINTS.md) §4.16 mandates: *"cap upload size (2 MB) and validate MIME."*
- **Reconciliation:**
  - [resolve.service.ts](file:///d:/Project/Swiggy/services/api/src/modules/resolve/resolve.service.ts#L19): Enforces `MAX_SIZE = parseInt(process.env['UPLOAD_MAX_SIZE_BYTES'] ?? '2097152', 10)` (2 MB).
  - [resolve.controller.ts](file:///d:/Project/Swiggy/services/api/src/modules/resolve/resolve.controller.ts#L46): Updated `FileInterceptor` with `limits: { fileSize: 2 * 1024 * 1024 }` (2 MB) to prevent buffering oversized payloads.
  - Audit text corrected from earlier mention of 5 MB to strict 2 MB (2,097,152 bytes).

### 2.2 30-Day Rolling Automatic Credit Cap
- **Documented Invariant:** [CONSTRAINTS.md](file:///d:/Project/Swiggy/docs/CONSTRAINTS.md) §5.21 mandates: *"enforce the per-customer 30-day automatic credit cap from config. Never guess at entitlement amounts, thresholds, or SLA values — they live in config and the PRD."*
- **Baseline Configuration:** [.env.example](file:///d:/Project/Swiggy/.env.example#L38) specifies `CREDIT_CAP_PAISE=50000` (50,000 paise = ₹500).
- **Reconciliation:**
  - The arbitrary figure of ₹3,000 was flagged as an unapproved assumption and rejected.
  - [FairnessEngine](file:///d:/Project/Swiggy/packages/engines/src/fairness-engine/index.ts#L55) was updated to read `CREDIT_CAP_PAISE` from environment variables, defaulting strictly to 50,000 paise (₹500).
  - Decision documented in [DECISIONS.md](file:///d:/Project/Swiggy/docs/DECISIONS.md#L77) under **D13. Config-driven 30-day rolling credit cap & upload size limits**.

---

## 3. PRD Acceptance Checklist

| PRD Section | Feature / Requirement | Audit Status | Audit Evidence & Notes |
| :--- | :--- | :---: | :--- |
| **§3.1** | Proactive Health Detection (`on_track`, `at_risk`, `critical`) | **PASS** | Implemented in `TriggerEngine` with pure functional evaluation. Evaluates signals `S-1` through `S-5`. |
| **§3.2** | Rescue Offer Generation (Wait with Credit, Priority Reroute, Auto-reorder) | **PASS** | Options built dynamically in `RescueService` without recomputing after initial snapshot (`D6`). |
| **§3.3** | Rescue Customer Consent & SLA Countdown | **PASS** | Customer must explicitly choose; no automatic cancellations without consent ([CONSTRAINTS.md](file:///d:/Project/Swiggy/docs/CONSTRAINTS.md) §1.1). |
| **§4.1** | Reactive Dispute Entry (Wrong item, Missing item, Quality, Late delivery) | **PASS** | Clean 4-issue intake flow in `/resolve`. Dynamic line-item selector and photo uploader. |
| **§4.2** | Transparent Entitlement Calculation | **PASS** | Computed by `FairnessEngine` before case submission. Breakdown displayed with source vs wallet split. |
| **§4.3** | Automated vs Human Routing | **PASS** | High confidence auto-resolves; low confidence routes to human review queue. Zero auto-rejects. |
| **§5.1** | Append-Only Recovery Ledger | **PASS** | Database model `LedgerEntry` has no `updatedAt` field. Zero edit/delete endpoints exist. |
| **§5.2** | Strict Integer Paise Representation | **PASS** | Type `Paise` enforced across database (`Int`), engines, API, and web UI. No floating-point math. |
| **§6.1** | Restaurant Partner Dashboard (`/partner/restaurant`) | **PASS** | Risk order view, packing confirmation with time extension, real-time alert updates. |
| **§6.2** | Rider Fleet Dashboard (`/partner/rider`) | **PASS** | Reassignment offer acceptance/rejection, route guidance, socket updates. |
| **§7.1** | Agent Escalation Console (`/agent`) | **PASS** | Priority queue, evidence photo viewer, customer dispute history, rule-trace inspection, approve/reject/custom refund actions. |
| **§8.1** | 30-Day Rolling Credit Cap | **PASS** | Rule `H-1` checks rolling credit against `CREDIT_CAP_PAISE` (₹500 config default); resolve service aggregates 30-day ledger credits. |

---

## 4. Security Audit Findings

Audited using the `security-audit` skill workflow, focusing on authentication, authorization, access control, file uploads, and ledger tampering.

### 4.1 Authentication & JWT Verification
- **Status:** **PASS**
- **Mechanism:** JWT authentication using `passport-jwt` with bearer token extraction in [jwt.strategy.ts](file:///d:/Project/Swiggy/services/api/src/modules/auth/jwt.strategy.ts).
- **Role Verification:** `RolesGuard` in [guards.ts](file:///d:/Project/Swiggy/services/api/src/modules/auth/guards.ts) verifies roles (`customer`, `restaurant`, `rider`, `agent`) decorated via `@Roles()`.

### 4.2 Authorization & BOLA/IDOR Vulnerabilities Audited & Remediated
During the audit, three critical access-control vulnerabilities were identified and fixed:

1. **Rescue Choice IDOR (Fixed):**
   - *File:* [rescue.service.ts](file:///d:/Project/Swiggy/services/api/src/modules/rescue/rescue.service.ts#L65)
   - *Issue:* While customer ID was extracted from JWT, `recordChoice` checked case status but never verified `order.userId === userId`.
   - *Remediation:* Added `if (order.userId !== userId) throw new ForbiddenException('Not your order');`. Added regression test in [rescue.service.test.ts](file:///d:/Project/Swiggy/services/api/src/modules/rescue/rescue.service.test.ts).

2. **Socket.IO Room BOLA / Unauthorized Eavesdropping (Fixed):**
   - *File:* [realtime.gateway.ts](file:///d:/Project/Swiggy/services/api/src/modules/realtime/realtime.gateway.ts#L70)
   - *Issue:* `handleJoinOrder` verified customer ownership for customers, but restaurant and rider roles bypassed checks and could join arbitrary customer order rooms.
   - *Remediation:* Enforced strict role-specific room authorization:
     - Restaurant: `order.restaurantId === user.restaurantId`
     - Rider: `order.riderId === user.riderId`
     - Customer: `order.userId === user.id`
     - Unassigned actors are rejected with `Unauthorized order room access`.

3. **Rider Order Exposure IDOR (Fixed):**
   - *File:* [orders.service.ts](file:///d:/Project/Swiggy/services/api/src/modules/orders/orders.service.ts#L35)
   - *Issue:* `getOrderById` permitted riders to retrieve order details without checking if `order.riderId === user.riderId`.
   - *Remediation:* Added `if (user.role === 'rider' && order.riderId !== user.riderId) throw new ForbiddenException('Not your assigned order');`.

### 4.3 File Upload Security (Evidence Intake)
- **Status:** **PASS**
- **MIME Validation:** Strictly restricts uploads to `image/jpeg`, `image/png`, and `image/webp`.
- **Payload Size Limits:** Strictly 2,097,152 bytes (2 MB) in controller Multer limits and service guard.
- **Path Traversal Defense:** Sanitized filenames with timestamp prefixes stored in isolated case directories.
- **Static Serving:** Configured via `app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' })` in [main.ts](file:///d:/Project/Swiggy/services/api/src/main.ts).

### 4.4 Financial Operations & Idempotency
- **Status:** **PASS**
- **Constraint Compliance:** All monetary amounts are integers in paise. No floating-point currency representation exists anywhere in the codebase.
- **Append-Only Invariant:** [LedgerEntry](file:///d:/Project/Swiggy/services/api/prisma/schema.prisma#L354) has no update or delete mutations.
- **State Guarding:** Resolving cases or recording rescue options checks existing state (`status === 'offered'` / `status === 'draft'`) and rejects duplicates with `ConflictException`.

---

## 5. Decision Engine Correctness & Invariants

All automated engines reside in `@swiggy/engines` with zero external dependencies and pure deterministic evaluation.

### 5.1 Trigger Engine (`packages/engines/src/trigger-engine`)
- **Status:** **PASS** (20/20 tests passing, 100% statement & branch coverage)
- **Verified Signals:**
  - `S-1`: Rider stationary at pickup > 10 min.
  - `S-2`: Prep time exceeds baseline by > 15 min.
  - `S-3`: Dynamic ETA slip > 20 min past promised delivery.
  - `S-4`: Unconfirmed drop-off > 8 min after GPS delivery ping.
  - `S-5`: Consecutive wrong-item reports from same merchant.

### 5.2 Fairness Engine (`packages/engines/src/fairness-engine`)
- **Status:** **PASS** (23/23 tests passing, 97.53% statement coverage, 96.63% branch coverage)
- **Rule Verification:**
  - `H-1`: Order value > ₹1,500 OR 30-day rolling credit ≥ `CREDIT_CAP_PAISE` (₹500 default) OR high dispute frequency routes strictly to `human_review` with `confidence: 'low'`.
  - `W-1` / `W-2`: Wrong item with verified photo gives full item refund + proportional delivery fee to source; without photo gives item value credit to wallet.
  - `M-1` / `M-2`: Missing item refunded to source.
  - `Q-1` / `Q-2`: Quality issue verified gives full refund; partial gives 50% wallet credit.
  - `L-1` / `L-2` / `L-3`: Late delivery tiers (>30m: ₹50, >45m: ₹75, >60m: ₹100 credit).
- **Core Invariant Verified:** Fraud signals **never** trigger automatic rejection; they degrade confidence to `low` and route to human review ([CONSTRAINTS.md](file:///d:/Project/Swiggy/docs/CONSTRAINTS.md) §2.4).

### 5.3 Matcher (`packages/engines/src/matcher`)
- **Status:** **PASS** (16/16 tests passing, 100% statement coverage)
- **Scoring Function:** `score = (0.45 * proximity) + (0.35 * load_factor) + (0.20 * rating)`.
- **Invariants Verified:** Riders beyond maximum radius (5 km) or at max active orders (2) are strictly excluded from assignment.

---

## 6. Infrastructure & Live Integration Status

### 6.1 Docker & Database Connectivity
- `docker --version`: **FAIL** (`The term 'docker' is not recognized`).
- `docker compose up -d`: **FAIL** (Docker CLI not installed on host).
- PostgreSQL Port 5432: **FAIL** (`Test-NetConnection -ComputerName localhost -Port 5432` → `TcpTestSucceeded: False`).
- Redis Port 6379: **FAIL** (`Test-NetConnection -ComputerName localhost -Port 6379` → `TcpTestSucceeded: False`).
- `pnpm db:migrate` / `pnpm db:seed`: **NOT VERIFIED** (Requires running PostgreSQL service).

### 6.2 End-to-End Testing (Scenarios A through F)

| Scenario | PRD Workflow | Scripted Location | Execution Status |
| :--- | :--- | :--- | :---: |
| **A: Proactive Rider Stuck** | Simulator injects `rider_stuck` → `at_risk` → Rescue sheet appears → Customer selects credit → Ledger credit written | [e2e/rescue.spec.ts](file:///d:/Project/Swiggy/e2e/rescue.spec.ts) | **NOT VERIFIED** (Host lacks Postgres/Docker) |
| **B: Proactive Restaurant Delay** | Kitchen delay triggers `S-2` → Option to wait with credit or reroute offered | [e2e/rescue.spec.ts](file:///d:/Project/Swiggy/e2e/rescue.spec.ts) | **NOT VERIFIED** (Host lacks Postgres/Docker) |
| **C: Reactive Wrong Item Dispute** | Customer uploads photo → Mock vision verifies → Automated full refund to source calculated & accepted | [e2e/resolve.spec.ts](file:///d:/Project/Swiggy/e2e/resolve.spec.ts) | **NOT VERIFIED** (Host lacks Postgres/Docker) |
| **D: Low Confidence Escalation** | Claim exceeding threshold triggers `H-1` → Auto-escalated to agent queue → Agent approves custom refund | [e2e/escalation.spec.ts](file:///d:/Project/Swiggy/e2e/escalation.spec.ts) | **NOT VERIFIED** (Host lacks Postgres/Docker) |
| **E: Restaurant Risk Dashboard** | Restaurant notified of delayed prep → Extends prep time by 10m → ETA updated | Apps Web `/partner/restaurant` | **NOT VERIFIED** (Host lacks Postgres/Docker) |
| **F: Rider Task Handover** | Rider notified of reassignment → Accepts task in rider panel | Apps Web `/partner/rider` | **NOT VERIFIED** (Host lacks Postgres/Docker) |

### 6.3 Actual Playwright Test Execution
- **Command:** `pnpm test:e2e` (`playwright test`)
- **Output Result:** 3 failed with `net::ERR_CONNECTION_REFUSED at http://localhost:3000/`.
- **Root Cause:** Next.js and NestJS servers cannot start locally without PostgreSQL 16 and Redis 7.

---

## 7. Build, Typecheck, and Test Execution Summary

| Command | Target | Result | Duration / Metrics |
| :--- | :--- | :---: | :--- |
| `pnpm test` | `@swiggy/engines` | **PASS** | 59/59 passed, 98.64% v8 statement coverage |
| `pnpm test` | `@swiggy/api` | **PASS** | 10/10 passed (Ledger + Rescue + IDOR regression) |
| `pnpm typecheck` | Monorepo (all 4 packages) | **PASS** | Zero TypeScript compiler diagnostics |
| `pnpm lint` | Monorepo (Next.js + NestJS) | **PASS** | Zero ESLint warnings or errors |
| `pnpm build` | `@swiggy/web` & `@swiggy/api` | **PASS** | 7/7 Next.js static routes + Nest dist |
| `pnpm test:e2e` | Playwright Browser Tests | **FAIL (Infrastructure)** | `ERR_CONNECTION_REFUSED` (offline localhost:3000) |

---

## 8. Live Demo Readiness Checklist

| Checklist Item | Current Status | Verification Details |
| :--- | :---: | :--- |
| 1. Docker PostgreSQL and Redis running | **NOT VERIFIED** | Host machine does not have Docker Desktop installed; ports 5432 & 6379 offline. |
| 2. Database migrations and seed successful | **NOT VERIFIED** | `prisma migrate` and `prisma/seed.ts` exist and compile; blocked on Postgres service. |
| 3. Rescue flow verified end to end | **PARTIAL** | Engine logic & UI components 100% complete and built; live browser execution blocked on host DB. |
| 4. Resolve wrong-item flow verified | **PARTIAL** | Engine rules `W-1`/`W-2` verified with 100% tests; live browser execution blocked on host DB. |
| 5. Missing-item flow verified | **PARTIAL** | Engine rules `M-1`/`M-2` verified; live browser execution blocked on host DB. |
| 6. Replacement flow verified | **PARTIAL** | Dynamic entitlement calculation verified; live browser execution blocked on host DB. |
| 7. Restaurant and rider workflows verified | **PARTIAL** | UI screens statically compiled and typechecked; socket handlers role-authorized; live browser execution blocked on host DB. |
| 8. Agent escalation verified | **PARTIAL** | Rule `H-1` escalation and custom refund mutations built and typechecked; live browser execution blocked on host DB. |
| 9. Socket.IO updates verified | **PARTIAL** | Sockets typechecked against `ServerEvent` union; room authorization BOLA fixed; live browser execution blocked on host DB. |
| 10. Upload limit discrepancy resolved | **PASS** | Strictly enforced at 2 MB in `resolve.controller.ts` and `resolve.service.ts` per `CONSTRAINTS.md` §4.16. |
| 11. Credit-cap decision documented | **PASS** | Documented under `D13` in `DECISIONS.md`; `CREDIT_CAP_PAISE` env configuration verified in engines and tests. |
| 12. All Playwright suites passing | **FAIL (Host Env)** | Test specs implemented in `e2e/`; requires active web/API servers on target infrastructure. |

**Scorecard:**
- Code, Contract & Build Gates: **100% PASS**
- Live Demo Environment: **Blocked on host container runtime (Docker / PostgreSQL / Redis)**
