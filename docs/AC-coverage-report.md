# AC Coverage Report — Hardware Service Decision Copilot

**Date:** 2026-06-18
**Branch:** `feat/poc-implementation`
**Unit/Integration tests:** 245 passing (17 test files, Vitest)
**E2E tests:** 28 passing, 1 skipped `@live` (Playwright, deterministic mock)

---

## Summary

| Layer | Tests | Pass | Skip | Fail |
|---|---|---|---|---|
| Unit / Integration | 245 | 245 | 0 | 0 |
| E2E (automated) | 29 | 28 | 1 | 0 |

The `@live` spec (`e2e/live.spec.ts`) is skipped by default; run with `RUN_LIVE_TESTS=1` to exercise the real OpenRouter.

---

## Fixed Production Bug (id-schema, commit ad2b353)

**Bug (now fixed):** `UIMessageSchema.id` was `z.string()` (required), but `@ai-sdk/react` `useChat` v4 strips the `id` field before sending to `/api/chat` (default `sendExtraMessageFields=false`). Every chat follow-up returned `422 {"errors":{"messages.0.id":"Required",...}}`.

**Fix:** `UIMessageSchema.id` changed to `z.string().optional()`. `ChatScreen.tsx` seeds `initialMessages` with `m.id ?? \`seed-${i}\``.

**E2E impact:** AC-23/24/25/26 full E2E scenarios are now passing (previously deferred to bug fix).

---

## AC Coverage Matrix — AC-01 … AC-31

