/**
 * POST /api/analyze — orchestration route
 * ADR-002 §3 (BE-1..4), ADR-000 §6.
 * Node.js runtime required for sharp (image compression).
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import {
  IntakeFormSchema,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  type CaseContext,
  type AnalyzeResponse,
  type UIMessage,
} from "@/lib/contracts";
import { compress } from "@/lib/image";
import { analyzeImage, decide } from "@/lib/ai/agent";

// ---------------------------------------------------------------------------
// Server-only image validation (BE-2)
// ---------------------------------------------------------------------------

function validateImageFile(
  file: File
): { valid: true } | { valid: false; message: string } {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      message: `Niedozwolony format pliku. Akceptowane formaty: JPEG, PNG, WebP. Otrzymano: ${file.type}.`,
    };
  }

  const maxBytes =
    process.env.MAX_IMAGE_MB
      ? parseInt(process.env.MAX_IMAGE_MB, 10) * 1024 * 1024
      : MAX_IMAGE_BYTES;

  if (file.size > maxBytes) {
    const limitMB = maxBytes / (1024 * 1024);
    return {
      valid: false,
      message: `Plik jest zbyt duży. Maksymalny rozmiar to ${limitMB} MB.`,
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Step 1: Parse multipart/form-data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { errors: { _form: "Nie można odczytać danych formularza." } },
      { status: 422 }
    );
  }

  // Step 2: Extract and validate form fields
  const rawFields = {
    requestType: formData.get("requestType"),
    category: formData.get("category"),
    model: formData.get("model"),
    purchaseDate: formData.get("purchaseDate"),
    reason: formData.get("reason") ?? undefined,
  };

  const parseResult = IntakeFormSchema.safeParse(rawFields);
  if (!parseResult.success) {
    const errors: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0]?.toString() ?? "_form";
      if (!errors[field]) {
        errors[field] = issue.message;
      }
    }
    return NextResponse.json({ errors }, { status: 422 });
  }

  const form = parseResult.data;

  // Step 2b: Validate image
  const imageValue = formData.get("image");
  if (!imageValue || !(imageValue instanceof File)) {
    return NextResponse.json(
      { errors: { image: "Zdjęcie urządzenia jest wymagane." } },
      { status: 422 }
    );
  }

  const imageValidation = validateImageFile(imageValue);
  if (!imageValidation.valid) {
    return NextResponse.json(
      { errors: { image: imageValidation.message } },
      { status: 422 }
    );
  }

  // Step 3: Compress image (BE-4 — never forward raw upload)
  let compressed: { bytes: Buffer; mediaType: string };
  try {
    compressed = await compress(imageValue);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd przetwarzania obrazu.";
    // Compression errors that reveal bad format are client errors
    if (message.includes("Niedozwolony format")) {
      return NextResponse.json({ errors: { image: message } }, { status: 422 });
    }
    return NextResponse.json(
      { error: "Błąd przetwarzania obrazu. Spróbuj ponownie.", retryable: true },
      { status: 503 }
    );
  }

  // Step 4: Vision call — analyzeImage
  const policyKind = form.requestType as "complaint" | "return";

  let imageAnalysis: Awaited<ReturnType<typeof analyzeImage>>;
  try {
    imageAnalysis = await analyzeImage({
      requestType: form.requestType,
      imageBytes: compressed.bytes,
      mediaType: compressed.mediaType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd analizy obrazu.";
    console.error("[analyze] analyzeImage failed:", message);
    return NextResponse.json(
      { error: "Usługa analizy obrazu jest tymczasowo niedostępna. Spróbuj ponownie.", retryable: true },
      { status: 503 }
    );
  }

  // Step 5: Decision call — decide
  const caseContext: CaseContext = {
    requestType: form.requestType,
    category: form.category,
    model: form.model,
    purchaseDate: form.purchaseDate,
    reason: form.reason,
    imageDescription: imageAnalysis.description,
    policyKind,
  };

  let decision: Awaited<ReturnType<typeof decide>>;
  try {
    decision = await decide({
      requestType: form.requestType,
      context: caseContext,
      analysis: imageAnalysis,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd generowania decyzji.";
    console.error("[analyze] decide failed:", message);
    return NextResponse.json(
      { error: "Usługa decyzyjna jest tymczasowo niedostępna. Spróbuj ponownie.", retryable: true },
      { status: 502 }
    );
  }

  // Step 6: Build seed assistant message and response
  const seedMessageContent = buildDecisionText(decision);
  const seedMessage: UIMessage = {
    id: randomUUID(),
    role: "assistant",
    content: seedMessageContent,
    parts: [{ type: "text", text: seedMessageContent }],
  };

  const responseBody: AnalyzeResponse = {
    decision,
    imageAnalysis: {
      description: imageAnalysis.description,
      usable: imageAnalysis.usable,
      signals: imageAnalysis.signals,
    },
    seedMessages: [seedMessage],
    context: caseContext,
  };

  return NextResponse.json(responseBody, { status: 200 });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDecisionText(decision: Awaited<ReturnType<typeof decide>>): string {
  const parts: string[] = [];

  if (decision.greeting) {
    parts.push(decision.greeting);
  }

  parts.push(decision.justification);

  if (
    decision.outcome === "NEEDS_MORE_INFO" &&
    decision.missing &&
    decision.missing.length > 0
  ) {
    parts.push("Brakujące informacje:");
    for (const item of decision.missing) {
      parts.push(`- ${item}`);
    }
  }

  if (
    decision.outcome === "CONDITIONAL" &&
    decision.conditions &&
    decision.conditions.length > 0
  ) {
    parts.push("Warunki:");
    for (const cond of decision.conditions) {
      parts.push(`- ${cond}`);
    }
  }

  if (decision.nextSteps) {
    parts.push(decision.nextSteps);
  }

  parts.push(decision.disclaimer);

  return parts.join("\n\n");
}

