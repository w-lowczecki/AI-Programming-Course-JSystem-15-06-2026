/**
 * Integration tests for POST /api/analyze
 * Strategy: mock ONLY the LLM (lib/ai/agent functions). TAC-002-01..05.
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import sharp from "sharp";

// ---------------------------------------------------------------------------
// Mock lib/ai/agent — only the LLM layer is mocked
// ---------------------------------------------------------------------------

const { mockAnalyzeImage, mockDecide } = vi.hoisted(() => ({
  mockAnalyzeImage: vi.fn(),
  mockDecide: vi.fn(),
}));

vi.mock("@/lib/ai/agent", () => ({
  analyzeImage: mockAnalyzeImage,
  decide: mockDecide,
  chatStream: vi.fn(),
}));

// Import route handler AFTER mocks
import { POST } from "./route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let validJpegBytes: Buffer;

beforeAll(async () => {
  validJpegBytes = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
});

const VALID_ANALYSIS = {
  description: "Urządzenie wykazuje pęknięcie ekranu.",
  usable: true,
  signals: { damaged: true, damageType: "pęknięcie ekranu", likelyCause: "wada fabryczna" },
};

const UNUSABLE_ANALYSIS = {
  description: "Zdjęcie jest niewyraźne.",
  usable: false,
  signals: null,
};

const VALID_DECISION = {
  outcome: "APPROVE" as const,
  greeting: "Dzień dobry",
  justification: "Zgodnie z §1 polityki reklamacji urządzenie spełnia warunki.",
  nextSteps: "Prosimy dostarczyć urządzenie do serwisu.",
  missing: null,
  conditions: null,
  disclaimer: "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.",
};

const NEEDS_MORE_INFO_DECISION = {
  outcome: "NEEDS_MORE_INFO" as const,
  greeting: "Dzień dobry",
  justification: "Zgodnie z §1 brak wystarczających informacji.",
  nextSteps: "Prosimy dostarczyć wyraźne zdjęcie.",
  missing: ["Wyraźne zdjęcie urządzenia"],
  conditions: null,
  disclaimer: "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.",
};

// ---------------------------------------------------------------------------
// Helper: build multipart/form-data Request
// ---------------------------------------------------------------------------

function buildFormDataRequest(fields: Record<string, string>, imageFile?: {
  bytes: Buffer;
  type: string;
  name: string;
}): Request {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  if (imageFile) {
    const blob = new Blob([imageFile.bytes], { type: imageFile.type });
    const file = new File([blob], imageFile.name, { type: imageFile.type });
    formData.append("image", file);
  }

  return new Request("http://localhost/api/analyze", {
    method: "POST",
    body: formData,
  });
}

const VALID_COMPLAINT_FIELDS = {
  requestType: "complaint",
  category: "Smartfon",
  model: "iPhone 14",
  purchaseDate: "2024-01-15",
  reason: "Pęknięty ekran po kilku tygodniach użytkowania.",
};

const VALID_RETURN_FIELDS = {
  requestType: "return",
  category: "Laptop",
  model: "MacBook Pro",
  purchaseDate: "2024-01-15",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/analyze", () => {
  beforeEach(() => {
    mockAnalyzeImage.mockReset();
    mockDecide.mockReset();
    mockAnalyzeImage.mockResolvedValue(VALID_ANALYSIS);
    mockDecide.mockResolvedValue(VALID_DECISION);
  });

  // --- TAC-002-01: Validation ---

  it("TAC-002-01: valid complaint → 200 with decision and disclaimer", async () => {
    const req = buildFormDataRequest(VALID_COMPLAINT_FIELDS, {
      bytes: validJpegBytes,
      type: "image/jpeg",
      name: "test.jpg",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.decision).toBeDefined();
    expect(body.decision.outcome).toBe("APPROVE");
    expect(body.decision.disclaimer).toBeTruthy();
    expect(body.imageAnalysis).toBeDefined();
    expect(body.seedMessages).toBeInstanceOf(Array);
    expect(body.context).toBeDefined();
  });

  it("TAC-002-01: missing reason for complaint → 422 with Polish field error", async () => {
    const req = buildFormDataRequest(
      { ...VALID_COMPLAINT_FIELDS, reason: "" },
      { bytes: validJpegBytes, type: "image/jpeg", name: "test.jpg" }
    );

    const res = await POST(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.errors).toBeDefined();
    expect(body.errors.reason).toBeTruthy();
    // Must be Polish
    expect(body.errors.reason).toMatch(/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/);

    // No LLM call on validation failure (TAC-002-01)
    expect(mockAnalyzeImage).not.toHaveBeenCalled();
    expect(mockDecide).not.toHaveBeenCalled();
  });

  it("TAC-002-01: future purchase date → 422 with Polish field error", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const req = buildFormDataRequest(
      { ...VALID_COMPLAINT_FIELDS, purchaseDate: futureDate },
      { bytes: validJpegBytes, type: "image/jpeg", name: "test.jpg" }
    );

    const res = await POST(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.errors.purchaseDate).toBeTruthy();
    expect(mockAnalyzeImage).not.toHaveBeenCalled();
  });

  it("TAC-002-01: missing image → 422 with Polish field error", async () => {
    const req = buildFormDataRequest(VALID_COMPLAINT_FIELDS);

    const res = await POST(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.errors.image).toBeTruthy();
    expect(mockAnalyzeImage).not.toHaveBeenCalled();
  });

  it("TAC-002-01: invalid image format (gif) → 422 naming accepted formats", async () => {
    // Create a fake GIF header
    const gifBytes = Buffer.from("GIF89a" + "\x00".repeat(100));
    const req = buildFormDataRequest(VALID_COMPLAINT_FIELDS, {
      bytes: gifBytes,
      type: "image/gif",
      name: "test.gif",
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.errors.image).toBeTruthy();
    const errorMsg: string = body.errors.image;
    // Should mention accepted formats
    expect(errorMsg.toLowerCase()).toMatch(/jpeg|png|webp/i);
    expect(mockAnalyzeImage).not.toHaveBeenCalled();
  });

  it("TAC-002-01: oversized image → 422 mentioning size limit", async () => {
    // Build a 10 MB + 1 byte fake file (type ok, size too large)
    const oversizedBytes = Buffer.alloc(10 * 1024 * 1024 + 1, 0);
    const req = buildFormDataRequest(VALID_COMPLAINT_FIELDS, {
      bytes: oversizedBytes,
      type: "image/jpeg",
      name: "big.jpg",
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.errors.image).toBeTruthy();
    expect(mockAnalyzeImage).not.toHaveBeenCalled();
  });

  // --- TAC-002-03: usable=false → NEEDS_MORE_INFO ---

  it("TAC-002-03: mocked usable=false → 200 with NEEDS_MORE_INFO decision", async () => {
    mockAnalyzeImage.mockResolvedValue(UNUSABLE_ANALYSIS);
    mockDecide.mockResolvedValue(NEEDS_MORE_INFO_DECISION);

    const req = buildFormDataRequest(VALID_COMPLAINT_FIELDS, {
      bytes: validJpegBytes,
      type: "image/jpeg",
      name: "test.jpg",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.decision.outcome).toBe("NEEDS_MORE_INFO");
    expect(Array.isArray(body.decision.missing)).toBe(true);
    expect(body.decision.missing.length).toBeGreaterThan(0);
  });

  // --- TAC-002-04: provider failure → retryable error ---

  it("TAC-002-04: analyzeImage throws → 502/503 retryable, no decision", async () => {
    mockAnalyzeImage.mockRejectedValue(new Error("OpenRouter 503"));

    const req = buildFormDataRequest(VALID_COMPLAINT_FIELDS, {
      bytes: validJpegBytes,
      type: "image/jpeg",
      name: "test.jpg",
    });

    const res = await POST(req);
    expect([502, 503]).toContain(res.status);

    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.retryable).toBe(true);
    expect(body.decision).toBeUndefined();
  });

  it("TAC-002-04: decide throws → 502/503 retryable, no decision", async () => {
    mockDecide.mockRejectedValue(new Error("LLM schema error"));

    const req = buildFormDataRequest(VALID_COMPLAINT_FIELDS, {
      bytes: validJpegBytes,
      type: "image/jpeg",
      name: "test.jpg",
    });

    const res = await POST(req);
    expect([502, 503]).toContain(res.status);

    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.retryable).toBe(true);
    expect(body.decision).toBeUndefined();
  });

  // --- TAC-002-05: two-model wiring ---

  it("TAC-002-05: analyzeImage called with correct requestType and image data", async () => {
    const req = buildFormDataRequest(VALID_RETURN_FIELDS, {
      bytes: validJpegBytes,
      type: "image/jpeg",
      name: "test.jpg",
    });

    await POST(req);

    expect(mockAnalyzeImage).toHaveBeenCalledOnce();
    const [analyzeArg] = mockAnalyzeImage.mock.calls[0];
    expect(analyzeArg.requestType).toBe("return");
    expect(analyzeArg.mediaType).toBe("image/jpeg");
    expect(Buffer.isBuffer(analyzeArg.imageBytes)).toBe(true);
  });

  it("decide is called with form fields + analysis + policyKind", async () => {
    const req = buildFormDataRequest(VALID_COMPLAINT_FIELDS, {
      bytes: validJpegBytes,
      type: "image/jpeg",
      name: "test.jpg",
    });

    await POST(req);

    expect(mockDecide).toHaveBeenCalledOnce();
    const [decideArg] = mockDecide.mock.calls[0];
    expect(decideArg.requestType).toBe("complaint");
    expect(decideArg.analysis).toEqual(VALID_ANALYSIS);
    expect(decideArg.context.policyKind).toBe("complaint");
    expect(decideArg.context.model).toBe("iPhone 14");
  });

  // --- Response shape ---

  it("200 response includes seedMessages with assistant message", async () => {
    const req = buildFormDataRequest(VALID_COMPLAINT_FIELDS, {
      bytes: validJpegBytes,
      type: "image/jpeg",
      name: "test.jpg",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(body.seedMessages).toBeInstanceOf(Array);
    expect(body.seedMessages.length).toBeGreaterThan(0);
    const assistantMsg = body.seedMessages.find(
      (m: { role: string }) => m.role === "assistant"
    );
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.id).toBeTruthy();
  });

  it("200 response context echoes form fields and imageDescription", async () => {
    const req = buildFormDataRequest(VALID_COMPLAINT_FIELDS, {
      bytes: validJpegBytes,
      type: "image/jpeg",
      name: "test.jpg",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(body.context.requestType).toBe("complaint");
    expect(body.context.model).toBe("iPhone 14");
    expect(body.context.category).toBe("Smartfon");
    expect(body.context.imageDescription).toBe(VALID_ANALYSIS.description);
    expect(body.context.policyKind).toBe("complaint");
  });

  // --- MAX_IMAGE_MB env override ---

  it("MAX_IMAGE_MB env var overrides the default 10 MB image size limit", async () => {
    const originalMaxImageMb = process.env.MAX_IMAGE_MB;
    try {
      // Set a 1 MB limit via env
      process.env.MAX_IMAGE_MB = "1";
      // A 1 MB + 1 byte file should now be rejected
      const oversizedBytes = Buffer.alloc(1 * 1024 * 1024 + 1, 0);
      const req = buildFormDataRequest(VALID_COMPLAINT_FIELDS, {
        bytes: oversizedBytes,
        type: "image/jpeg",
        name: "medium.jpg",
      });

      const res = await POST(req);
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.errors.image).toMatch(/1 MB/);
      expect(mockAnalyzeImage).not.toHaveBeenCalled();
    } finally {
      // Restore env
      if (originalMaxImageMb === undefined) {
        delete process.env.MAX_IMAGE_MB;
      } else {
        process.env.MAX_IMAGE_MB = originalMaxImageMb;
      }
    }
  });
});
