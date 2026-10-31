---
name: vibe-coding-blueprint
description: Create, update, and audit the documentation system that keeps AI coding agents from guessing - PRD, design system, architecture, database, security, code style, testing, UX flows, API contracts, and AGENTS.md. Also writes disciplined agent prompts for implementing features, fixing bugs, and pre-release review. Use this skill whenever the user is starting or scaling an app built with AI assistance, mentions vibe coding, PRD, AGENTS.md, CLAUDE.md, project docs, "source of truth", agent rules, or says the agent keeps making inconsistent decisions, inventing tables or endpoints, or drifting from the design - even if they never name these documents.
---

# Vibe Coding Blueprint

AI coding agents work well on small experiments and then start guessing as an app grows: what a feature should do, how the UI should look, how auth works, where a file belongs. Different parts of the app end up following different assumptions. A small set of Markdown documents gives the user and the agent one shared source of truth.

The core idea: **context before code.** Give the agent context, rules, constraints, architecture, examples, and validation - not just a prompt.

```
Idea -> Requirements -> User flows -> Design -> Architecture -> Database -> API
     -> Security -> Conventions -> Testing -> Agent instructions
     -> Implementation -> Validation
```

## What the user might want

Figure out which mode applies, then jump in.

1. **Bootstrap** - new or undocumented project; create the doc set.
2. **Add or update one document** - e.g. "write a DATABASE.md", "update the PRD, we added teams".
3. **Audit** - docs exist; find gaps, stale sections, contradictions, duplicated rules.
4. **Prompting** - write a prompt for an agent to implement a feature, fix a bug, or review before release (see "Prompt library").

## Bootstrap workflow

1. **Inspect before asking.** If a repo exists, read the README, package manifest, schema/migrations, route files, env examples, and any existing agent rules. For an existing project the docs must describe what is actually true, not what would be nice. Do not invent a stack the user has not chosen.
2. **Capture intent.** Ask only for what you cannot infer: what is being built, for whom, the MVP boundary, hard constraints. If the user wants speed, draft anyway and record gaps under Open Questions. One round of questions is usually enough.
3. **Pick the smallest useful set** (table below). Heavier docs are a maintenance cost; skip what the project does not need yet.
4. **Draft in dependency order:** PRD -> UX_FLOWS -> DESIGN_SYSTEM -> ARCHITECTURE -> DATABASE -> API -> SECURITY -> CODE_STYLE -> TESTING -> AGENTS. Later docs must agree with earlier ones.
5. **Cross-check** (see "Consistency pass") before presenting.
6. **Place the files** (see "File placement").
7. **Report briefly:** what was created, which assumptions were made, which questions are still open, and the suggested first feature to implement.

### Choosing the document set

| Project | Start with |
|---|---|
| Weekend prototype / single-purpose tool | PRD (short) + AGENTS |
| Small app with users and data | PRD, ARCHITECTURE, DATABASE, AGENTS |
| App with auth, payments, or user uploads | add SECURITY, TESTING |
| App with a real UI that must stay consistent | add DESIGN_SYSTEM, UX_FLOWS |
| Multiple clients or integrations consume a backend | add API |
| Team or long-lived codebase | all of the above + CODE_STYLE |

## Rules for filling templates

- **No raw placeholders.** Every `[bracket]` becomes a real decision, or an explicit line: `Open question: ...` or `Assumption: ...`. An agent that finds `[Technology]` will guess, which defeats the purpose.
- **Do not invent business requirements.** If the user did not say it and the code does not show it, it is an assumption or open question, labeled as such.
- **Delete unused example content.** The template examples (users/projects/tasks, checkout, etc.) are generic illustrations, not requirements.
- **Make requirements verifiable.** Acceptance criteria should be checkable by a test or a manual step. "Fast" is not a criterion; "list loads under 2s with 1,000 rows" is.
- **One home per rule.** State each rule in one document and reference it elsewhere. Duplicated rules go stale at different speeds and then contradict each other.
- **Stay lightweight.** Document decisions that affect implementation. Avoid giant files and speculative sections.
- **Secrets never go in docs**, prompts, or examples. Name environment variables, never values.

## Document specifications

Each entry gives the purpose, the sections to include, and the quality bar. Use headings in this order so agents and humans can find things predictably.

