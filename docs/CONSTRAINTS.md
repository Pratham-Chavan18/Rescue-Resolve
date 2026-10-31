# CONSTRAINTS — Rules for Modifying This Project

These rules bind any contributor — human or AI agent. Violating them is worse than not finishing a task. When a rule blocks your task, stop and ask rather than route around it.

---

## 1. Scope discipline

1. **Don't rewrite unrelated features.** Touch only what the task requires. If you notice a problem elsewhere, report it — don't fix it in passing.
2. **Don't refactor for style.** No renames, reformatting, or "cleanups" outside the files your change legitimately touches.
3. **Don't delete existing functionality** (screens, endpoints, rules, events) without explicit approval. Deprecate with a comment and flag it instead.
4. Small, reviewable diffs. If a change is growing past ~400 lines, pause and propose a split.

## 2. Dependencies & stack

5. **Don't add dependencies without asking.** State the package, why, size/maintenance risk, and the alternative using what's already installed. Approved stack is fixed in `DECISIONS.md`.
6. Don't swap frameworks, ORM, state libraries, router patterns, or test runners. Don't introduce a second way to do something that already has one way (styling = Tailwind + tokens; data = TanStack Query; local state = Zustand).
7. No new environment variables without documenting them in `.env.example` in the same change.

## 3. Protected areas (approval required)

8. **Auth & roles** (`services/api/src/modules/auth`, role guards, JWT shape).
9. **Ledger integrity** (`modules/ledger`): append-only. Never update or delete ledger rows; corrections are new compensating entries.
10. **Money handling**: integer paise only; no floats; formatting only in `lib/format.ts`. No rounding logic outside engines.
11. **Database schema**: every change = a Prisma migration + updated `packages/types` + seed compatibility. Never `db push` over migrations; never edit old migrations.
12. **Decision rules**: entitlement/trigger logic changes go in `packages/engines` with matching unit tests — never inline in API handlers or React components.

## 4. Security & privacy

13. **Never expose secrets**: no API keys, passwords, tokens, or connection strings in code, logs, tests, fixtures, or docs. Config via env only.
14. No real PII in seeds/fixtures — synthetic names, phones like `90000 0000x`, masked UPI only.
15. Every REST route and socket room checks role authorization server-side. Hiding a button in the UI is not authorization.
16. Evidence photos: store as uploads with access checks; never inline base64 in the database; cap upload size (2 MB) and validate MIME.

## 5. Product invariants (never break)

17. **No auto-cancel.** A customer-facing cancel/replace/refund only executes after an explicit customer tap.
18. **Transparent entitlement**: amounts shown before commitment, with destination (source vs wallet). Never issue a wallet credit silently in place of a source refund.
19. **Fraud signals route to review — never auto-reject** a claim.
20. Cause attribution must use verified timestamps/events, never guesses (`LedgerEntry.cause` from evidence only).
21. Credit caps: enforce the per-customer 30-day automatic credit cap from config.

## 6. Quality gates (run before declaring done)

22. `pnpm test` green, including engine coverage (≥95% on decision tables); add tests for every rule change.
23. `pnpm lint && pnpm typecheck` clean.
24. Relevant Playwright flow still passes (`rescue`, `resolve`, `escalation` suites as applicable).
25. UI changes honor `Design.md`: tokens not hex literals, contrast ≥ 4.5:1, focus visible, touch targets ≥ 44px, reduced-motion respected.
26. Every socket event added/changed is declared in `packages/types` first and consumed with its type — no `any` payloads.

## 7. Communication

27. If requirements conflict (e.g., a request that would break an invariant in §5), **stop and surface the conflict** — don't pick a side silently.
28. Uncertain about intent? Ask. Never guess at entitlement amounts, thresholds, or SLA values — they live in config and the PRD.
