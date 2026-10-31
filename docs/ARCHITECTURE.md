# ARCHITECTURE — Project Map

How the app is organized and how the parts connect. Read this before editing anything.

---

## 1. Shape

**Pnpm monorepo.** One Next.js frontend serves all four role surfaces; one NestJS modular monolith serves REST + WebSockets; domain logic lives in framework-free packages so it can be tested without HTTP and reused across modules.

```
├── apps/
│   └── web/                      # Next.js 14 (App Router) — ALL role UIs
│       ├── app/
│       │   ├── (customer)/       # home, order health, rescue flow, resolve flow, cases
│       │   │   ├── page.tsx                # home + live order card
│       │   │   ├── orders/[id]/page.tsx    # order detail + Order Health timeline
│       │   │   ├── orders/[id]/rescue/     # recovery choice → status
│       │   │   ├── orders/[id]/resolve/    # issue → evidence → checking → offer → done
│       │   │   └── cases/                  # my cases list + detail
│       │   ├── (partner)/restaurant/       # action panel queue
│       │   ├── (partner)/rider/            # task panel
│       │   ├── (agent)/agent/              # resolve console (queue + case pack)
│       │   └── login/
│       ├── components/           # ui/ (shadcn), health/, rescue/, resolve/, shared/
│       ├── lib/                  # api-client.ts, socket.ts, format.ts, demo-controls.tsx
│       └── stores/               # zustand: session, order-health, case drafts
├── services/
│   └── api/                      # NestJS modular monolith
│       ├── src/modules/
│       │   ├── auth/             # demo OTP → JWT, role guard
│       │   ├── orders/           # order CRUD, lifecycle events, ETA service
│       │   ├── health/           # Order Health aggregator (signal intake → state)
│       │   ├── rescue/           # recovery options, replacement matcher, choices
│       │   ├── resolve/          # claims, evidence, decisions, escalation
│       │   ├── ledger/           # recovery ledger (append-only)
│       │   ├── partners/         # restaurant + rider panels, reassignment
│       │   ├── agent/            # case queue, agent actions
│       │   ├── simulator/        # demo order simulator (see §5)
│       │   └── realtime/         # Socket.IO gateways, room auth, event fan-out
│       └── prisma/               # schema.prisma, migrations, seed.ts
├── packages/
│   ├── types/                    # SINGLE SOURCE OF TRUTH for domain types & events
│   └── engines/
│       ├── src/trigger-engine/   # Rescue rules: signals → health state → offer triggers
│       ├── src/fairness-engine/  # Resolve rules: claim + evidence → entitlement
│       └── src/matcher/          # replacement matching (cuisine/price/veg/feasibility)
└── docker-compose.yml            # postgres, redis, api, web
```

**Dependency direction (enforced):** `packages/types` ← everything · `packages/engines` ← `services/api` only · `apps/web` never imports NestJS code; it talks REST + sockets only. Engines import **nothing** from Nest — pure functions in, values out.

## 2. How frontend and backend connect

| Concern | Mechanism |
|---|---|
| Reads (orders, cases, queues) | REST via `lib/api-client.ts` + TanStack Query |
| Live updates (health state, ETA, new cases, reassignment) | Socket.IO rooms: `order:{id}`, `role:restaurant:{id}`, `role:rider:{id}`, `agent:queue` |
| Writes (choices, claims, agent actions) | REST mutations → API writes DB + ledger → emits socket events |
| Auth | `POST /auth/otp/verify` → JWT (role claim) → REST header + socket handshake token |

Sequence for any state change: **mutation → DB tx → ledger append (if compensation) → socket fan-out → UI invalidation.** The UI never patches state locally and hopes; it re-reads or consumes the socket event.

## 3. The two engines (heart of the product)

Both are **pure, deterministic, and exhaustive-unit-tested** (`packages/engines`, target ≥ 95% line coverage on decision tables). They take plain inputs and return a decision object + **rule trace** (which rule fired, why) — the trace is stored on the case and shown to agents.

