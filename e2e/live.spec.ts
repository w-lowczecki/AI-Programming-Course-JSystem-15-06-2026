/**
 * @live — Live smoke test against real OpenRouter.
 * Skipped by default; only runs when explicitly tagged with --grep @live
 * or when RUN_LIVE_TESTS=1 is set.
 *
 * This test verifies the real AI pipeline end-to-end.
 * Requires OPENROUTER_API_KEY in env. Do NOT run in CI.
 */

import { test, expect } from "@playwright/test";
import { IntakeFormPage, FIXTURE_IMAGE_PATH } from "./pages/IntakeFormPage";
import { ChatScreenPage } from "./pages/ChatScreenPage";

const RUN_LIVE = process.env.RUN_LIVE_TESTS === "1";

test.describe("@live — Real OpenRouter smoke test", () => {
  test.skip(!RUN_LIVE, "Skipped by default — set RUN_LIVE_TESTS=1 to run");

  test("Full return flow with real OpenRouter returns a decision card", async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.goto();
    await form.fillReturnForm({
      model: "Samsung Galaxy S24",
      purchaseDate: "2026-06-01",
      imagePath: FIXTURE_IMAGE_PATH,
    });
    await form.submit();

    const chat = new ChatScreenPage(page);
    await expect(chat.decisionCard).toBeVisible({ timeout: 60_000 });
    await expect(chat.statusBadge).toBeVisible();
    await expect(chat.disclaimerText).toBeVisible();
  });
});
