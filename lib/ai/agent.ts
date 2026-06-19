/**
 * Agent functions for the Hardware Service Decision Copilot.
 *
 * ADR-003 §3/§5: analyzeImage (multimodal model), decide (decision model),
 * chatStream (decision model). Two-model wiring (AI-1). Structured output (AI-2).
 * Policy injected per request (AI-3). Uncertainty → NEEDS_MORE_INFO (AI-5).
 */

import { generateText, generateObject, streamText } from "ai";
import { getMultimodalModel, getDecisionModel } from "./provider";
import {
  imageComplaint,
  imageReturn,
  decisionComplaint,
  decisionReturn,
  chatSystem,
} from "./prompts";
import { loadPolicy } from "@/lib/policies";
import {
  ImageAnalysisSchema,
  DecisionSchema,
  type ImageAnalysis,
  type Decision,
  type CaseContext,
  type UIMessage,
} from "@/lib/contracts";
import type { StreamTextResult } from "ai";

// ---------------------------------------------------------------------------
// analyzeImage — uses multimodal model (TAC-003-01, AI-1)
// ---------------------------------------------------------------------------

export interface AnalyzeImageInput {
  requestType: "complaint" | "return";
  imageBytes: Buffer;
  mediaType: string;
}

/**
 * Calls the multimodal vision model to analyse the image.
 * Returns ImageAnalysis with usable=false when the photo is unsuitable for
 * assessment (per ADR-003 AI-5, AC-30). Never fabricates a description.
 * Throws on provider failure (route maps to 502/503).
 */
export async function analyzeImage({
  requestType,
  imageBytes,
  mediaType,
}: AnalyzeImageInput): Promise<ImageAnalysis> {
  const prompt = requestType === "complaint" ? imageComplaint() : imageReturn();
  const model = getMultimodalModel();

  const result = await generateText({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image",
            image: imageBytes,
            mimeType: mediaType,
          },
        ],
      },
    ],
  });

  // Try to extract JSON from the response text; set usable=false on parse failure
  // (never fabricate, AC-30 / ADR-003 AI-5)
  return parseImageAnalysis(result.text);
}

function parseImageAnalysis(text: string): ImageAnalysis {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      description: "Nie udało się odczytać odpowiedzi modelu. Zdjęcie nie nadaje się do oceny.",
      usable: false,
      signals: null,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return {
      description: "Nie udało się przetworzyć odpowiedzi modelu. Zdjęcie nie nadaje się do oceny.",
      usable: false,
      signals: null,
    };
  }

  const result = ImageAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    // Partial parse: preserve description if present
    const raw = parsed as Record<string, unknown>;
    return {
      description:
        typeof raw.description === "string"
          ? raw.description
          : "Analiza zdjęcia jest niedostępna.",
      usable: false,
      signals: null,
    };
  }

  return result.data;
}

// ---------------------------------------------------------------------------
// decide — uses decision model (TAC-003-01, 02, 03, 08, AI-1/2/3/5)
// ---------------------------------------------------------------------------

export interface DecideInput {
  requestType: "complaint" | "return";
  context: CaseContext;
  analysis: ImageAnalysis;
}

/**
 * Calls the decision model with schema-constrained output.
 * Throws if schema parsing fails or required fields are empty — never fabricates
 * a decision (ADR-003 AI-5, AC-30).
 * Returns NEEDS_MORE_INFO when analysis.usable is false (TAC-003-03).
 */
export async function decide({ requestType, context, analysis }: DecideInput): Promise<Decision> {
  const policy = await loadPolicy(requestType);

  // When the image is unusable, add an explicit instruction to return NEEDS_MORE_INFO
  // (ADR-003 AI-5, TAC-003-03). This steers the model even before Zod parses the output.
  const unusableNote = !analysis.usable
    ? "\n\nUWAGA KRYTYCZNA: Analiza zdjęcia wykazała, że zdjęcie NIE NADAJE SIĘ do oceny " +
      "(usable=false). MUSISZ zwrócić outcome=\"NEEDS_MORE_INFO\" z niepustą tablicą missing[]."
    : "";

  const basePrompt =
    requestType === "complaint"
      ? decisionComplaint(context, policy)
      : decisionReturn(context, policy);
  const prompt = basePrompt + unusableNote;

  const model = getDecisionModel();

  const result = await generateObject({
    model,
    schema: DecisionSchema,
    mode: "json",
    prompt,
  });

  const decision = result.object;

  // Post-parse validation: required prose fields must not be empty (TAC-003-02/08)
  if (!decision.justification || decision.justification.trim() === "") {
    throw new Error(
      "Decyzja modelu nie zawiera uzasadnienia. Zgłoszenie wymaga ponownej analizy."
    );
  }
  if (!decision.disclaimer || decision.disclaimer.trim() === "") {
    throw new Error(
      "Decyzja modelu nie zawiera wymaganego zastrzeżenia niewiążącego. Zgłoszenie wymaga ponownej analizy."
    );
  }

  return decision;
}

// ---------------------------------------------------------------------------
// chatStream — uses decision model (TAC-003-01, 06, AI-1)
// ---------------------------------------------------------------------------

export interface ChatStreamInput {
  context: CaseContext;
  messages: UIMessage[];
}

/**
 * Streams a chat response using the decision model.
 * Returns the StreamTextResult — the route calls result.toDataStreamResponse()
 * to produce the useChat-compatible v4 stream (ADR-002 BE-1).
 */
export async function chatStream({
  context,
  messages,
}: ChatStreamInput): Promise<StreamTextResult<Record<string, never>, undefined>> {
  const policy = await loadPolicy(context.policyKind);
  const systemPrompt = chatSystem(context, policy);
  const model = getDecisionModel();

  return streamText({
    model,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  });
}
