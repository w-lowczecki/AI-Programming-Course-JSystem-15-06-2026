/**
 * E2E — Client-side validation tests (no LLM needed).
 * AC-04, AC-05, AC-07, AC-08, AC-09, AC-11, AC-31
 */

import { test, expect } from "@playwright/test";
import { IntakeFormPage, FIXTURE_IMAGE_PATH } from "./pages/IntakeFormPage";

test.describe("Validation — intake form", () => {
  test.beforeEach(async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.goto();
  });

  // AC-04: future purchase date is rejected
  test("AC-04 — future purchase date shows Polish error", async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.requestTypeReturn.check();
    await form.categorySelect.selectOption("Smartfon");
    await form.modelInput.fill("TEST-APPROVE");

    // Set a future date via React-compatible nativeInputValueSetter
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDate = tomorrow.toISOString().slice(0, 10);

    await form.purchaseDateInput.evaluate((el: HTMLInputElement, v: string) => {
      // Remove the max constraint so the DOM accepts the value
      el.removeAttribute("max");
      // Use React's internal setter to trigger synthetic onChange
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      nativeInputValueSetter?.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, futureDate);

    await form.imageInput.setInputFiles(FIXTURE_IMAGE_PATH);
    await form.submit();

    await expect(
      page.locator('[role="alert"]').filter({ hasText: "przyszłości" }).first()
    ).toBeVisible();
  });

  // AC-05: complaint without reason is rejected
  test("AC-05 — complaint without reason shows Polish error", async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.requestTypeComplaint.check();
    await form.categorySelect.selectOption("Laptop");
    await form.modelInput.fill("TEST-APPROVE");
    await form.purchaseDateInput.fill("2026-06-01");
    // Intentionally leave reason empty
    await form.imageInput.setInputFiles(FIXTURE_IMAGE_PATH);
    await form.submit();

    await expect(
      page.locator('[role="alert"]').filter({ hasText: "wymagany" }).first()
    ).toBeVisible();
  });

  // AC-05 edge: whitespace-only reason for complaint
  test("AC-05 edge — whitespace-only reason shows Polish error", async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.requestTypeComplaint.check();
    await form.categorySelect.selectOption("Laptop");
    await form.modelInput.fill("TEST-APPROVE");
    await form.purchaseDateInput.fill("2026-06-01");
    await form.reasonTextarea.fill("   ");
    await form.imageInput.setInputFiles(FIXTURE_IMAGE_PATH);
    await form.submit();

    await expect(
      page.locator('[role="alert"]').filter({ hasText: "wymagany" }).first()
    ).toBeVisible();
  });

  // AC-08: unsupported image format shows error
  test("AC-08 — unsupported image format shows Polish error", async ({ page }) => {
    const form = new IntakeFormPage(page);

    // Fill required fields first
    await form.requestTypeReturn.check();
    await form.categorySelect.selectOption("Smartfon");
    await form.modelInput.fill("TEST-APPROVE");
    await form.purchaseDateInput.fill("2026-06-01");

    // Set a GIF file (not in accepted list)
    await form.imageInput.setInputFiles({
      name: "bad-format.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("GIF89a fake gif content"),
    });

    // The validation error should appear immediately (client-side) without submitting
    await expect(
      page.locator('[role="alert"]').filter({ hasText: "JPEG" }).first()
    ).toBeVisible();
  });

  // AC-09: oversized image shows error
  test("AC-09 — image over 10 MB shows Polish error", async ({ page }) => {
    const form = new IntakeFormPage(page);

    // Fill required fields first
    await form.requestTypeReturn.check();
    await form.categorySelect.selectOption("Smartfon");
    await form.modelInput.fill("TEST-APPROVE");
    await form.purchaseDateInput.fill("2026-06-01");

    // Create a fake 11MB JPEG buffer
    const oversized = Buffer.alloc(11 * 1024 * 1024, 0xff);

    await form.imageInput.setInputFiles({
      name: "big-image.jpg",
      mimeType: "image/jpeg",
      buffer: oversized,
    });

    // The validation error should appear immediately (client-side)
    await expect(
      page.locator('[role="alert"]').filter({ hasText: "10 MB" }).first()
    ).toBeVisible();
  });

  // AC-11: second image replaces first (single file)
  test("AC-11 — uploading a second image replaces the first", async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.imageInput.setInputFiles(FIXTURE_IMAGE_PATH);

    // Check preview shown
    const preview = page.locator('img[alt="Podgląd zdjęcia urządzenia"]');
    await expect(preview).toBeVisible();

    // Upload second image
    await form.imageInput.setInputFiles(FIXTURE_IMAGE_PATH);

    // Still only one preview (not two)
    await expect(preview).toHaveCount(1);
  });

  // AC-06: no image shows error
  test("AC-06 — submitting without image shows Polish error", async ({ page }) => {
    const form = new IntakeFormPage(page);
    await form.requestTypeReturn.check();
    await form.categorySelect.selectOption("Smartfon");
    await form.modelInput.fill("TEST-APPROVE");
    await form.purchaseDateInput.fill("2026-06-01");
    await form.submit();

    await expect(
      page.locator('[role="alert"]').filter({ hasText: "Zdjęcie" }).first()
    ).toBeVisible();
  });

  // AC-31: key labels are in Polish
  test("AC-31 — form labels are in Polish", async ({ page }) => {
    await expect(page.getByText("Typ zgłoszenia", { exact: true })).toBeVisible();
    await expect(page.getByText("Reklamacja", { exact: true })).toBeVisible();
    await expect(page.getByText("Zwrot", { exact: true })).toBeVisible();
    await expect(page.getByText("Kategoria sprzętu", { exact: true })).toBeVisible();
    await expect(page.getByText("Nazwa / model urządzenia", { exact: true })).toBeVisible();
    await expect(page.getByText("Data zakupu", { exact: true })).toBeVisible();
    await expect(page.getByText("Zdjęcie urządzenia", { exact: true })).toBeVisible();
    await expect(page.getByText("Wyślij zgłoszenie", { exact: true })).toBeVisible();
  });

  // AC-01: exactly two request type options
  test("AC-01 — two request type options: Reklamacja and Zwrot", async ({ page }) => {
    await expect(page.locator('input[name="requestType"]')).toHaveCount(2);
    await expect(page.getByText("Reklamacja", { exact: true })).toBeVisible();
    await expect(page.getByText("Zwrot", { exact: true })).toBeVisible();
  });

  // AC-02: equipment category selector has predefined list
  test("AC-02 — category dropdown has all 10 predefined options", async ({ page }) => {
    const categories = [
      "Smartfon", "Laptop", "Tablet", "Telewizor/Monitor",
      "Audio/Słuchawki", "Smartwatch/Wearable", "Aparat/Kamera",
      "Konsola do gier", "Sprzęt AGD", "Inne",
    ];
    const select = page.locator("#category");
    for (const cat of categories) {
      await expect(select.locator(`option[value="${cat}"]`)).toHaveCount(1);
    }
  });

  // AC-05: reason label changes based on request type
  test("AC-05 — reason label shows 'wymagany' for complaint and 'opcjonalny' for return", async ({ page }) => {
    // Default = return
    await expect(page.locator("text=opcjonalny")).toBeVisible();

    // Switch to complaint
    await page.locator('input[name="requestType"][value="complaint"]').check();
    await expect(page.locator("text=wymagany")).toBeVisible();
  });
});
