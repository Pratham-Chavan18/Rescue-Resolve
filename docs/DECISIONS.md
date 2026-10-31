# DECISIONS — Why We Chose What We Chose

Record of technical decisions and reasoning. Don't undo these casually; if a decision needs revisiting, open a discussion and add a new dated entry that supersedes the old one — never edit history silently.

Format: **Decision** — context → choice → rationale → what was rejected.

---

## D1. One Next.js app for all four roles
*Context:* customer, restaurant, rider, and agent surfaces share types, components, and the socket layer.
*Choice:* a single `apps/web` Next.js app with route groups per role.
*Rationale:* one deployable, shared design system, shared typed socket client; role surfaces differ in layout, not in technology.
*Rejected:* separate apps per role (4× infra, drift); React Native now (see D6).

## D2. NestJS modular monolith over microservices
*Context:* Rescue, Resolve, ledger, partners, agent all transact over the same orders and must stay consistent.
*Choice:* one NestJS service with strict module boundaries.
*Rationale:* a refund decision, its ledger entry, and its socket fan-out must be one transaction — trivial in a monolith, a saga in microservices. Team-of-one/AI-agent velocity favors one deployable.
*Rejected:* microservices (premature distribution); serverless functions (long-lived sockets + ticks are awkward).

## D3. Domain logic in pure, framework-free packages (`packages/engines`)
*Context:* the Fairness Engine and Trigger Engine are the product's crown jewels and will be tuned constantly.
*Choice:* pure TypeScript functions — values in, decision + rule trace out; zero NestJS imports; ≥95% unit coverage on decision tables.
*Rationale:* rules are testable without HTTP, reviewable in isolation, and the **rule trace** gives agents/auditors an explanation for every rupee. Engines can later move to a rules service without changing call sites.
*Rejected:* rules inline in controllers (untestable, duplicated in UI); a third-party rules engine (opaque traces, overkill).

## D4. PostgreSQL + Prisma; Redis for ephemeral state
*Context:* relational core (orders, items, cases, ledger) + high-churn health signals and socket fan-out.
*Choice:* Postgres via Prisma for truth; Redis for health-signal hot state and pub/sub.
*Rationale:* ledger and case data need ACID and relations; signals are ephemeral and fast-moving. Prisma's typed client matches the TS-everywhere stack.
*Rejected:* MongoDB (ledger wants transactions + relations); TypeORM (weaker typing); Kafka (absurd at demo scale — the `OrderEventBus` interface keeps the door open).

## D5. Socket.IO over raw WebSocket / SSE / polling
*Context:* four roles, per-order rooms, agent queue, reconnection on mobile networks.
*Choice:* Socket.IO with JWT-authenticated rooms.
*Rationale:* rooms, auto-reconnect, and fallback transport out of the box; events are typed in `packages/types`.
*Rejected:* SSE (server→client only, still need a second channel); polling (latency kills the "live timeline" feel).

## D6. PWA-first, not native
*Context:* prototype that must demo on phones (photo upload is core to Resolve).
*Choice:* mobile-first PWA; camera via `<input type="file" accept="image/*" capture>`.
*Rationale:* one codebase, instant demo link, real camera access. Native shells deferred to Phase 4 with the API already role-complete.
*Rejected:* Expo now (doubles the surface area before the product loop is proven).

## D7. Mock vision behind a provider interface
*Context:* photo verification is real in production but out of scope to build/train now.
*Choice:* `ImageVerificationProvider` interface; `MockVisionProvider` returns deterministic verdicts (scenario-driven, so e2e tests are stable).
*Rationale:* the Fairness Engine consumes a *verdict*, not pixels — swapping in a real model touches one file.
*Rejected:* calling a hosted vision API in the demo (cost, latency, flaky e2e, secrets in CI).

## D8. A simulator instead of mocking screens
*Context:* no real Swiggy fleet exists, but Rescue must react to genuine event streams.
*Choice:* `modules/simulator` emits real `OrderEvent`s through the same bus the production path would use; demo faults are just events.
*Rationale:* the entire product path (signals → triggers → offers → ledger) is exercised for real; only the world is simulated. Replacing the simulator with a real feed touches one module.
*Rejected:* frontend mock state (proves nothing; demo and product paths diverge).

## D9. Integer paise, ₹ only at the edge
*Context:* money math in floats causes ₹0.01 disputes — unacceptable in a product about fair refunds.
*Choice:* integer paise end-to-end (DB, API, engines); format once in `lib/format.ts`.
*Rejected:* floats + rounding helpers (drift, locale bugs).

## D10. Demo OTP auth, not OAuth
*Context:* four roles need fast demo login; no real users exist.
*Choice:* phone + fixed OTP (`1234`) issuing a role-claimed JWT; role switcher on login screen.
*Rationale:* zero external dependencies, deterministic e2e. The auth module is isolated so production SSO/OTP can replace it (protected area — see CONSTRAINTS §3).
*Rejected:* real SMS OTP (cost/secrets), OAuth providers (network dependency in demo).

## D11. TanStack Query + Zustand (not Redux, not server-state-in-Zustand)
*Choice:* TanStack Query owns server state (cache/invalidation on socket events); Zustand owns client-only state (session, draft claims).
*Rationale:* single responsibility each; socket handlers simply invalidate query keys.
*Rejected:* Redux (boilerplate at this scale); stuffing server cache into Zustand (stale-data bugs).

## D12. Append-only recovery ledger
*Choice:* `LedgerEntry` is insert-only; corrections are compensating entries.
*Rationale:* compensation fairness is the product's promise — the audit trail must be untamperable. Protected in CONSTRAINTS §3.

---

### Superseded / reconsidered
*(none yet — add new dated entries here as decisions evolve)*
