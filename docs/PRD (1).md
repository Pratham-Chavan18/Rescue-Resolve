# PRD — Swiggy Unified Recovery (Resolve + Rescue)

- **Status:** Approved for build · **Version:** 1.0
- **Owner:** Product — Order Trust pod
- **Build agent note:** This document is the source of truth for *what* to build and *why*. Implementation rules live in `CONSTRAINTS.md`; structure in `ARCHITECTURE.md`; visuals in `Design.md`.

---

## 1. Problem

Customers discover too late that an order is stuck, delayed, wrong, or missing items — then spend 30–60 minutes fighting support and often receive a small coupon instead of the meal they needed. Documented patterns in public complaints:

- A vegetarian customer received a non-veg item and was told to wait **6–8 working hours** for an email.
- Resolution timelines stretch to **72 hours**, ending in "no refund applicable."
- A late-night order failure ended with a **₹77 refund on a ~₹500 order** and a replacement requiring another 40–45 minute wait after the customer had already waited 90 minutes.
- Orders marked "delivered" never arrive; tickets are cancelled or closed without a replacement; refunds are replaced with **unconsented coupons**.

The core failure is not that mistakes happen — it is that **recovery is slow, opaque, and often unfair**. A refund alone does not solve the customer's actual job-to-be-done: *"I need dinner for my family tonight."*

## 2. Product thesis

One app, two coordinated recovery systems sharing a single accountability layer:

| | **Swiggy Rescue** | **Swiggy Resolve** |
|---|---|---|
| Moment | Pre-delivery (order in flight) | Post-delivery (order completed/failed) |
| Mode | **Proactive** — system detects risk, offers recovery | **Reactive** — customer reports issue, system adjudicates |
| Core object | Order Health timeline + Trigger engine | Evidence pack + Fairness engine |
| Outcome | Wait-with-credit / replacement / full refund | Instant refund / wallet credit / human escalation |
| Shared | Recovery Ledger (cause attribution), transparent entitlement, SLA display, agent console | |

**Design principles (apply to both):**
1. **Evidence-first, not agent-first** — verify automatically where possible.
2. **Transparent entitlement** — the customer sees the exact refund/replacement/credit *before* committing. No black-box offers, no unconsented coupons.
3. **Instant resolution for high-confidence cases** — minutes, not hours.
4. **Human escalation with context** — the agent receives a pre-filled case pack; the customer never restarts from zero.
5. **Never auto-cancel without consent** — the customer always chooses.

## 3. Personas and outcomes

| User | Pain today | Outcome in this app |
|---|---|---|
| **Customer** | Late/wrong/missing orders; slow support; coupon instead of meal | Proactive rescue offers; one-tap replacement; instant fair refunds; live SLA |
| **Restaurant partner** | Failed order = wasted food, refund dispute, no clear next step | "Order at risk" panel: confirm packing time or decline items; clear cost attribution |
| **Delivery partner** | Wrong pickup assignment, unclear escalation, payout disputes | Reassignment with reason; protected payout for completed work |
| **Support agent** | Context-free tickets, inconsistent decisions | Case queue with evidence pack, automated decision, and signals pre-attached |

## 4. Feature spec — Swiggy Rescue

### 4.1 Order Health timeline
Replaces the passive "Preparing → Out for delivery" tracker with a continuously evaluated health model. Signals:

| Signal | Source | Risk threshold (default) |
|---|---|---|
| Restaurant has not accepted/packed | Order events | > 8 min after order placement |
| Rider not moving toward pickup | GPS pings | > 6 min stationary after assignment |
| ETA slippage | ETA service | slips beyond customer tolerance (default 15 min) |
| Delivered-but-unconfirmed | GPS + no customer confirm | GPS drop at address, no confirm in 5 min |
| Customer claim (wrong/missing/spilled/veg-nonveg) | Resolve intake | immediate |

Each order exposes a health state: `on_track → at_risk → failing → recovered / failed`, rendered as the Order Health timeline (see `Design.md` §4).

### 4.2 Proactive recovery offers
When risk crosses threshold, the customer is alerted (in-app + push in the demo via socket toast):
> "Your order may be 20+ min late. We're checking with the restaurant — choose a replacement now if you're in a hurry."

One-tap choices (customer always chooses; nothing auto-executes):
1. **Wait** — with an instant ₹X wallet credit (tiered by delay).
2. **Replace** — Replacement Matcher pre-fills a comparable cart from a nearby restaurant (cuisine, price band ±20%, veg/non-veg match, delivery feasibility); customer sees the **price difference before confirming**.
3. **Cancel** — full refund to source account.

### 4.3 Replacement guarantee
If the original order cannot arrive by the revised promise time, Rescue guarantees: "Replacement arriving by 8:42 PM" — a concrete SLA rendered on every Rescue case. Compensation transparency: instant wallet credit for convenience, or original-payment refund at the customer's preference.

### 4.4 Partner action panel
- **Restaurant:** "Order at risk — confirm packing time or decline items." Response updates the health model and the customer's revised ETA.
- **Rider:** reassignment instructions with reason ("previous rider stationary 8 min") and **protected payout** for completed legs.

### 4.5 Recovery Ledger
Every Rescue event writes a ledger entry: `cause ∈ {restaurant, logistics, customer_address, platform}`, evidence timestamps, compensation paid, and by whom. This drives partner scorecards and prevents punishing restaurants for factors outside their control.

