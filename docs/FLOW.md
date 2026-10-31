# FLOW — How the Critical Features Work

Step-by-step walkthroughs. When something breaks, find the flow, find the step, check the owner module. Module names refer to `ARCHITECTURE.md`.

---

## F1. Rescue — late order becomes a managed recovery

1. The **simulator** emits `OrderEvent`s (accepted, packed, rider assigned, GPS pings) onto the `OrderEventBus`.
2. `modules/health` converts events into `HealthSignal` rows (rider stationary 6 min, ETA slipped +22 min).
3. On each signal, `TriggerEngine.evaluate()` runs with config thresholds → order health moves `on_track → at_risk`.
4. `modules/rescue` creates a `RescueCase` and builds three options: wait-credit (tiered amount), replacement (via `Matcher`), full refund. Snapshot stored on the case.
5. `modules/realtime` emits `health.changed` + `rescue.offered` to room `order:{id}`; customer UI shows the at-risk banner and choice sheet (`apps/web/.../rescue/`).
6. Customer taps an option → `POST /rescue/:caseId/choice`.
7. API validates (case open, option valid), executes:
   - **Wait** → `LedgerEntry(credit, cause)` → wallet credit → SLA revised ETA.
   - **Replace** → creates replacement `Order` from the matched cart, links `originalOrderId`, charges/refunds the price difference (simulated), new SLA.
   - **Cancel** → order status `cancelled`, full-refund `LedgerEntry`.
8. Ledger append → socket `rescue.updated` → customer sees the SLA status screen ("Replacement arriving by 10:05 PM").
9. If cause was restaurant/rider, `modules/partners` has already emitted `partner.risk` / `rider.reassigned`; their responses (confirm packing time / accept reassignment) feed back as new `HealthSignal`s — step 3 re-runs.

**Failure checks:** option amounts wrong → `matcher`/engine tests. Banner never appears → simulator events reaching `health`? Thresholds in config? Customer charged twice → choice endpoint idempotency key.

## F2. Resolve — wrong item, instant refund (high confidence)

1. Order screen (`orders/[id]`) → `Something wrong with this order?` → Resolve intake.
2. Customer selects **Wrong item** → uploads photo → `POST /resolve/cases` (draft) + `POST /resolve/cases/:id/evidence` (multipart, validated, stored as upload).
3. `ImageVerificationProvider` (mock in MVP) returns `verdict: mismatch_verified`.
4. `FairnessEngine.decide()` runs: rule `W-1` fires → `{ confidence: high, outcome: full_item_refund + fee_credit, destination: source }`. Decision + **rule trace** stored on the case.
5. Offer screen renders the entitlement breakdown (amounts from the stored decision — UI never recomputes).
6. Customer taps `Accept resolution` → `POST /resolve/cases/:id/accept` → `LedgerEntry(refund, destination: source)` → case `refund_initiated` → socket `case.updated`.
7. Done screen shows refund timeline; case appears in **My cases** with SLA ("to UPI ·· 4242 within 2 hours").

**Failure checks:** wrong amount → engine rule trace on the case (visible in agent console). Photo rejected → upload validation (size/MIME, constraint §4.16).

## F3. Resolve — escalation with case pack (low confidence or disagreement)

1. Either the engine returns `confidence: low` (conflicting signals or order > ₹1,500) or the customer taps `I disagree — talk to a human`.
2. Case status → `escalated`; `modules/agent` pushes `agent.case.new` to the `agent:queue` room.
3. Agent console shows the case pack: order, evidence, automated decision + rule trace, signals (customer claim rate, restaurant issue rate), customer note.
4. Agent acts: `Approve automated offer` / `Issue custom refund` (amount + reason code) / `Reject` (reason code required).
5. `POST /agent/cases/:id/action` → validate role → write `LedgerEntry` where compensation applies → case status `resolved`/`rejected` → `case.updated` to customer + notification.
6. Customer's My cases updates live; rejection shows the reason in plain language and the re-open path.

## F4. Partner loops

- **Restaurant at-risk:** `partner.risk` → action panel card → `Confirm packing time` (new `promisedAt`, health recalculated, cause stays `restaurant` only if the restaurant misses *its own* confirmed time) or `Decline items` (triggers F1 step 5 for the customer with cause `restaurant`).
- **Rider reassignment:** trigger `rider_stuck` → `modules/partners` reassigns, emits `rider.reassigned` with reason + protected payout for the completed leg → ledger note on the order.

## F5. Demo / simulator controls

`POST /sim/:orderId/fault { kind }` (or the customer-role FAB): injects `rider_stuck | restaurant_slow | eta_slip | delivered_unconfirmed | wrong_item`. Faults are just real `OrderEvent`s — the product path cannot tell the difference. Reset with `POST /sim/reset` (re-seeds the live demo order).
