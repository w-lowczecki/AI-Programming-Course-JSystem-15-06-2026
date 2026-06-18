/**
 * E2E — Chat continuation tests.
 * AC-23, AC-24, AC-25, AC-26, AC-31
 *
 * These tests verify the chat flow AFTER the id-schema bug fix (commit ad2b353):
 *   UIMessageSchema.id is now z.string().optional(), so useChat v4 no longer
 *   triggers a 422 on every follow-up message.
 *
 * Sentinel convention: the form `model` field value flows into the LLM prompt
 * via context.model → chatSystem() → OpenRouter request body, so the mock
 * OpenRouter server can extract it and return the matching canned streaming reply.
 *
 * Sentinels used here:
 *   TEST-APPROVE    — standard chat flow; assistant replies normally
 *   TEST-REVISION   — assistant reply contains [REVISED_DECISION] marker (AC-25)
 *   TEST-OFFTOPIC   — assistant replies with Polish off-topic decline (AC-26)
 */

import { test, expect } from "@playwright/test";
import { IntakeFormPage } from "./pages/IntakeFormPage";
import { ChatScreenPage } from "./pages/ChatScreenPage";

const TIMEOUT = { timeout: 30_000 };
const STREAM_TIMEOUT = { timeout: 45_000 };

/** Navigate through the intake form and land on the chat screen. */
async function navigateToChat(
  page: import("@playwright/test").Page,
  sentinel = "TEST-APPROVE"
) {
  const form = new IntakeFormPage(page);
  await form.goto();
  await form.fillReturnForm({ model: sentinel });
  await form.submit();
  const chat = new ChatScreenPage(page);
  await expect(chat.decisionCard).toBeVisible(TIMEOUT);
  return chat;
}

