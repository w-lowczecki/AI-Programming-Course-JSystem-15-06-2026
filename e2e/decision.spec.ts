/**
 * E2E — Decision flow tests (full form → decision card → chat).
 * Uses deterministic mock OpenRouter server.
 * AC-15…AC-25, AC-28, AC-29, AC-30, AC-31
 */

import { test, expect } from "@playwright/test";
import { IntakeFormPage } from "./pages/IntakeFormPage";
import { ChatScreenPage } from "./pages/ChatScreenPage";

const TIMEOUT = { timeout: 30_000 };

test.describe("Decision flow — happy paths", () => {
  test("APPROVE — return happy path shows positive decision card (AC-15, AC-17, AC-19, AC-22)", async ({
    page,
  }) => {
    const form = new IntakeFormPage(page);
    await form.goto();
    await form.fillReturnForm({ model: "TEST-APPROVE" });
    await form.submit();

    const chat = new ChatScreenPage(page);
    await expect(chat.decisionCard).toBeVisible(TIMEOUT);
    await expect(chat.statusBadge).toContainText("Pozytywna ocena");
    // Justification must be non-empty
    await expect(chat.justificationSection).not.toBeEmpty();
    // Disclaimer must be present (AC-19)
    await expect(chat.disclaimerText).toBeVisible();
    await expect(chat.disclaimerText).toContainText("niewiążąca");
  });

  test("APPROVE — complaint happy path shows positive decision card", async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.goto();
    await form.fillComplaintForm({ model: "TEST-APPROVE" });
    await form.submit();

    const chat = new ChatScreenPage(page);
    await expect(chat.decisionCard).toBeVisible(TIMEOUT);
    await expect(chat.statusBadge).toContainText("Pozytywna ocena");
    await expect(chat.disclaimerText).toBeVisible();
  });

  test("REJECT — decision card shows rejection status (AC-22)", async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.goto();
    await form.fillReturnForm({ model: "TEST-REJECT" });
    await form.submit();

    const chat = new ChatScreenPage(page);
    await expect(chat.decisionCard).toBeVisible(TIMEOUT);
    await expect(chat.statusBadge).toContainText("Odrzucono");
    await expect(chat.justificationSection).not.toBeEmpty();
    await expect(chat.disclaimerText).toBeVisible();
  });

  test("NEEDS_MORE_INFO — decision card shows NMI status with missing[] (AC-18)", async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.goto();
    await form.fillReturnForm({ model: "TEST-NMI" });
    await form.submit();

    const chat = new ChatScreenPage(page);
    await expect(chat.decisionCard).toBeVisible(TIMEOUT);
    await expect(chat.statusBadge).toContainText("więcej informacji");
    await expect(chat.missingSection).toBeVisible();
    await expect(chat.disclaimerText).toBeVisible();
  });

  test("CONDITIONAL — decision card shows conditional status with conditions[] (AC-15)", async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.goto();
    await form.fillReturnForm({ model: "TEST-CONDITIONAL" });
    await form.submit();

    const chat = new ChatScreenPage(page);
    await expect(chat.decisionCard).toBeVisible(TIMEOUT);
    await expect(chat.statusBadge).toContainText("Warunkowo");
    await expect(chat.conditionsSection).toBeVisible();
    await expect(chat.disclaimerText).toBeVisible();
  });

  test("ESCALATE — decision card shows escalation status (AC-15)", async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.goto();
    await form.fillReturnForm({ model: "TEST-ESCALATE" });
    await form.submit();

    const chat = new ChatScreenPage(page);
    await expect(chat.decisionCard).toBeVisible(TIMEOUT);
    await expect(chat.statusBadge).toContainText("Eskalacja");
    await expect(chat.disclaimerText).toBeVisible();
  });
});

test.describe("Decision flow — unusable image", () => {
  test("TEST-UNUSABLE — unusable image → NEEDS_MORE_INFO, never APPROVE/REJECT (AC-18, AC-30)", async ({
    page,
  }) => {
    const form = new IntakeFormPage(page);
    await form.goto();
    await form.fillReturnForm({ model: "TEST-UNUSABLE" });
    await form.submit();

    const chat = new ChatScreenPage(page);
    await expect(chat.decisionCard).toBeVisible(TIMEOUT);

    const badge = chat.statusBadge;
    await expect(badge).toBeVisible();

    // Must show NMI, not APPROVE/REJECT
    await expect(badge).toContainText("więcej informacji");
    await expect(badge).not.toContainText("Pozytywna ocena");
    await expect(badge).not.toContainText("Odrzucono");

    // missing[] section must be shown (AC-18)
    await expect(chat.missingSection).toBeVisible();
    await expect(chat.disclaimerText).toBeVisible();
  });
});

test.describe("Service error handling", () => {
  test("TEST-ERROR — service error shows error state, no decision (AC-29, AC-30)", async ({
    page,
  }) => {
    const form = new IntakeFormPage(page);
    await form.goto();
    await form.fillReturnForm({ model: "TEST-ERROR" });
    await form.submit();

    // Should show an error message — NOT a decision card
    await expect(
      page.locator('[role="alert"]').filter({ hasText: "problem" }).first()
    ).toBeVisible(TIMEOUT);

    // Decision card must NOT be visible
    const chat = new ChatScreenPage(page);
    await expect(chat.decisionCard).not.toBeVisible();

    // General error banner in the form (5xx path shows error message in IntakeForm)
    // OR the general error state with retry
    const hasErrorState =
      (await page.locator('[data-testid="error-state"]').isVisible()) ||
      (await page.locator('[role="alert"]').filter({ hasText: "problem" }).count()) > 0;
    expect(hasErrorState).toBeTruthy();
  });
});

test.describe("New request flow", () => {
  test("AC-28 — new request clears form and conversation", async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.goto();
    await form.fillReturnForm({ model: "TEST-APPROVE" });
    await form.submit();

    const chat = new ChatScreenPage(page);
    await expect(chat.decisionCard).toBeVisible(TIMEOUT);

    // Click "Nowe zgłoszenie"
    await chat.newRequestButton.click();

    // Should return to form
    await expect(page).toHaveURL("/");
    await expect(form.submitButton).toBeVisible();
    // Form should be cleared
    await expect(form.modelInput).toHaveValue("");
  });
});

test.describe("Polish text throughout", () => {
  test("AC-31 — chat screen displays Polish UI text", async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.goto();
    await form.fillReturnForm({ model: "TEST-APPROVE" });
    await form.submit();

    const chat = new ChatScreenPage(page);
    await expect(chat.decisionCard).toBeVisible(TIMEOUT);

    // Key Polish section labels in decision card
    await expect(page.locator("text=Uzasadnienie")).toBeVisible();
    await expect(page.locator("text=Następne kroki")).toBeVisible();
    // Disclaimer must be Polish
    await expect(chat.disclaimerText).toContainText("niewiążąca");

    // Chat UI labels
    await expect(chat.chatInput).toHaveAttribute("placeholder", "Napisz wiadomość…");
    await expect(chat.sendButton).toBeVisible();
    await expect(chat.newRequestButton).toBeVisible();
  });
});
