/**
 * Page Object Model — Intake Form screen.
 */
import { type Page, type Locator } from "@playwright/test";
import path from "path";

export const FIXTURE_IMAGE_PATH = path.join(__dirname, "../fixtures/device.jpg");

export class IntakeFormPage {
  readonly page: Page;

  // Locators
  readonly requestTypeReturn: Locator;
  readonly requestTypeComplaint: Locator;
  readonly categorySelect: Locator;
  readonly modelInput: Locator;
  readonly purchaseDateInput: Locator;
  readonly reasonTextarea: Locator;
  readonly imageInput: Locator;
  readonly submitButton: Locator;
  readonly loadingText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.requestTypeReturn = page.locator('input[name="requestType"][value="return"]');
    this.requestTypeComplaint = page.locator('input[name="requestType"][value="complaint"]');
    this.categorySelect = page.locator('#category');
    this.modelInput = page.locator('#model');
    this.purchaseDateInput = page.locator('#purchaseDate');
    this.reasonTextarea = page.locator('#reason');
    this.imageInput = page.locator('[data-testid="image-input"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.loadingText = page.locator('text=Analizujemy zdjęcie i przygotowujemy ocenę');
  }

  async goto() {
    await this.page.goto("/");
  }

  /** Fill the full form for a Return request */
  async fillReturnForm(opts: {
    model?: string;
    purchaseDate?: string;
    reason?: string;
    imagePath?: string;
  } = {}) {
    const {
      model = "TEST-APPROVE",
      purchaseDate = "2026-06-01",
      reason,
      imagePath = FIXTURE_IMAGE_PATH,
    } = opts;

    await this.requestTypeReturn.check();
    await this.categorySelect.selectOption("Smartfon");
    await this.modelInput.fill(model);
    await this.purchaseDateInput.fill(purchaseDate);
    if (reason !== undefined) {
      await this.reasonTextarea.fill(reason);
    }
    await this.imageInput.setInputFiles(imagePath);
  }

  /** Fill the full form for a Complaint request */
  async fillComplaintForm(opts: {
    model?: string;
    purchaseDate?: string;
    reason?: string;
    imagePath?: string;
  } = {}) {
    const {
      model = "TEST-APPROVE",
      purchaseDate = "2026-06-01",
      reason = "Martwe piksele na ekranie.",
      imagePath = FIXTURE_IMAGE_PATH,
    } = opts;

    await this.requestTypeComplaint.check();
    await this.categorySelect.selectOption("Laptop");
    await this.modelInput.fill(model);
    await this.purchaseDateInput.fill(purchaseDate);
    await this.reasonTextarea.fill(reason);
    await this.imageInput.setInputFiles(imagePath);
  }

  async submit() {
    await this.submitButton.click();
  }

  /** Field error locator for a given field name */
  fieldError(fieldHint: string): Locator {
    // FieldError components render a <p> with a specific message pattern
    return this.page.locator(`[role="alert"]`).filter({ hasText: fieldHint }).first();
  }

  /** Generic: any text containing hint on the page */
  errorContaining(hint: string): Locator {
    return this.page.locator(`text=${hint}`).first();
  }
}