test.describe("Chat — follow-up messages", () => {
  // ── AC-23/24 ─────────────────────────────────────────────────────────────

  test("AC-23/24 — user follow-up streams an assistant reply without error", async ({
    page,
  }) => {
    /**
     * Verifies the primary happy path:
     * - User types a follow-up message and submits
     * - Typing indicator appears while the response is in flight (AC-24)
     * - A streaming assistant reply appears as a MessageBubble (AC-24)
     * - No TurnError is shown (i.e. no 422 — the id-schema fix works)
     * - Both user and assistant bubbles are visible in the thread (AC-23/24)
     */
    const chat = await navigateToChat(page, "TEST-APPROVE");

    await chat.sendMessage("Czy muszę mieć oryginalne opakowanie?");

    // Typing indicator must appear while request is in-flight (AC-24)
    await expect(
      page.locator('[data-testid="typing-indicator"]')
    ).toBeVisible(TIMEOUT);

    // Wait for streaming to complete — indicator disappears
    await expect(
      page.locator('[data-testid="typing-indicator"]')
    ).not.toBeVisible(STREAM_TIMEOUT);

    // No error state (AC-29 retry path must NOT trigger — 422 is fixed)
    await expect(page.locator('[data-testid="turn-error"]')).not.toBeVisible();

    // User message bubble is in the thread
    const userBubble = page
      .locator('[data-testid="message-bubble"].user')
      .filter({ hasText: "Czy muszę mieć oryginalne opakowanie?" });
    await expect(userBubble).toBeVisible();

    // At least one assistant bubble appeared after the seed message
    const assistantBubbles = page.locator(
      '[data-testid="message-bubble"].assistant'
    );
    // The seed message (index 0 in messages) is skipped in the thread, so there
    // must be exactly 1 new assistant bubble after the user follow-up
    await expect(assistantBubbles).toHaveCount(1, STREAM_TIMEOUT);
  });

  test("AC-23 — context object is sent to /api/chat on every turn", async ({
    page,
  }) => {
    /**
     * Spies on /api/chat via page.route (request body capture + continue).
     * Asserts that every POST to /api/chat includes a `context` object with
     * the required fields. This verifies useChat({ body: { context } }) works
     * correctly on both the first and subsequent turns.
     */
    const capturedBodies: unknown[] = [];

    // Spy: capture request body, let the real server handle the response
    await page.route("/api/chat", async (route) => {
      const requestBody = route.request().postDataJSON() as unknown;
      capturedBodies.push(requestBody);
      await route.continue();
    });

    const chat = await navigateToChat(page, "TEST-APPROVE");

    // First follow-up turn
    await chat.sendMessage("Pierwsze pytanie do asystenta.");
    await expect(
      page.locator('[data-testid="typing-indicator"]')
    ).not.toBeVisible(STREAM_TIMEOUT);

    // Second follow-up turn — verifies context persists on every call
    await chat.sendMessage("Drugie pytanie do asystenta.");
    await expect(
      page.locator('[data-testid="typing-indicator"]')
    ).not.toBeVisible(STREAM_TIMEOUT);

    // Both turns must have been captured
    expect(capturedBodies.length).toBeGreaterThanOrEqual(2);

    for (const body of capturedBodies) {
      const b = body as Record<string, unknown>;
      // `context` field must be present and be an object
      expect(b).toHaveProperty("context");
      expect(typeof b.context).toBe("object");
      expect(b.context).not.toBeNull();

      // `context` must contain the required CaseContext fields
      const ctx = b.context as Record<string, unknown>;
      expect(ctx).toHaveProperty("model");
      expect(ctx).toHaveProperty("requestType");
      expect(ctx).toHaveProperty("category");
      expect(ctx).toHaveProperty("purchaseDate");
      expect(ctx).toHaveProperty("imageDescription");
      expect(ctx).toHaveProperty("policyKind");
    }
  });

  // ── AC-25 ─────────────────────────────────────────────────────────────────

  test("AC-25 — revised decision reply shows 'Zaktualizowana ocena' badge", async ({
    page,
  }) => {
    /**
     * When the assistant reply contains [REVISED_DECISION], ChatScreen renders
     * a "Zaktualizowana ocena…" badge above the message bubble.
     *
     * The TEST-REVISION sentinel triggers buildChatReply to return a reply
     * prefixed with [REVISED_DECISION].
     */
    const chat = await navigateToChat(page, "TEST-REVISION");

    await chat.sendMessage("Mam dodatkowe informacje do zgłoszenia.");

    // Wait for streaming to finish
    await expect(
      page.locator('[data-testid="typing-indicator"]')
    ).not.toBeVisible(STREAM_TIMEOUT);

    // No error
    await expect(page.locator('[data-testid="turn-error"]')).not.toBeVisible();

    // Revised decision badge must appear (AC-25)
    await expect(chat.revisedBadge).toBeVisible(TIMEOUT);
  });

  // ── AC-26 ─────────────────────────────────────────────────────────────────

  test("AC-26 — off-topic question yields Polish decline message", async ({
    page,
  }) => {
    /**
     * When the user asks about something unrelated to the claim, the assistant
     * must decline in Polish and redirect to the topic of the request.
     *
     * The TEST-OFFTOPIC sentinel returns the canned Polish decline:
     *   "Przepraszam, mogę pomagać wyłącznie w sprawach związanych z Twoim
     *    zgłoszeniem zwrotu lub reklamacji."
     */
    const chat = await navigateToChat(page, "TEST-OFFTOPIC");

    await chat.sendMessage("Jaka jest pogoda w Warszawie?");

    // Wait for streaming to finish
    await expect(
      page.locator('[data-testid="typing-indicator"]')
    ).not.toBeVisible(STREAM_TIMEOUT);

    // No error
    await expect(page.locator('[data-testid="turn-error"]')).not.toBeVisible();

    // Polish off-topic decline text must appear in the assistant bubble
    await expect(
      page.locator('[data-testid="message-bubble"].assistant').filter({
        hasText: "Przepraszam, mogę pomagać wyłącznie",
      })
    ).toBeVisible(TIMEOUT);
  });

  // ── AC-31 — Polish text throughout ────────────────────────────────────────

  test("AC-31 — chat UI shows Polish text for composer and send button", async ({
    page,
  }) => {
    const chat = await navigateToChat(page, "TEST-APPROVE");

    // Composer placeholder is Polish
    await expect(chat.chatInput).toHaveAttribute("placeholder", "Napisz wiadomość…");

    // Send button label is Polish
    await expect(chat.sendButton).toBeVisible();
    await expect(chat.sendButton).toContainText("Wyślij");

    // New request button is Polish
    await expect(chat.newRequestButton).toBeVisible();
    await expect(chat.newRequestButton).toContainText("Nowe zgłoszenie");
  });

  // ── AC-28 ─────────────────────────────────────────────────────────────────

  test("AC-28 — new request button navigates back to form and clears state", async ({
    page,
  }) => {
    const chat = await navigateToChat(page, "TEST-APPROVE");
    await chat.newRequestButton.click();
    await expect(page).toHaveURL("/");
  });

  // ── AC-29 — error handling ─────────────────────────────────────────────────

  test("AC-29 — service error during chat shows TurnError with retry button", async ({
    page,
  }) => {
    /**
     * After reaching chat, force a service error by using page.route to inject
     * a 503 response for a single /api/chat call only.
     * Verifies TurnError + retry button appear.
     *
     * Note: we inject the error via route interception (one-shot) rather than
     * a sentinel because the sentinel would affect the analyze step too.
     */
    const chat = await navigateToChat(page, "TEST-APPROVE");

    // One-shot 503 injection for the next /api/chat POST only
    await page.route("/api/chat", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Usługa czatu jest tymczasowo niedostępna. Spróbuj ponownie.",
          retryable: true,
        }),
      });
    }, { times: 1 });

    await chat.sendMessage("To pytanie wywoła błąd serwisu.");

    // TurnError must appear
    await expect(
      page.locator('[data-testid="turn-error"]')
    ).toBeVisible(STREAM_TIMEOUT);

    // Retry button must be present
    await expect(
      page.locator('button[aria-label="Spróbuj ponownie"]')
    ).toBeVisible();
  });
});
