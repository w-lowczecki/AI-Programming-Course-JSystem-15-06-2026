import { describe, it, expect } from "vitest";
import {
  imageComplaint,
  imageReturn,
  decisionComplaint,
  decisionReturn,
  chatSystem,
} from "./prompts";
import type { CaseContext } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleContext: CaseContext = {
  requestType: "complaint",
  category: "Smartfon",
  model: "Samsung Galaxy S22",
  purchaseDate: "2024-01-15",
  reason: "Martwe piksele na ekranie",
  imageDescription: "Widoczne martwe piksele w górnym rogu ekranu.",
  policyKind: "complaint",
};

const returnContext: CaseContext = {
  requestType: "return",
  category: "Laptop",
  model: "Dell XPS 15",
  purchaseDate: "2024-06-01",
  imageDescription: "Urządzenie w stanie nienaruszonym, bez śladów użytkowania.",
  policyKind: "return",
};

const samplePolicy = `## Polityka testowa\n\nSekcja 1: Towar musi być sprawdzony.`;

// ---------------------------------------------------------------------------
// imageComplaint
// ---------------------------------------------------------------------------

describe("imageComplaint", () => {
  it("returns a non-empty string in Polish", () => {
    const prompt = imageComplaint();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(50);
    // Contains Polish text indicators
    expect(prompt).toMatch(/[ąęćłńóśźżĄĘĆŁŃÓŚŹŻ]/);
  });

  it("asks about damage, damage type, and likely cause (AC-12)", () => {
    const prompt = imageComplaint();
    // Must ask about whether device is damaged
    expect(prompt.toLowerCase()).toMatch(/uszkodz|wada|usterka|defekt/);
    // Must ask about damage type
    expect(prompt.toLowerCase()).toMatch(/typ|rodzaj|charakter/);
    // Must ask about likely cause — manufacturing defect vs user-caused
    expect(prompt.toLowerCase()).toMatch(/przyczyn|powód|użytkownik|producent|fabryk|mechanicz/);
  });

  it("instructs the model to set usable=false for unusable images (AC-30)", () => {
    const prompt = imageComplaint();
    expect(prompt.toLowerCase()).toMatch(/niewyraźn|nieczyteln|nieużyteczn|usable|zdjęcie/);
  });

  it("instructs the model to respond in Polish", () => {
    const prompt = imageComplaint();
    expect(prompt.toLowerCase()).toMatch(/polsk|język polski/);
  });
});

// ---------------------------------------------------------------------------
// imageReturn
// ---------------------------------------------------------------------------

describe("imageReturn", () => {
  it("returns a non-empty string in Polish", () => {
    const prompt = imageReturn();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(50);
    expect(prompt).toMatch(/[ąęćłńóśźżĄĘĆŁŃÓŚŹŻ]/);
  });

  it("asks about signs of use or damage that prevent resale (AC-13)", () => {
    const prompt = imageReturn();
    expect(prompt.toLowerCase()).toMatch(/użytkow|ślady|odsprzedaż|odsprzedać|nowy|stan/);
    expect(prompt.toLowerCase()).toMatch(/uszkodz|zarys|pęknięcie|wgniecenie/);
  });

  it("instructs the model to set usable=false for unusable images", () => {
    const prompt = imageReturn();
    expect(prompt.toLowerCase()).toMatch(/niewyraźn|nieczyteln|nieużyteczn|usable|zdjęcie/);
  });

  it("complaint and return image prompts differ (AC-12 vs AC-13)", () => {
    const complaint = imageComplaint();
    const ret = imageReturn();
    expect(complaint).not.toBe(ret);
    // They differ meaningfully — different instructions
    expect(complaint.length).toBeGreaterThan(0);
    expect(ret.length).toBeGreaterThan(0);
    expect(complaint).not.toEqual(ret);
  });
});

// ---------------------------------------------------------------------------
// decisionComplaint
// ---------------------------------------------------------------------------