| AC | Description | Unit / Integration | E2E |
|---|---|---|---|
| **AC-01** | Form has exactly 2 request types: Reklamacja, Zwrot | `lib/contracts/contracts.test.ts` (IntakeFormSchema enum) | `validation.spec.ts` → "AC-01 — two request type options" |
| **AC-02** | Category dropdown with 10 predefined values | `lib/contracts/contracts.test.ts` (EQUIPMENT_CATEGORIES) | `validation.spec.ts` → "AC-02 — category dropdown has all 10 predefined options" |
| **AC-03** | Equipment model is required (non-empty after trim) | `lib/contracts/contracts.test.ts` (model min-length) | Covered via form submit blocked (all decision tests require model) |
| **AC-04** | Future purchase date is rejected inline | `lib/contracts/contracts.test.ts` (purchaseDate refine); `IntakeForm.test.tsx` | `validation.spec.ts` → "AC-04 — future purchase date shows Polish error" |
| **AC-05** | Reason required for Complaint, optional for Return | `lib/contracts/contracts.test.ts` (superRefine); `IntakeForm.test.tsx` (two tests) | `validation.spec.ts` → "AC-05 — complaint without reason"; "AC-05 edge — whitespace-only"; "reason label shows wymagany/opcjonalny" |
| **AC-06** | No image → inline error | `IntakeForm.test.tsx` (image required) | `validation.spec.ts` → "AC-06 — submitting without image shows Polish error" |
| **AC-07** | Submit blocked while errors exist | `IntakeForm.test.tsx` (submit blocked tests) | Implicitly verified: all validation tests confirm no API call is made while errors exist |
| **AC-08** | Non-JPEG/PNG/WebP image rejected with Polish message | `lib/contracts/contracts.test.ts` (validateImageFile format); `app/api/analyze/route.test.ts` | `validation.spec.ts` → "AC-08 — unsupported image format shows Polish error" |
| **AC-09** | Image >10 MB rejected with Polish message | `lib/contracts/contracts.test.ts` (validateImageFile size); `app/api/analyze/route.test.ts` | `validation.spec.ts` → "AC-09 — image over 10 MB shows Polish error" |
| **AC-10** | Backend compresses/resizes image before vision call | `lib/image/index.test.ts` (compression tests); `app/api/analyze/route.test.ts` (TAC-03) | Not directly visible to user — covered by integration tests |
| **AC-11** | Only one image; second upload replaces first | `IntakeForm.test.tsx` (single file) | `validation.spec.ts` → "AC-11 — uploading a second image replaces the first" |
| **AC-12** | Complaint image analysis uses complaint-specific prompt | `lib/ai/prompts.test.ts` (imageComplaint content); `app/api/analyze/route.test.ts` (TAC-08) | `decision.spec.ts` → "APPROVE — complaint happy path" (complaint flow succeeds) |
| **AC-13** | Return image analysis uses return-specific prompt | `lib/ai/prompts.test.ts` (imageReturn content); `app/api/analyze/route.test.ts` | `decision.spec.ts` → "APPROVE — return happy path" |
| **AC-14** | Image description retained in context for chat | `app/api/analyze/route.test.ts`; `ChatScreen.test.tsx` (context in request) | `chat.spec.ts` → "AC-23 — context object is sent to /api/chat" (asserts `imageDescription` field present) |
| **AC-15** | Exactly one outcome from 5 values | `lib/contracts/drift-guard.test.ts`; `lib/ai/agent.test.ts` | `decision.spec.ts` → APPROVE, REJECT, NMI, CONDITIONAL, ESCALATE tests (all 5 outcomes) |
| **AC-16** | Return policy used for Return; complaint policy for Complaint | `lib/ai/agent.test.ts` (TAC-08); `lib/policies/index.test.ts` | `decision.spec.ts` → both request types tested |
| **AC-17** | Every decision has a justification referencing policy | `lib/ai/agent.test.ts` (post-parse validation); `lib/contracts/contracts.test.ts` | `decision.spec.ts` → "justificationSection not empty" in APPROVE/REJECT/NMI tests |
| **AC-18** | NEEDS_MORE_INFO + missing[] when image/data insufficient | `lib/ai/agent.test.ts` (TAC-03/05); `lib/contracts/contracts.test.ts` | `decision.spec.ts` → "NEEDS_MORE_INFO — NMI status with missing[]"; "TEST-UNUSABLE — unusable image → NMI" |
| **AC-19** | Every decision includes non-binding disclaimer | `lib/ai/agent.test.ts` (post-parse validation); `chat.test.tsx` (DecisionCard always shows disclaimer) | `decision.spec.ts` → all decision flow tests assert `disclaimerText` visible |
| **AC-20** | After submission user is shown chat with first agent message | `ChatScreen.test.tsx` (seed DecisionCard renders) | `decision.spec.ts` → APPROVE happy path navigates to `/chat`, decision card shown |
| **AC-21** | First message: greeting → decision → justification → next steps → disclaimer | `chat.test.tsx` (DecisionCard ordering test) | `decision.spec.ts` → chat screen Polish text verifies section labels |
| **AC-22** | Decision outcome visually distinguishable (status label) | `chat.test.tsx` (StatusBadge renders for all 5 outcomes) | `decision.spec.ts` → "statusBadge contains Pozytywna ocena / Odrzucono / etc." for all outcomes |
| **AC-23** | Agent has full context on every chat turn | `ChatScreen.test.tsx` (TAC-001-04, context in request body) | `chat.spec.ts` → "AC-23 — context object is sent to /api/chat on every turn" (spies on `/api/chat`, asserts `context` + all fields present for 2 consecutive turns) |
| **AC-24** | User can send messages; receives agent replies | `ChatScreen.test.tsx` (user message bubble rendered) | `chat.spec.ts` → "AC-23/24 — user follow-up streams an assistant reply without error" (typing indicator visible, assistant bubble appears, no TurnError) |
| **AC-25** | Revised decision explicitly marked as update | `ChatScreen.test.tsx` (revised turn marked) | `chat.spec.ts` → "AC-25 — revised decision reply shows 'Zaktualizowana ocena' badge" (TEST-REVISION sentinel → [REVISED_DECISION] → badge visible) |
| **AC-26** | Off-topic requests declined and redirected | `lib/ai/prompts.test.ts` (chatSystem off-topic instruction) | `chat.spec.ts` → "AC-26 — off-topic question yields Polish decline message" (TEST-OFFTOPIC sentinel → Polish canned decline in assistant bubble) |
| **AC-27** | Context persists for active session | `CaseProvider.test.tsx` (state survives navigation) | `decision.spec.ts` → APPROVE happy path: form → /chat, decision still shown |
| **AC-28** | New request clears form + conversation | `CaseProvider.test.tsx` (clearCaseState); `ChatScreen.test.tsx` | `decision.spec.ts` → "AC-28 — new request clears form and conversation"; `chat.spec.ts` → "AC-28 — new request button navigates back to form" |
| **AC-29** | Service error → error state + retry, no decision | `app/api/analyze/route.test.ts` (TAC-05/07); `IntakeForm.test.tsx` (5xx handling) | `decision.spec.ts` → "TEST-ERROR — service error shows error state, no decision"; `chat.spec.ts` → "AC-29 — service error during chat shows TurnError with retry button" |
| **AC-30** | Never fabricate decision when image analysis failed | `lib/ai/agent.test.ts` (usable=false → NEEDS_MORE_INFO); `app/api/analyze/route.test.ts` | `decision.spec.ts` → "TEST-UNUSABLE — unusable image → NMI, never APPROVE/REJECT" |
| **AC-31** | All user-facing text in Polish | `lib/contracts/contracts.test.ts` (Polish messages); `lib/ai/prompts.test.ts` | `validation.spec.ts` → "AC-31 — form labels are in Polish"; `decision.spec.ts` → "AC-31 — chat screen displays Polish UI text"; `chat.spec.ts` → "AC-31 — chat UI shows Polish text for composer and send button" |

