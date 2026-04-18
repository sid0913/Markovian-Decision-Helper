<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0  (initial ratification)
Modified principles: N/A — initial creation
Added sections: All
Removed sections: N/A
Templates updated:
  ⚠ .specify/templates/plan-template.md — not yet created; pending project setup
  ⚠ .specify/templates/spec-template.md — not yet created; pending project setup
  ⚠ .specify/templates/tasks-template.md — not yet created; pending project setup
Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Set to today 2026-04-17 as this is the founding entry.
  - TODO(PROJECT_NAME): Derived as "mdp" from working directory; update if formal name differs.
-->

# Project Constitution

**Project:** mdp
**Constitution Version:** 1.0.0
**Ratification Date:** 2026-04-17
**Last Amended:** 2026-04-17

---

## Purpose

This constitution establishes the non-negotiable engineering and operational principles for the
**mdp** project — a minimal Next.js (App Router, JavaScript) website hosted on Netlify,
serving up to approximately 100 users. It governs how features are designed, built, tested,
and deployed. All contributors and AI agents MUST treat this document as the authoritative
source of project constraints.

---

## Principle 1 — Minimal Footprint

Every change MUST justify its existence against the project's minimal scope.

- Dependencies MUST NOT be added unless they remove more complexity than they introduce.
- Pages, components, and API routes MUST serve a direct, documented user need.
- Dead code MUST be removed; no speculative abstractions for hypothetical future requirements.

**Rationale:** A ~100-user site does not need the complexity of a large-scale application.
Keeping the footprint small reduces surface area for bugs, faster build times, and lower
Netlify function invocation costs.

---

## Principle 2 — Build Gate

The project MUST pass a clean production build before any deployment proceeds.

- `next build` MUST complete without errors or warnings that would break runtime behavior.
- Build verification MUST run in CI (Netlify build pipeline or equivalent) on every push to
  the main branch and on every pull request.
- Deployments to production MUST only occur from a green build. Netlify preview deployments
  for PRs are permitted on branch builds.

**Rationale:** Broken builds reaching production degrade user trust. Netlify's build-and-deploy
pipeline enforces this gate automatically when configured correctly; this principle ensures it
is never bypassed.

---

## Principle 3 — Testing Discipline

The project MUST maintain a baseline test suite that covers critical paths.

- Unit tests MUST cover utility functions and any shared logic in `lib/` or `utils/`.
- At minimum one integration or smoke test MUST verify the home page renders without error.
- Tests MUST run in CI before merge; a failing test MUST block the merge.
- Test coverage thresholds are not enforced numerically, but any untested critical path
  MUST be noted in the relevant spec and addressed within the same feature cycle.
- Testing framework: Jest + React Testing Library (or Playwright for E2E smoke tests).

**Rationale:** For a small site, exhaustive coverage is wasteful; targeted tests on critical
paths catch regressions without creating maintenance burden.

---

## Principle 4 — Netlify Deployment Compatibility

All code MUST remain compatible with Netlify's hosting constraints.

- API routes or server actions that require a Node.js runtime MUST use Next.js App Router
  Route Handlers and be compatible with Netlify's serverless function execution environment.
- Static pages MUST be preferred over server-rendered pages wherever content does not require
  per-request data; use `export const dynamic = 'force-static'` explicitly when applicable.
- Environment variables MUST be managed via Netlify's environment variable UI; no secrets
  MUST be committed to the repository.
- The `netlify.toml` configuration file MUST be present and kept current with build command
  and publish directory settings.

**Rationale:** Netlify imposes execution time limits and cold-start constraints on serverless
functions. Maximising static output keeps the site fast and cost-free at this user scale.

---

## Principle 5 — JavaScript-Only Codebase

The project is written in JavaScript (not TypeScript); this is a deliberate scope decision.

- No TypeScript files (`.ts`, `.tsx`) MUST be introduced without a formal constitution
  amendment.
- JSDoc annotations SHOULD be used on exported functions to document parameter shapes
  and return types where the inference is non-obvious.
- ESLint with the Next.js recommended config MUST be enabled and MUST pass cleanly
  as part of the CI build step.

**Rationale:** TypeScript adoption carries a migration and tooling cost that is not warranted
for a minimal site. ESLint + JSDoc provides a lightweight safety net appropriate to the scale.

---

## Governance

### Amendment Procedure

1. Any contributor may propose an amendment by opening a pull request that edits this file.
2. The rationale for the change MUST be stated in the PR description.
3. The `CONSTITUTION_VERSION` MUST be bumped according to the versioning policy below.
4. The `LAST_AMENDED` date MUST be updated to the merge date.
5. Dependent templates (plan, spec, tasks) MUST be reviewed and updated in the same PR or
   an immediately following PR, noted in the Sync Impact Report.

### Versioning Policy

| Change type | Version bump |
|---|---|
| Principle removed or fundamentally redefined | MAJOR (X.0.0) |
| New principle added or section materially expanded | MINOR (1.X.0) |
| Clarification, wording fix, typo | PATCH (1.0.X) |

### Compliance Review

- Compliance with this constitution MUST be verified during code review for every PR.
- AI agents operating on this project MUST read this constitution at the start of any
  feature planning or implementation session.
- Any deviation from a principle MUST be explicitly justified in the PR description and
  MUST receive explicit maintainer approval before merge.