describe("decisionComplaint", () => {
  it("returns a non-empty string in Polish", () => {
    const prompt = decisionComplaint(sampleContext, samplePolicy);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
    expect(prompt).toMatch(/[ąęćłńóśźżĄĘĆŁŃÓŚŹŻ]/);
  });

  it("contains the injected policy text (AC-16)", () => {
    const prompt = decisionComplaint(sampleContext, samplePolicy);
    expect(prompt).toContain("Polityka testowa");
    expect(prompt).toContain("Sekcja 1");
  });

  it("contains case context fields (form data + image description)", () => {
    const prompt = decisionComplaint(sampleContext, samplePolicy);
    expect(prompt).toContain("Samsung Galaxy S22");
    expect(prompt).toContain("2024-01-15");
    expect(prompt).toContain("Martwe piksele na ekranie");
    expect(prompt).toContain("Widoczne martwe piksele");
  });

  it("requires disclaimer in the output (AC-19)", () => {
    const prompt = decisionComplaint(sampleContext, samplePolicy);
    expect(prompt.toLowerCase()).toMatch(/niewiążąc|zastrzeżen|wstępn|serwis/);
  });

  it("instructs not to invent rules beyond the policy (AC-17, ADR AI-3)", () => {
    const prompt = decisionComplaint(sampleContext, samplePolicy);
    expect(prompt.toLowerCase()).toMatch(/tylko|wyłącznie|dokument|polityk|nie wymyślaj|nie twórz/);
  });

  it("requires NEEDS_MORE_INFO when evidence is insufficient (AC-18)", () => {
    const prompt = decisionComplaint(sampleContext, samplePolicy);
    expect(prompt).toMatch(/NEEDS_MORE_INFO/);
  });
});

// ---------------------------------------------------------------------------
// decisionReturn
// ---------------------------------------------------------------------------

describe("decisionReturn", () => {
  it("returns a non-empty string in Polish", () => {
    const prompt = decisionReturn(returnContext, samplePolicy);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
    expect(prompt).toMatch(/[ąęćłńóśźżĄĘĆŁŃÓŚŹŻ]/);
  });

  it("contains the injected policy text", () => {
    const prompt = decisionReturn(returnContext, samplePolicy);
    expect(prompt).toContain("Polityka testowa");
  });

  it("contains return context fields", () => {
    const prompt = decisionReturn(returnContext, samplePolicy);
    expect(prompt).toContain("Dell XPS 15");
    expect(prompt).toContain("Urządzenie w stanie nienaruszonym");
  });

  it("requires disclaimer in the output (AC-19)", () => {
    const prompt = decisionReturn(returnContext, samplePolicy);
    expect(prompt.toLowerCase()).toMatch(/niewiążąc|zastrzeżen|wstępn|serwis/);
  });

  it("complaint and return decision prompts differ (AC-14)", () => {
    const complaintPrompt = decisionComplaint(sampleContext, samplePolicy);
    const returnPrompt = decisionReturn(returnContext, samplePolicy);
    // Strip context-specific fields to compare structural differences
    // They must differ even with similar input — different decision rules
    expect(complaintPrompt).not.toEqual(returnPrompt);
  });
});

// ---------------------------------------------------------------------------
// chatSystem
// ---------------------------------------------------------------------------

describe("chatSystem", () => {
  it("returns a non-empty string in Polish", () => {
    const prompt = chatSystem(sampleContext, samplePolicy);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
    expect(prompt).toMatch(/[ąęćłńóśźżĄĘĆŁŃÓŚŹŻ]/);
  });

  it("contains injected case context fields (AC-23, AC-26)", () => {
    const prompt = chatSystem(sampleContext, samplePolicy);
    expect(prompt).toContain("Samsung Galaxy S22");
    expect(prompt).toContain("Smartfon");
    expect(prompt).toContain("2024-01-15");
    expect(prompt).toContain("Martwe piksele");
    expect(prompt).toContain("Widoczne martwe piksele");
  });

  it("contains the injected policy text (AC-16 for chat)", () => {
    const prompt = chatSystem(sampleContext, samplePolicy);
    expect(prompt).toContain("Polityka testowa");
    expect(prompt).toContain("Sekcja 1");
  });

  it("mentions the off-topic decline rule (AC-26)", () => {
    const prompt = chatSystem(sampleContext, samplePolicy);
    expect(prompt.toLowerCase()).toMatch(/off-topic|poza tematem|niezwiązane|temat|odm|przekieruj/);
  });

  it("requires the non-binding disclaimer in chat responses (AC-19)", () => {
    const prompt = chatSystem(sampleContext, samplePolicy);
    expect(prompt.toLowerCase()).toMatch(/niewiążąc|zastrzeżen|wstępn|serwis/);
  });

  it("works with return context too", () => {
    const prompt = chatSystem(returnContext, samplePolicy);
    expect(prompt).toContain("Dell XPS 15");
    expect(prompt).toContain("Laptop");
    expect(prompt).toContain("Polityka testowa");
  });
});
