# Swiggy Unified Recovery — Resolve + Rescue

> Proactive order recovery (Rescue) and transparent dispute resolution (Resolve) prototype.

## Quick Start

### 1. Prerequisites
- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm@9`)
- Docker Desktop (for Postgres + Redis)

### 2. Start infrastructure
```bash
docker compose up -d
```

### 3. Install dependencies
```bash
pnpm install
```

### 4. Configure environment
```bash
cp .env.example .env
# Defaults work out-of-the-box with docker-compose
```

### 5. Migrate and seed database
```bash
pnpm db:migrate
pnpm db:seed
```

### 6. Start all services
```bash
pnpm dev
```

Open **http://localhost:3000** to access the app.

---

## Demo users

| Role | Phone | OTP |
|------|-------|-----|
| Customer (Arjun Mehta) | 9000000001 | 1234 |
| Restaurant (Spice Garden) | 9000000002 | 1234 |
| Rider (Ravi Kumar) | 9000000003 | 1234 |
| Agent (Priya Sharma) | 9000000004 | 1234 |

---

## Demo flows

### Rescue (F1) — Proactive delay recovery
1. Log in as **Customer** → `/track`
2. Use simulator panel → inject a fault (e.g. "🛵 Rider stuck")
3. Rescue bottom sheet appears with 3 options (Wait+credit / Replace / Cancel)
4. Choose one → ledger entry written, customer notified

### Resolve (F2-F3) — Transparent dispute resolution
1. Log in as **Customer** → tap "Report issue"
2. Select issue type → add evidence (photo or item selection)
3. Preview exact entitlement (₹ amount + destination) **before committing**
4. Accept automated resolution → or escalate to agent

### Agent console (F5)
1. Log in as **Agent** → `/agent`
2. Escalated cases appear in real-time in the queue
3. Open a case → view engine decision + rule trace + ledger history
4. Take action: Approve / Custom refund / Reject with reason code

### Partner views (F4)
1. Log in as **Restaurant** → `/partner/restaurant`
2. See active orders with health state; confirm packing time
3. Log in as **Rider** → `/partner/rider`
4. See delivery tasks; accept reassignments

---

## Architecture

```
apps/web          Next.js 14 App Router (customer, partner, agent UIs)
services/api      NestJS modular monolith (auth, orders, health, rescue, resolve, ledger, agent, partners, simulator, realtime)
packages/types    Single source of truth for domain types + socket events
packages/engines  Pure TS engines — TriggerEngine, FairnessEngine, Matcher
```

## Key constraints

- All money in **integer paise** — no floats anywhere
- Ledger is **append-only** — never update/delete entries
- **No auto-execute** — every rescue/resolve action requires explicit customer choice
- Server-side **role checks** on every protected endpoint (never rely on UI hiding)
- Evidence stored as **URL** — never inline base64
- ₹ formatting **only** in `apps/web/src/lib/format.ts`

## Running tests

```bash
pnpm test
# or just the engines (≥95% coverage required):
pnpm --filter @swiggy/engines test
```

## Project structure

See `docs/ARCHITECTURE.md` for the full module layout and data flow.
