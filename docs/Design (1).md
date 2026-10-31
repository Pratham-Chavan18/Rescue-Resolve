# Design — Swiggy Unified Recovery

Design system + screen-by-screen UX spec. Binding for all UI work. Engineering floors (contrast, focus, motion) are requirements, not suggestions.

---

## 1. Design language

**Tone:** calm, competent, reassuring. The user is usually annoyed when they see these screens — the UI must lower the temperature: plain language, exact amounts, concrete times, zero exclamation marks.

**Principles in UI form:**
- *Transparency* → every rupee shown with a label and a destination ("₹220 to UPI ·· 4242" not "refund initiated").
- *One primary action per screen* — the recommended recovery option is the only filled button.
- *Progress without anxiety* — health states use neutral→amber→red, never alarmist copy.

## 2. Tokens

```css
/* color — light-first, single warm accent */
--bg:            #F7F7F9;  /* app canvas */
--surface:       #FFFFFF;
--surface-sunk:  #F1F0F4;
--ink:           #1C1C1C;  /* primary text */
--ink-2:         #686B78;  /* secondary text (contrast ≥ 4.5:1 on bg) */
--line:          #E9E9EB;
--accent:        #FC8019;  /* Swiggy orange — CTAs, active states only */
--accent-ink:    #B24E00;  /* orange text on light (4.5:1) */
--accent-soft:   #FFF3E8;
--ok:            #1BA672;  --ok-soft:  #EAF7F1;   /* resolved / on_track */
--warn:          #C77400;  --warn-soft:#FFF6E5;   /* at_risk */
--bad:           #D7263D;  --bad-soft: #FDECEF;   /* failing / rejected */

/* type */
--font-display: "Space Grotesk", sans-serif;  /* headings, amounts — tracking -0.02em */
--font-body:    "Archivo", sans-serif;        /* UI text */

/* shape & space */
--r-lg: 16px; --r-md: 12px; --r-pill: 999px;
/* spacing on a 4/8px grid; touch targets ≥ 44px */
```

- **Accent budget:** orange ≤ ~10% of any screen. Status colors never decorate, they only encode state.
- **Type scale:** display 28/34 · title 20/28 · body 16/24 · meta 12/16 uppercase +0.09em.
- **Amounts** always `font-display` + `font-variant-numeric: tabular-nums`.
- **Iconography:** Lucide icons only — no emoji as icons, no icon-in-colored-square containers.

## 3. Motion

- UI transitions 150–250ms, `ease-out`; animate only `transform`/`opacity`.
- Step changes in flows: new step enters from `translateY(8px) scale(0.98)` + fade.
- Evaluation sequence (Resolve) and health-state changes (Rescue) are **choreographed multi-step** (stagger 80–120ms per row), not spinners.
- `prefers-reduced-motion`: all choreography collapses to instant state change.

## 4. Key screens

### 4.1 Customer — Order Health timeline (Rescue home)
- Live order card top of home: restaurant, hero item thumb, **health state pill** (`On track` ok-green / `At risk` amber / `Needs attention` red), current ETA (`Arriving by 9:42 PM`).
- Timeline rows (icon + label + timestamp): Accepted → Preparing → Packed → Rider assigned → Picked up → Near you → Delivered. Active row pulses; delayed rows show `+12 min` delta chips in amber.
- **At-risk banner** (amber soft, no border stripes): "May be 20+ min late. We're checking with the restaurant." + button `View recovery options`.
- Demo controls (dev-only, bottom-right FAB): simulate rider stuck / restaurant slow / ETA slip.

### 4.2 Customer — Recovery choice sheet (Rescue)
Bottom sheet, three option cards stacked, radio semantics:
1. **Wait it out** — "Get ₹75 credit now" (recommended = filled accent CTA `Wait with ₹75 credit`).
2. **Replace this order** — shows matched restaurant, 2-line item summary, **price difference line** (`+₹30` / `−₹10` / `Same price`) and new promise ("by 10:05 PM").
3. **Cancel & refund** — "₹520 to UPI ·· 4242 by tomorrow."
Footer meta: "Your choice is instant. No cancellation fee when we're late."
Confirm → **Recovery status screen**: SLA hero ("Replacement arriving by 10:05 PM"), live mini-timeline of the replacement, ledger line "Cause: restaurant delay — no charge to you."

### 4.3 Customer — Resolve intake (from order screen)
- Entry: order card link `Something wrong with this order?` (always visible on delivered orders).
- **Step 1 — Issue:** 4 large list rows (icon left): Wrong item · Missing item · Quality/freshness · Late delivery. Single-select, `Continue` enabled after selection.
- **Step 2 — Evidence:** conditional —
  - wrong/quality → dashed photo dropzone (camera/library), thumbnail preview, "Continue without photo" text-link (yields medium confidence — said in copy);
  - missing → checkbox list of billed items with prices;
  - late → no input; shows promised vs actual timestamps.
- **Step 3 — Checking…:** choreographed verification rows (Reading order · Verifying photo · Checking bill · Applying fairness rules), each resolving to a green check.
- **Step 4 — Your resolution:** outcome title, **large tabular amount**, entitlement breakdown rows (Item refund ₹220 / Delivery-fee credit ₹40 / **Total ₹260**), plain-language reason, destination line ("to UPI ·· 4242 within 2 hours"), confidence chip. Primary `Accept resolution`; secondary `I disagree — talk to a human`.
- **Step 5 — Done:** success check, refund timeline (Initiated → Bank processing → Credited), case ID, `Track in My cases`.
- Low-confidence path skips Step 4 offer: "Sending to a specialist — full case attached. Reply within 15 min."

### 4.4 Customer — My cases
Chronological case cards: issue icon, order #, amount, status chip (`Refund initiated` / `Under review` / `Resolved` / `Rejected`), SLA countdown where applicable. Tap → case detail (same entitlement breakdown + evidence + agent notes when present).

### 4.5 Restaurant — Action panel
Queue of at-risk/live orders. Each card: order #, items, minutes-since-order, **risk reason** ("Not packed · 9 min"), actions: `Confirm packing time` (opens 5/10/15-min picker) · `Decline items` (reason select). Declining triggers customer Rescue replace/cancel automatically.

### 4.6 Rider — Task panel
Current task card: pickup/drop, payout line. On reassignment: card shows **reason** ("Previous rider stationary 8 min") + "Your payout for the completed leg is protected (₹38)". Actions: `Accept` / `Can't take this` (reason select).

### 4.7 Agent — Resolve console (desktop)
- Left: queue list (case ID, issue type, confidence chip, value, wait time; sorted by SLA breach risk).
- Right: **case pack** — order summary, evidence photo(s), Fairness Engine decision + rule trace ("Rule W-1: photo mismatch verified → full refund"), signals (customer claims 2/38 orders · restaurant issue rate 4.1%), customer message.
- Action bar: `Approve automated offer` (primary) · `Issue custom refund` (amount + reason code) · `Reject` (reason code required). Every action → ledger entry + customer notification.

## 5. States & accessibility

- Every async surface has loading / empty / error states; errors in plain language with a retry.
- Full keyboard operability; visible `:focus-visible` ring (2px accent).
- Body contrast ≥ 4.5:1 (verify `--ink-2` on `--bg`); status never encoded by color alone (icon + text).
- Mobile-first (375px baseline); agent console is desktop-first but must not break at 375px (stacked layout).
- Copy rules: sentence case, no exclamation marks, amounts always with ₹ and destination, times always absolute ("by 10:05 PM", never "soon").
