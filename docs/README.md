# Swiggy Unified Recovery — Resolve + Rescue

A single Swiggy application that fixes the two moments where food delivery breaks trust:

- **Swiggy Rescue** — *before delivery*: watches every live order with an **Order Health timeline**, detects orders going late/stuck/failing, and proactively offers the customer a managed recovery: **wait with credit, one-tap replacement, or full refund** — before they ever contact support.
- **Swiggy Resolve** — *after delivery*: replaces the generic help chatbot with a guided, **evidence-first** dispute flow (wrong / missing / quality / late) that produces a **transparent, instant entitlement** for high-confidence cases and escalates the rest to a human agent **with a complete case pack**.

Both features share one **Recovery Ledger** (who caused the failure — restaurant, logistics, customer, platform) so compensation is fair and auditable across all four roles: **customer, restaurant partner, delivery partner, support agent**.

> This repository is a **product prototype / demo build**: Swiggy's real backend does not exist here, so an **Order Simulator** emits realistic lifecycle events (accept, pack, rider assignment, GPS pings, ETA drift) that drive both Rescue triggers and Resolve flows end to end.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query · Zustand |
| Realtime | Socket.IO (order-health timeline, partner panels, agent queue) |
| Backend | NestJS (modular monolith) · TypeScript · REST + WebSocket gateways |
| Data | PostgreSQL · Prisma ORM · Redis (health-signal state, pub/sub) |
| Domain engines | Pure-function TypeScript modules: `TriggerEngine` (Rescue), `FairnessEngine` (Resolve) — framework-free and unit-tested |
| Image verification | `ImageVerificationProvider` interface · `MockVisionProvider` in MVP (pluggable real model later) |
| Demo auth | Phone + fixed OTP per role, JWT session, role switcher (customer / restaurant / rider / agent) |
| Testing | Vitest + Testing Library (unit) · Playwright (e2e) |
| Infra | Docker Compose (app, Postgres, Redis) |

See `DECISIONS.md` for why each choice was made and what was rejected.

---

## Repository layout (top level)

```
├── README.md            ← you are here
├── PRD.md               ← product requirements: personas, stories, scope, metrics
├── Design.md            ← design system + screen-by-screen UX spec
├── ARCHITECTURE.md      ← project map: modules, data flow, schema
├── CONSTRAINTS.md       ← rules the AI agent must follow when editing
├── FLOW.md              ← step-by-step walkthroughs of the critical flows
├── DECISIONS.md         ← technical decisions and their reasoning
├── apps/web             ← Next.js app (all four role surfaces)
├── services/api         ← NestJS backend
├── packages/engines     ← TriggerEngine + FairnessEngine (pure TS)
├── packages/types       ← shared domain types (single source of truth)
└── docker-compose.yml
```

## Setup

```bash
# 1. prerequisites: Node 20+, pnpm 9+, Docker
pnpm install

# 2. environment
cp .env.example .env        # defaults work out of the box

# 3. infrastructure + database
docker compose up -d postgres redis
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed   # demo restaurants, menu, users, one live order
```

## Run

```bash
pnpm dev                   # web on :3000, api on :4000, sockets on :4000/ws
```

Demo logins (fixed OTP `1234`):

| Role | Phone | Lands on |
|---|---|---|
| Customer | `90000 00001` | Home → live order with Order Health timeline |
| Restaurant | `90000 00002` | Partner action panel |
| Rider | `90000 00003` | Delivery task panel |
| Support agent | `90000 00004` | Resolve case queue |

To see Rescue fire without waiting: **Demo controls** (bottom-right, customer role) → "Simulate: rider stuck" / "Simulate: restaurant slow" / "Simulate: ETA +25 min".

## Test

```bash
pnpm test                  # unit: engines, entitlement math, API
pnpm test:e2e              # Playwright: rescue flow, resolve flow, escalation
```

## Documentation map for AI agents

Read in this order before editing: `CONSTRAINTS.md` → `ARCHITECTURE.md` → the `FLOW.md` section for the flow you are touching → `DECISIONS.md` for anything you are tempted to change. `PRD.md` is the source of truth for *what* and *why*; `Design.md` for *how it looks and behaves*.
