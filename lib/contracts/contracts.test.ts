/**
 * contracts.test.ts — TDD tests for shared Zod contracts
 * Environment: node (Vitest node project)
 */

import { describe, it, expect } from "vitest";
import {
  IntakeFormSchema,
  DecisionSchema,
  ImageAnalysisSchema,
  CaseContextSchema,
  AnalyzeResponseSchema,
  ChatRequestBodySchema,
  validateImageFile,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from "./index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function pastISO(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function futureISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const validComplaintBase = {
  requestType: "complaint" as const,
  category: "Smartfon" as const,
  model: "Samsung Galaxy S23",
  purchaseDate: pastISO(),
  reason: "Usterka baterii — telefon nie ładuje się prawidłowo",
};

const validReturnBase = {
  requestType: "return" as const,
  category: "Laptop" as const,
  model: "Dell XPS 15",
  purchaseDate: pastISO(),
};

// ---------------------------------------------------------------------------
// IntakeFormSchema — AC-04: purchaseDate
// ---------------------------------------------------------------------------

describe("IntakeFormSchema — AC-04 purchaseDate", () => {
  it("rejects a future date", () => {
    const result = IntakeFormSchema.safeParse({
      ...validComplaintBase,
      purchaseDate: futureISO(),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      // Must be Polish
      expect(msg).toMatch(/przyszło|przyszłość|dzisiaj|data|nie może/i);
    }
  });

  it("accepts today's date", () => {
    const result = IntakeFormSchema.safeParse({
      ...validComplaintBase,
      purchaseDate: todayISO(),
    });
    expect(result.success).toBe(true);
  });

  it("accepts a past date", () => {
    const result = IntakeFormSchema.safeParse({
      ...validComplaintBase,
      purchaseDate: pastISO(),
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// IntakeFormSchema — AC-05: reason required for complaint
// ---------------------------------------------------------------------------

describe("IntakeFormSchema — AC-05 reason", () => {
  it("rejects complaint without reason", () => {
    const result = IntakeFormSchema.safeParse({
      ...validComplaintBase,
      reason: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message).join(" ");
      expect(msgs).toMatch(/wymagany|opis|powód|reklamacja/i);
    }
  });

  it("rejects complaint with whitespace-only reason", () => {
    const result = IntakeFormSchema.safeParse({
      ...validComplaintBase,
      reason: "   ",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message).join(" ");
      expect(msgs).toMatch(/wymagany|opis|powód|reklamacja/i);
    }
  });

  it("accepts complaint with valid reason", () => {
    const result = IntakeFormSchema.safeParse({
      ...validComplaintBase,
      reason: "Ekran przestał działać",
    });
    expect(result.success).toBe(true);
  });

  it("accepts return without reason", () => {
    const result = IntakeFormSchema.safeParse({
      ...validReturnBase,
      reason: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("accepts return with reason provided", () => {
    const result = IntakeFormSchema.safeParse({
      ...validReturnBase,
      reason: "Zmieniłem zdanie",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// IntakeFormSchema — AC-03: model non-empty
// ---------------------------------------------------------------------------

describe("IntakeFormSchema — AC-03 model", () => {
  it("rejects empty model string", () => {
    const result = IntakeFormSchema.safeParse({
      ...validComplaintBase,
      model: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message).join(" ");
      expect(msgs).toMatch(/model|nazwa|wymagany|pusty/i);
    }
  });

  it("rejects whitespace-only model", () => {
    const result = IntakeFormSchema.safeParse({
      ...validComplaintBase,
      model: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid model name", () => {
    const result = IntakeFormSchema.safeParse(validComplaintBase);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// IntakeFormSchema — AC-02: category enum
// ---------------------------------------------------------------------------

describe("IntakeFormSchema — AC-02 category enum", () => {
  it("rejects an invalid category", () => {
    const result = IntakeFormSchema.safeParse({
      ...validComplaintBase,
      category: "InvalidCategory",
    });
    expect(result.success).toBe(false);
  });

  it("accepts 'Smartfon'", () => {
    const result = IntakeFormSchema.safeParse({
      ...validComplaintBase,
      category: "Smartfon",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all 10 valid categories", () => {
    const categories = [
      "Smartfon",
      "Laptop",
      "Tablet",
      "Telewizor/Monitor",
      "Audio/Słuchawki",
      "Smartwatch/Wearable",
      "Aparat/Kamera",
      "Konsola do gier",
      "Sprzęt AGD",
      "Inne",
    ] as const;
    for (const category of categories) {
      const result = IntakeFormSchema.safeParse({
        ...validComplaintBase,
        category,
      });
      expect(result.success, `category ${category} should be valid`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Image validation helper — AC-08: allowed types, AC-09: size limit
// ---------------------------------------------------------------------------

describe("validateImageFile — AC-08/09", () => {
  it("rejects a disallowed MIME type (gif)", () => {
    const result = validateImageFile({ type: "image/gif", size: 1024 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toMatch(/format|JPEG|PNG|WebP/i);
    }
  });

  it("rejects a file over 10 MB", () => {
    const result = validateImageFile({
      type: "image/jpeg",
      size: MAX_IMAGE_BYTES + 1,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toMatch(/10|MB|rozmiar|limit/i);
    }
  });

  it("accepts image/jpeg within size limit", () => {
    const result = validateImageFile({ type: "image/jpeg", size: 1024 * 1024 });
    expect(result.valid).toBe(true);
  });

  it("accepts image/png within size limit", () => {
    const result = validateImageFile({ type: "image/png", size: 512 });
    expect(result.valid).toBe(true);
  });

  it("accepts image/webp within size limit", () => {
    const result = validateImageFile({ type: "image/webp", size: 2 * 1024 * 1024 });
    expect(result.valid).toBe(true);
  });

  it("accepts exactly 10 MB", () => {
    const result = validateImageFile({ type: "image/jpeg", size: MAX_IMAGE_BYTES });
    expect(result.valid).toBe(true);
  });

  it("exports ALLOWED_IMAGE_TYPES with exactly 3 entries", () => {
    expect(ALLOWED_IMAGE_TYPES).toHaveLength(3);
    expect(ALLOWED_IMAGE_TYPES).toContain("image/jpeg");
    expect(ALLOWED_IMAGE_TYPES).toContain("image/png");
    expect(ALLOWED_IMAGE_TYPES).toContain("image/webp");
  });
});

// ---------------------------------------------------------------------------
// DecisionSchema
// ---------------------------------------------------------------------------

const validDecisionBase = {
  outcome: "APPROVE" as const,
  greeting: "Dzień dobry! Oto wstępna ocena Twojego zgłoszenia.",
  justification:
    "Produkt został zakupiony 5 dni temu i spełnia warunki zwrotu w ciągu 14 dni.",
  nextSteps: "Skontaktuj się z działem obsługi klienta, aby zainicjować zwrot.",
  missing: null,
  conditions: null,
  disclaimer:
    "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.",
};

describe("DecisionSchema — full valid Decision", () => {
  it("parses a valid APPROVE decision", () => {
    const result = DecisionSchema.safeParse(validDecisionBase);
    expect(result.success).toBe(true);
  });

  it("parses all 5 outcomes", () => {
    const outcomes = [
      "APPROVE",
      "REJECT",
      "NEEDS_MORE_INFO",
      "CONDITIONAL",
      "ESCALATE",
    ] as const;
    for (const outcome of outcomes) {
      const result = DecisionSchema.safeParse({ ...validDecisionBase, outcome });
      expect(result.success, `outcome ${outcome} should be valid`).toBe(true);
    }
  });

  it("parses NEEDS_MORE_INFO with missing array", () => {
    const result = DecisionSchema.safeParse({
      ...validDecisionBase,
      outcome: "NEEDS_MORE_INFO",
      missing: ["Wyraźne zdjęcie uszkodzenia", "Data zakupu"],
    });
    expect(result.success).toBe(true);
  });

  it("parses CONDITIONAL with conditions array", () => {
    const result = DecisionSchema.safeParse({
      ...validDecisionBase,
      outcome: "CONDITIONAL",
      conditions: ["Urządzenie musi być w oryginalnym opakowaniu"],
    });
    expect(result.success).toBe(true);
  });
});

describe("DecisionSchema — validation failures", () => {
  it("rejects empty justification", () => {
    const result = DecisionSchema.safeParse({
      ...validDecisionBase,
      justification: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty disclaimer", () => {
    const result = DecisionSchema.safeParse({
      ...validDecisionBase,
      disclaimer: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty greeting", () => {
    const result = DecisionSchema.safeParse({
      ...validDecisionBase,
      greeting: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid outcome", () => {
    const result = DecisionSchema.safeParse({
      ...validDecisionBase,
      outcome: "UNKNOWN_OUTCOME",
    });
    expect(result.success).toBe(false);
  });
});

describe("DecisionSchema — Polish error messages", () => {
  it("justification error message is Polish", () => {
    const result = DecisionSchema.safeParse({
      ...validDecisionBase,
      justification: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message).join(" ");
      expect(msgs).toMatch(/uzasadnienie|wymagane|puste/i);
    }
  });

  it("disclaimer error message is Polish", () => {
    const result = DecisionSchema.safeParse({
      ...validDecisionBase,
      disclaimer: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message).join(" ");
      expect(msgs).toMatch(/zastrzeżenie|wymagane|puste/i);
    }
  });
});

// ---------------------------------------------------------------------------
// ImageAnalysisSchema
// ---------------------------------------------------------------------------

describe("ImageAnalysisSchema", () => {
  it("parses a minimal valid image analysis (usable, no signals)", () => {
    const result = ImageAnalysisSchema.safeParse({
      description: "Urządzenie wygląda na nowe, bez widocznych uszkodzeń.",
      usable: true,
      signals: null,
    });
    expect(result.success).toBe(true);
  });

  it("parses unusable image", () => {
    const result = ImageAnalysisSchema.safeParse({
      description: "Zdjęcie jest zbyt rozmyte, aby ocenić stan urządzenia.",
      usable: false,
      signals: null,
    });
    expect(result.success).toBe(true);
  });

  it("parses with signals object", () => {
    const result = ImageAnalysisSchema.safeParse({
      description: "Widoczne pęknięcie ekranu.",
      usable: true,
      signals: { damageType: "Pęknięcie ekranu", likelyCause: "Uszkodzenie mechaniczne" },
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CaseContextSchema
// ---------------------------------------------------------------------------

describe("CaseContextSchema", () => {
  it("parses a valid complaint context", () => {
    const result = CaseContextSchema.safeParse({
      requestType: "complaint",
      category: "Smartfon",
      model: "iPhone 15",
      purchaseDate: pastISO(),
      reason: "Martwy piksel na ekranie",
      imageDescription: "Ekran z wyraźnie widocznym martwym pikselem.",
      policyKind: "complaint",
    });
    expect(result.success).toBe(true);
  });

  it("parses a valid return context without reason", () => {
    const result = CaseContextSchema.safeParse({
      requestType: "return",
      category: "Laptop",
      model: "MacBook Air",
      purchaseDate: pastISO(),
      imageDescription: "Urządzenie w stanie nienaruszonym.",
      policyKind: "return",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AnalyzeResponseSchema
// ---------------------------------------------------------------------------

describe("AnalyzeResponseSchema", () => {
  it("parses a valid analyze response", () => {
    const seedMessage = {
      id: "msg-1",
      role: "assistant" as const,
      content: "Oto wstępna ocena Twojego zgłoszenia.",
    };
    const result = AnalyzeResponseSchema.safeParse({
      decision: validDecisionBase,
      imageAnalysis: {
        description: "Brak widocznych uszkodzeń.",
        usable: true,
        signals: null,
      },
      seedMessages: [seedMessage],
      context: {
        requestType: "return",
        category: "Laptop",
        model: "MacBook Air",
        purchaseDate: pastISO(),
        imageDescription: "Brak widocznych uszkodzeń.",
        policyKind: "return",
      },
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ChatRequestBodySchema
// ---------------------------------------------------------------------------

describe("ChatRequestBodySchema", () => {
  it("parses a valid chat request body", () => {
    const result = ChatRequestBodySchema.safeParse({
      messages: [
        { id: "1", role: "user", content: "Mam pytanie dotyczące mojego zwrotu." },
        {
          id: "2",
          role: "assistant",
          content: "Oczywiście, proszę podaj szczegóły.",
        },
      ],
      context: {
        requestType: "return",
        category: "Tablet",
        model: "iPad Pro",
        purchaseDate: pastISO(),
        imageDescription: "Tablet bez uszkodzeń.",
        policyKind: "return",
      },
    });
    expect(result.success).toBe(true);
  });
});