### PRD.md - what are we building?
Create before implementation; update whenever scope, features, or flows change.

Sections: 1 Product Overview (name, one-line description, type, primary platform) - 2 Problem (what, why it matters, current alternatives) - 3 Goals (primary, secondary) - 4 Target Users (persona, needs, pain points) - 5 User Stories ("As a [user], I want to [action] so that [outcome]") - 6 Core Features (per feature: purpose, user flow, inputs, outputs, acceptance criteria, edge cases) - 7 Non-Goals - 8 MVP Scope (must have / nice to have / future) - 9 Success Metrics - 10 Constraints (technical, business, design, timeline) - 11 Assumptions - 12 Open Questions - 13 Definition of Done (requirements implemented, critical flows work, tests pass, build succeeds, security satisfied, docs updated).

Quality bar: the agent can understand the product without a 30-minute explanation; non-goals are explicit so the agent does not gold-plate.

### UX_FLOWS.md - how do users move through it?
For larger projects. Write the real journey (e.g. landing -> sign up -> onboarding -> dashboard -> create project -> details -> invite -> complete). For each flow: numbered steps, success outcome, failure behavior, and the loading, error, and empty states.

Quality bar: every flow that touches the network defines what the user sees while loading and when it fails.

### DESIGN_SYSTEM.md - what should it look and feel like?
Sections: Design Direction (style, mood, principles) - Brand (name, logo rules, voice) - Color Palette (primary, secondary, background, surface, text, muted, border, success, warning, error as hex) - Typography (families; H1-H3, body, small with size/weight/line-height) - Spacing (base unit and scale, e.g. 4/8/12/16/24/32/48/64/96) - Border Radius (small, medium, large, pill) - Shadows - Buttons (primary, secondary, danger, disabled, loading) - Inputs (default, focus, error, disabled, placeholder) - Cards - Navigation (header, sidebar, mobile) - States (loading, empty, error, success, disabled) - Icons (library, size, style) - Responsive (breakpoints and rules per size) - Accessibility (semantic HTML, contrast, keyboard navigation, visible focus, accessible labels, never rely on color alone).

Quality bar: concrete values (hex, px, weights), not adjectives. If tokens already exist in code (Tailwind config, CSS variables), mirror them instead of inventing new ones.

### ARCHITECTURE.md - how should the system work?
Sections: System Overview - Architecture Pattern (monolith / modular monolith / microservices / serverless, with the reason) - Technology Stack (frontend, backend, database, auth, storage, hosting, payments, email, analytics, other) - System Components and their responsibilities - Architecture Diagram (a simple text or Mermaid diagram, e.g. User -> Frontend -> API -> Service Layer -> Database) - Data Flow (numbered request lifecycle) - Project Structure (folder tree) - Dependency Rules (e.g. UI components never access the database directly) - Key Technical Decisions (decision, context, alternatives, reason) - Performance - Scalability - Failure Scenarios (database unavailable, API timeout, third-party failure, auth failure - state the expected behavior for each).

Quality bar: the folder structure and dependency rules match the real repo; each key decision records why, so the agent does not undo it.

### DATABASE.md - what data exists?
The source of truth for the data model; the agent must not invent tables, fields, or naming.

Sections: Database Engine and hosting - Naming Conventions (tables, columns, PKs, FKs, timestamps) - Tables (purpose and columns for each) - Relationships (e.g. users -> projects: one-to-many) - Constraints (required, unique, foreign keys) - Indexes (column and reason) - Data Validation - Soft Delete (yes/no and how) - Auditing (created/updated/deleted by, activity history) - Sensitive Data (fields and protection) - Migration Rules (schema changes must be documented, have a migration, be tested, and not break production data) - Seed Data.

Quality bar: if an ORM schema exists (Prisma, SQLAlchemy, etc.), derive the doc from it and note that the schema file is canonical for exact types.

### API.md - what are the contracts?
For apps where a backend serves one or more clients. The source material starts this document but leaves it unfinished, so use this structure.

Conventions: base URL, authentication method, versioning, error format, pagination, rate limits.

Per endpoint: `METHOD /resource` - purpose - required permission (role or ownership rule) - path params - query params (types, defaults) - request body (schema and example) - success response (status, schema, example) - error responses (codes and meaning) - side effects (writes, notifications, external calls) - idempotency (duplicate-request behavior) - validation (server-side rules) - tests (success, invalid input, unauthenticated, forbidden).