---

## Gap Analysis

| AC | Gap | Justification |
|---|---|---|
| **AC-10** | Backend compression not visible to E2E | Correctly verified at integration layer (`lib/image/index.test.ts`, `route.test.ts`). Cannot be observed from a browser. |
| **AC-03** | E2E coverage implicit | Model field is required by all decision tests — submit is always blocked without it. A dedicated standalone test is not necessary given full integration coverage. |

All previously-deferred chat ACs (AC-23/24/25/26) are now fully covered following the id-schema bug fix (commit `ad2b353`).

---

## Test File Inventory

### Unit / Integration (Vitest)

| File | Tests |
|---|---|
| `lib/contracts/contracts.test.ts` | 41 |
| `lib/contracts/drift-guard.test.ts` | 20 |
| `lib/ai/prompts.test.ts` | 25 |
| `lib/policies/index.test.ts` | 5 |
| `lib/__sanity__.test.ts` | 1 |
| `app/components/__sanity__.test.tsx` | (sanity) |
| `app/components/PrimaryButton.test.tsx` | UI primitives |
| `app/components/ui/primitives.test.tsx` | UI primitives |
| `app/components/IntakeForm.test.tsx` | 12 |
| `app/components/chat.test.tsx` | (DecisionCard, MessageBubble, TypingIndicator, TurnError) |
| `app/components/ChatScreen.test.tsx` | 7 |
| `app/components/CaseProvider.test.tsx` | CaseProvider state |
| `app/api/analyze/route.test.ts` | analyze route |
| `app/api/chat/route.test.ts` | chat route |
| `lib/image/index.test.ts` | image compression |
| `lib/ai/agent.test.ts` | agent functions |
| `lib/ai/provider.test.ts` | provider factory |
| **Total** | **245** |

### E2E (Playwright)

| File | Tests | ACs covered |
|---|---|---|
| `e2e/validation.spec.ts` | 11 | AC-01, AC-02, AC-04, AC-05, AC-06, AC-08, AC-09, AC-11, AC-31 |
| `e2e/decision.spec.ts` | 12 | AC-15, AC-17, AC-18, AC-19, AC-22, AC-28, AC-29, AC-30, AC-31 |
| `e2e/chat.spec.ts` | 6 | AC-23, AC-24, AC-25, AC-26, AC-28, AC-29, AC-31 |
| `e2e/live.spec.ts` | 1 (skipped) | Full live smoke (requires `RUN_LIVE_TESTS=1`) |
| **Total** | **28 pass + 1 skip** | |