- `TriggerEngine.evaluate(signals, thresholds, now) → { healthState, triggers[] }` — ETA slippage, pickup delay, pack delay, delivered-unconfirmed. Thresholds are config, not code.
- `FairnessEngine.decide(claim, evidence, order, history) → { confidence, outcome, lineItems[], total, destination, reason, ruleTrace[] }` — implements the PRD §5.3 decision matrix exactly, including the ₹1,500 human-review cap and late-delivery tiers.
- `Matcher.find(order, candidates) → replacement[]` — cuisine match, price band ±20%, veg/non-veg preservation, delivery feasibility (distance + prep load).

**Why this matters for editing:** rule changes happen *only* in engines + their tests. Never duplicate entitlement math in UI or API handlers.

## 4. Data model (Prisma — core entities)

```
User(id, phone, role, name, upiMasked)
Restaurant(id, name, cuisine, vegOnly, lat, lng, issueRate)
Rider(id, name, lat, lng, status)
Order(id, userId, restaurantId, riderId?, status, total, deliveryFee,
      promisedAt, deliveredAt?, address, createdAt)
OrderItem(id, orderId, name, price, qty, veg)
OrderEvent(id, orderId, type, payload, at)          # accepted/packed/assigned/pickup/gps/delivered
HealthSignal(id, orderId, kind, value, at)          # raw inputs to TriggerEngine
OrderHealth(id, orderId, state, etaAt, updatedAt)   # current evaluated state
RescueCase(id, orderId, trigger, optionsSnapshot, choice?, slaAt?, status)
ResolveCase(id, orderId, issue, evidenceJson, decision, confidence,
            status, agentId?, agentAction?, createdAt)
Evidence(id, caseId, kind, url, verdict?)
LedgerEntry(id, orderId, cause, actor, kind, amount, destination, note, at)  # append-only
Notification(id, userId, kind, payload, readAt?)
```

Money is integer **paise** everywhere; format to ₹ only at the edge (`lib/format.ts`).

## 5. The simulator (demo backbone)

There is no real Swiggy fleet, so `modules/simulator` drives orders through their lifecycle on a tick: emits `OrderEvent`s (accept → pack → assign → GPS pings → deliver), drifts ETAs, and exposes **demo controls** (`POST /sim/{orderId}/fault`, faults: `rider_stuck | restaurant_slow | eta_slip | delivered_unconfirmed | wrong_item`). Rescue triggers and Resolve intake both consume this same event stream — nothing in the product path is mocked except the world itself. The simulator is isolated behind `OrderEventBus` so a real event source could replace it without touching health/rescue/resolve.

## 6. Realtime event catalogue (packages/types)

```ts
type ServerEvent =
  | { t: 'health.changed'; orderId: string; state: HealthState; etaAt: string }
  | { t: 'rescue.offered'; orderId: string; caseId: string }
  | { t: 'rescue.updated'; caseId: string; status: string; slaAt?: string }
  | { t: 'partner.risk'; restaurantId: string; orderId: string; reason: string }
  | { t: 'rider.reassigned'; riderId: string; orderId: string; reason: string; protectedPayout: number }
  | { t: 'agent.case.new'; caseId: string }
  | { t: 'case.updated'; caseId: string; status: string }
```

## 7. Where things live (quick index)

| You want to change… | Go to |
|---|---|
| A refund amount or rule | `packages/engines/src/fairness-engine` + its tests |
| When Rescue fires | `packages/engines/src/trigger-engine` (thresholds in `services/api/src/config`) |
| Replacement suggestions | `packages/engines/src/matcher` |
| A screen or copy | `apps/web/app/...` + `Design.md` tokens |
| DB fields | `services/api/prisma/schema.prisma` → migrate → update `packages/types` |
| A socket event | `packages/types` first, then `modules/realtime` fan-out |
| Auth or roles | `services/api/src/modules/auth` (see CONSTRAINTS — approval needed) |