Quality bar: real types, allowed values, and status codes. Separate "who are you" (authentication) from "is this yours" (ownership). Decide retry and partial-failure behavior before wiring in payments or other external services.

### SECURITY.md - what must be protected?
Treat security as a requirement defined before implementation.

Sections: Authentication (provider, methods) - Authorization (roles, per-role permissions; **enforced server-side**) - Secrets (never hard-code, never commit production secrets, never expose private secrets to the client, use environment variables, rotate compromised credentials, use appropriate secret storage) - Environment Variables (public vs private lists) - API Security (input validation, rate limiting, CORS, authn, authz) - Data Protection (sensitive data, encryption, retention, deletion) - Logging (never log passwords, API keys, tokens, sensitive personal information; do log auth events, important actions, errors, security events) - File Uploads (allowed types, max size, validation, storage location) - Security Checklist (authentication implemented, authorization implemented, server-side validation, secrets protected, sensitive data protected, rate limiting considered, uploads validated, errors do not expose sensitive details, dependencies reviewed).

### CODE_STYLE.md - how should code be written?
Sections: General Principles (readable, focused functions, no unnecessary abstractions, reuse existing components and utilities, consistency over novelty) - Naming (components, functions, variables, constants, files, DB fields, API routes) - Folder Structure - Imports - Components (single responsibility) - Functions (one logical thing, clear names) - Error Handling (pattern to use, pattern to avoid) - Comments (explain why, tradeoffs, non-obvious behavior; never restate the code) - Logging - Formatting (formatter, linter, type checker) - Do (reuse patterns, focused changes, follow conventions, remove dead code) - Don't (duplicate utilities, add needless dependencies, ignore architecture, change unrelated files).

Quality bar: describe conventions the codebase actually follows. Pull formatter and linter names from the config files rather than guessing.

### TESTING.md - how will we know it works?
Sections: Testing Goals (critical functionality) - Test Types (unit for utilities, business logic, components; integration for APIs, DB, auth flows, service integrations; end-to-end for critical journeys such as sign up, sign in, create project, checkout) - Tools (unit, integration, e2e) - Test File Structure (`tests/unit`, `tests/integration`, `tests/e2e`, or whatever the repo uses) - Critical User Flows (name, steps, expected result) - Coverage (a practical target; prioritize business logic, authentication, payments, data mutations, key journeys) - Commands (test, lint, build, type check) - Definition of Done (tests, build, lint, and type check pass; critical flow verified; no blocking errors).

Quality bar: commands are copy-pasteable and actually exist in the project. The agent should not stop at "the code looks correct."

### AGENTS.md - how should the agent behave?
Turns the docs into operating instructions. Keep it short and pointer-heavy; it should reference the other docs instead of copying them.

Sections: 1 Project Context (name, purpose, primary users) - 2 Source of Truth (read the relevant docs in `docs/` before significant changes; do not contradict them without first identifying the conflict) - 3 General Rules (understand existing code before modifying it; reuse components and utilities; follow the design system, architecture, database conventions, security requirements, and coding conventions; do not invent business requirements; do not expose secrets; avoid unnecessary dependencies and unrelated changes) - 4 Planning (for non-trivial tasks: inspect docs, inspect code, identify affected files, dependencies, DB/API changes, and required tests; write a concise plan) - 5 Implementation (focused changes, established patterns, preserve existing behavior, no unnecessary rewrites) - 6 Validation (run tests, lint, type check, build; review changed files; check for unintended changes) - 7 Documentation (update docs when product behavior, architecture, schema, API contracts, security rules, or conventions change) - 8 Conflict Handling (if requirements conflict, do not guess: surface the conflict and ask) - 9 Completion Criteria (requirements satisfied, tests pass, build succeeds, no unintended files changed, security respected, docs updated).

## File placement

The source layout puts everything in `docs/`:

```
docs/
  PRD.md  DESIGN_SYSTEM.md  ARCHITECTURE.md  DATABASE.md
  SECURITY.md  CODE_STYLE.md  TESTING.md
  UX_FLOWS.md  API.md        (advanced, as needed)
```