### 4.6 Rescue MVP scope
Late/stuck orders first (measurable, avoids adjudicating food quality):
- Trigger engine: ETA-slippage + pickup-delay rules.
- Customer choice screen: wait / replace / cancel-and-refund.
- Replacement matcher v1 (rules-based, no ML).
- Partner action panel (restaurant + rider).
- Recovery ledger v1.

## 5. Feature spec — Swiggy Resolve

### 5.1 Intake
One-tap entry from the order screen ("Something wrong with this order?"). Guided categorization: **wrong item · missing item · quality/freshness · late delivery**.

### 5.2 Evidence
- Wrong/quality: photo upload (required for high confidence), optional note.
- Missing: customer selects missing items directly from the bill (no photo needed).
- Late: automatic — uses order timestamps, no evidence required.

### 5.3 Fairness Engine (rules-based, explainable)
Pure-function rules engine. Inputs: issue category, photo verification verdict, order line items/prices, delivery timestamps, customer order history (fraud signal — never sole basis), restaurant history.

| Scenario | Confidence | Automated outcome |
|---|---|---|
| Wrong item, photo clearly shows different dish | High | Full item refund + proportional delivery-fee credit, to source |
| Missing item selected from bill | High | Item refund + 50% delivery fee as credit |
| Quality issue visible in photo | High | Full refund of affected item |
| Wrong/quality, photo ambiguous or absent | Medium | Item value as wallet credit; one-tap escalate for source refund |
| Late > 30 min past promise | High (timestamp) | Tiered credit: ₹50 (30–45m) · ₹75 (45–60m) · ₹100 (>60m) |
| Conflicting signals **or** order value > ₹1,500 | Low | Human review with full evidence pack |

The customer sees the outcome **before submitting**, in plain language: *"You received a different item than ordered. You are eligible for a full refund of ₹220 to your source account."*

### 5.4 Escalation
One tap ("I disagree — talk to a human") creates an agent case pack: order details, evidence, automated decision + confidence, customer/restaurant signals. SLA: agent response within 15 minutes. Agent actions: approve automated offer / issue custom refund / reject with reason code. Every action writes to the Recovery Ledger.

## 6. User stories (MVP)

| # | As a… | I want to… | So that… | Acceptance |
|---|---|---|---|---|
| R1 | Customer | see my order's health state change in real time | I know before dinner is ruined | Timeline updates via socket within 2s of signal |
| R2 | Customer | get a proactive alert with wait/replace/refund when my order is 20 min late | I stay in control | All three options render with exact amounts and SLA |
| R3 | Customer | replace with a similar meal nearby and see the price difference first | no surprise charges | Diff shown; confirm required; new ETA displayed |
| R4 | Restaurant | confirm packing time on an at-risk order | I avoid unfair fault | ETA recalculates; ledger cause stays `restaurant` only if I miss my own confirmed time |
| R5 | Rider | see why I was reassigned and that my payout is protected | I trust the system | Reassignment card shows reason + payout line |
| S1 | Customer | report a wrong item from the order screen with a photo | no chatbot maze | ≤3 taps from order screen to evidence |
| S2 | Customer | see my exact entitlement before submitting | I trust the outcome | Amount + destination (source/wallet) + reason shown pre-submit |
| S3 | Customer | get an instant refund for verified cases | no follow-ups | High-confidence cases resolve < 3 min P50 |
| S4 | Customer | escalate to a human with one tap | I'm not stuck in a bot loop | Agent sees full case pack; customer sees 15-min SLA |
| A1 | Agent | approve/modify/reject with reason codes | decisions are consistent and auditable | Action writes ledger entry + notifies customer |

## 7. Metrics

| Metric | Target |
|---|---|
| Late-order support tickets | −30% within 90 days |
| Failed-order replacement rate | > 60% of eligible Rescue cases |
| Resolve resolution time (P50, high-confidence) | < 3 minutes |
| Escalation-to-human rate | < 20% of Resolve cases |
| Refund accuracy (audit vs. rules) | ≥ 98% |
| CSAT after a Rescue/Resolve event | > 4.5 / 5 |
| Repeat order rate after recovery | ≥ baseline repeat rate (no trust tax) |

## 8. Guardrails

- Never auto-cancel without explicit customer consent.
- Do not penalize restaurants/riders for factors outside their control — verified timestamps and cause codes only.
- Cap automatic credits per customer per rolling 30 days; high-value (> ₹1,500) or anomalous patterns go to humans.
- Wallet credit is a **choice**, never a substitute silently issued instead of a source refund.
- Fraud signals may route to review but never auto-reject a claim.

## 9. Non-goals (MVP)

- Instamart / Genie categories (Phase 4).
- Real payment gateway integration (simulated ledger entries instead).
- Real computer-vision model (provider interface + mock).
- Native iOS/Android shells (PWA-first; see `DECISIONS.md`).

## 10. Tech stack (summary — rationale in DECISIONS.md)

Next.js 14 · TypeScript · Tailwind + shadcn/ui · TanStack Query · Zustand · Socket.IO · NestJS · PostgreSQL · Prisma · Redis · Vitest · Playwright · Docker Compose. Domain logic isolated in pure TS packages (`packages/engines`) with near-total unit coverage.

## 11. Rollout phases

1. **Phase 1 (MVP):** Rescue for late/stuck + Resolve for wrong/missing on food orders ≤ ₹1,500; agent console; simulator; ledger v1.
2. **Phase 2:** Resolve quality-flow with photo verification; late-delivery auto-credit.
3. **Phase 3:** Full case-pack tooling, partner scorecards, real vision provider.
4. **Phase 4:** Instamart/Genie expansion, native shells.
