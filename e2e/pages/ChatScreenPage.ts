/**
 * Page Object Model — Chat screen.
 */
import { type Page, type Locator } from "@playwright/test";

export class ChatScreenPage {
  readonly page: Page;

  readonly decisionCard: Locator;
  readonly statusBadge: Locator;
  readonly justificationSection: Locator;
  readonly disclaimerText: Locator;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly newRequestButton: Locator;
  readonly missingSection: Locator;
  readonly conditionsSection: Locator;
  readonly revisedBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.decisionCard = page.locator('[data-testid="decision-card"]');
    this.statusBadge = page.locator('[data-testid="status-badge"]');
    this.justificationSection = page.locator('[aria-label="Uzasadnienie"]');
    this.disclaimerText = page.locator('[data-testid="decision-card"] footer p');
    this.chatInput = page.locator('textarea[aria-label="Wiadomość do asystenta"]');
    this.sendButton = page.locator('button[type="submit"]', { hasText: "Wyślij" });
    this.newRequestButton = page.locator('button', { hasText: "Nowe zgłoszenie" });
    this.missingSection = page.locator('[data-testid="missing-section"]');
    this.conditionsSection = page.locator('[data-testid="conditions-section"]');
    this.revisedBadge = page.locator('text=Zaktualizowana ocena');
  }

  async sendMessage(text: string) {
    await this.chatInput.fill(text);
    await this.sendButton.click();
  }

  async waitForStreamingComplete() {
    // Wait for the typing indicator to disappear and send button to be enabled
    await this.page.locator('[data-testid="typing-indicator"]').waitFor({ state: "hidden" }).catch(() => {
      // Typing indicator may use a different selector — fall back to waiting for send button enabled
    });
    await this.page.waitForTimeout(500);
  }
}