**Agent instructions must live where the coding tool discovers them.** A file at `docs/AGENTS.md` will not necessarily apply to the whole repository. Put the file at the repo root (`AGENTS.md`, or `CLAUDE.md` for Claude Code) and have it point at `docs/`. Other tools use their own locations (for example `.cursor/rules/` for Cursor or `.github/copilot-instructions.md` for GitHub Copilot). Check which tool the user actually uses; if several, keep one canonical file and make the others short pointers to it.

## Consistency pass

Before presenting a doc set, check that the documents agree. Fix or flag each mismatch.

- Every PRD feature has flows (UX_FLOWS), data (DATABASE), and endpoints (API) where applicable.
- Every table and endpoint traces back to a PRD feature; nothing orphaned.
- Roles in SECURITY match roles in DATABASE, API permissions, and PRD user types.
- Stack in ARCHITECTURE matches tooling in CODE_STYLE and TESTING.
- Commands in TESTING exist in the project, and AGENTS.md completion criteria use the same commands.
- Non-goals in the PRD are not smuggled back in as features elsewhere.
- Sensitive fields listed in DATABASE are covered by SECURITY's protection and logging rules.

## Audit mode

When reviewing existing docs, report concrete findings, not generalities:

1. **Missing** - decisions the agent will have to guess (no non-goals, no error states, no ownership rules).
2. **Stale** - docs that contradict the code (cite the file and the doc section).
3. **Conflicting** - two docs that disagree.
4. **Duplicated** - the same rule in several files; recommend one home.
5. **Bloated** - sections nobody acts on; recommend cutting.

Separate verified findings (you checked the code) from questions (you could not tell). Prioritize by how likely the gap is to cause the agent to build the wrong thing.

## Prompt library

Offer these when the user is ready to implement. Fill the brackets from the conversation, and name the specific docs and files to read.

**Idea to documentation**
> Read the existing repository and relevant docs. My idea: [idea]. My users: [users]. Constraints: [constraints]. Draft a PRD with MVP scope, non-goals, user stories, acceptance criteria, and edge cases. Mark assumptions and unresolved decisions explicitly. Do not choose a new stack or implement code yet.

**Implement one feature**
> Implement [feature] using [relevant documents]. Inspect existing code first. Identify affected files and a concise plan. Reuse current patterns. Respect scope and permissions. Verify the acceptance criteria, run the applicable checks, and update docs when behavior changes. Report what changed, what you tested, and any unresolved limitations.

**Fix a bug**
> Observed behavior: [what happens]. Expected behavior: [what should happen]. Reproduction steps: [steps]. Inspect the affected flow and determine the root cause. Make a focused fix. Verify the reproduction no longer fails and check adjacent behavior. Do not rewrite unrelated features.

**Review before release**
> Review the changed files against the PRD, architecture, API contracts, and security rules. Check permissions, validation, failure states, and data migrations. Report concrete findings with impact and file locations. Separate verified issues from questions. Do not claim checks passed unless they were run.

## Working agreements to recommend

**Before implementation**
- Problem and target user are clear; MVP and non-goals are written.
- Critical flows include loading, empty, success, and error states.
- Architecture, data model, and API decisions agree with each other.
- Security and ownership rules are explicit; agent instructions point at the right docs.

**During implementation**
- Build one coherent feature at a time; give the agent file references and acceptance criteria.
- Resolve real conflicts instead of letting the agent silently pick a new requirement.
- Review migrations and destructive changes before running them.
- Keep secrets out of prompts, repositories, screenshots, and logs.

**Before delivery**
- Applicable tests, lint, type check, and build have been run.
- Critical journeys are verified; permissions, invalid inputs, and failure paths are checked.
- Changed files are reviewed for unintended edits.
- Docs reflect the implemented behavior; unrun checks and known limitations are recorded.

## Maintenance

Docs only help while they are true. Whenever product behavior, schema, API contracts, security rules, or conventions change, update the matching document in the same change. Prefer deleting a stale section over leaving it to mislead the agent. When the user asks for a feature, check whether it touches a documented decision first, and if it does, update the doc or flag the conflict before coding.

## Next step to offer

Create the PRD, fill the smallest useful set of supporting documents, then have the agent implement one scoped feature against clear acceptance criteria.
