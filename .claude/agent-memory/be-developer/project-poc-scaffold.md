---
name: project-poc-scaffold
description: Task 0.1 scaffold state — Next.js app bootstrapped at repo root on feat/poc-implementation branch
metadata:
  type: project
---

Task 0.1 (Scaffold + tooling) completed on 2026-06-18.

**Why:** PoC implementation plan requires a fresh Next.js (App Router, TS strict, Tailwind) at repo root with AI SDK, OpenRouter provider, Vitest (node+jsdom workspaces), and Playwright.

**How to apply:** All subsequent implementation tasks (be-developer, fe-developer, qa-engineer) build on this scaffold. The `lib/` dir is at repo root (not under `app/`). No `src/` directory. Import alias `@/*` → repo root.

**Key facts:**
- Branch: `feat/poc-implementation` (commit `802fe22`)
- scaffold-tmp/ dir exists at repo root (gitignored) — bootstrap artifact, can be deleted manually
- Vitest config: `vitest.config.ts` at root with two projects: `node` (lib/**, app/api/**) and `jsdom` (app/components/**, app/** UI)
- Playwright config: `playwright.config.ts` at root, tests in `e2e/`
- Setup file: `test/setup-jsdom.ts` imports `@testing-library/jest-dom`
- jsdom project has `globals: true` so jest-dom matchers work correctly
- Sanity tests: `lib/__sanity__.test.ts` (node) and `app/components/__sanity__.test.tsx` (jsdom)

**Pinned versions:** next@16.2.9, react@19.2.4, ai@4.3.19, @ai-sdk/react@1.2.12, @openrouter/ai-sdk-provider@0.4.6, zod@3.25.76, sharp@0.34.5, vitest@3.2.6, @playwright/test@1.61.0

**Phase 3 complete (2026-06-18):**
- Commit `7783179`: drift-guard tests (18 tests in `lib/contracts/drift-guard.test.ts`)
- Commit `f03ef68`: lazy provider fail-fast + MAX_IMAGE_MB test
  - `lib/ai/provider.ts`: `getOpenRouter()` helper; throws Polish error if `OPENROUTER_API_KEY` missing/empty; instance cached per key value
  - `app/api/analyze/route.ts`: `MAX_IMAGE_MB` env override was already wired (lines 38-40), added test
  - 240 tests total passing
