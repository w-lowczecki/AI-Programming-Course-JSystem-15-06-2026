// FROZEN CONTRACT — change only via an orchestrator-mediated contract step.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants — AC-08, AC-09
// ---------------------------------------------------------------------------

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// Image validation helper — works in both node and jsdom (no instanceof File)
// ---------------------------------------------------------------------------

export type ImageFileLike = { type: string; size: number };

export type ImageValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validateImageFile(file: ImageFileLike): ImageValidationResult {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      message: `Niedozwolony format pliku. Akceptowane formaty: JPEG, PNG, WebP.`,
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      valid: false,
      message: `Plik jest zbyt duży. Maksymalny rozmiar to 10 MB.`,
    };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Equipment category enum — AC-02 (exact 10 values from PRD)
// ---------------------------------------------------------------------------

export const EQUIPMENT_CATEGORIES = [
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

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// UIMessageSchema — permissive schema for AI SDK UIMessage
// Relaxed for @ai-sdk/react v4 useChat compatibility (2026-06-18):
//   useChat strips `id` from the wire payload when sendExtraMessageFields=false
//   (the default). Source: @ai-sdk/react/dist/index.js triggerRequest(), which
//   destructures only { role, content, experimental_attachments, data,
//   annotations, toolInvocations, parts } — no `id`.
// ---------------------------------------------------------------------------

export const UIMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["system", "user", "assistant", "data"]),
  content: z.string(),
  parts: z.array(z.record(z.unknown())).optional(),
});

export type UIMessage = z.infer<typeof UIMessageSchema>;

// ---------------------------------------------------------------------------
// IntakeFormSchema — AC-01…AC-05
// ---------------------------------------------------------------------------

export const IntakeFormSchema = z
  .object({
    requestType: z.enum(["complaint", "return"], {
      errorMap: () => ({
        message: "Wybierz typ zgłoszenia: reklamacja lub zwrot.",
      }),
    }),
    category: z.enum(EQUIPMENT_CATEGORIES, {
      errorMap: () => ({
        message: `Wybierz kategorię sprzętu z dostępnej listy.`,
      }),
    }),
    model: z
      .string()
      .trim()
      .min(1, { message: "Nazwa modelu urządzenia jest wymagana i nie może być pusta." }),
    purchaseDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Data zakupu musi być w formacie YYYY-MM-DD.",
      })
      .refine(
        (val) => {
          const today = new Date().toISOString().slice(0, 10);
          return val <= today;
        },
        {
          message:
            "Data zakupu nie może być datą z przyszłości. Podaj prawidłową datę zakupu.",
        }
      ),
    reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.requestType === "complaint") {
      const trimmed = data.reason?.trim() ?? "";
      if (trimmed.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reason"],
          message:
            "Opis usterki jest wymagany przy zgłoszeniu reklamacji. Proszę podaj powód reklamacji.",
        });
      }
    }
  });

export type IntakeForm = z.infer<typeof IntakeFormSchema>;

// ---------------------------------------------------------------------------
// ImageAnalysisSchema — ADR-003 §4
// ---------------------------------------------------------------------------

export const ImageSignalsSchema = z
  .object({
    damaged: z.boolean().optional(),
    damageType: z.string().optional(),
    signsOfUse: z.boolean().optional(),
    likelyCause: z.string().optional(),
  })
  .nullable();

export const ImageAnalysisSchema = z.object({
  description: z.string(),
  usable: z.boolean(),
  signals: ImageSignalsSchema,
});

export type ImageAnalysis = z.infer<typeof ImageAnalysisSchema>;

// ---------------------------------------------------------------------------
// DecisionSchema — ADR-003 §4, model-compatible: nullable not optional
// ---------------------------------------------------------------------------

export const DecisionSchema = z.object({
  outcome: z.enum(["APPROVE", "REJECT", "NEEDS_MORE_INFO", "CONDITIONAL", "ESCALATE"], {
    errorMap: () => ({
      message:
        "Wynik decyzji musi być jednym z: APPROVE, REJECT, NEEDS_MORE_INFO, CONDITIONAL, ESCALATE.",
    }),
  }),
  greeting: z
    .string()
    .min(1, { message: "Powitanie w decyzji jest wymagane i nie może być puste." }),
  justification: z
    .string()
    .min(1, { message: "Uzasadnienie decyzji jest wymagane i nie może być puste." }),
  nextSteps: z.string(),
  missing: z.array(z.string()).nullable(),
  conditions: z.array(z.string()).nullable(),
  disclaimer: z
    .string()
    .min(1, { message: "Zastrzeżenie o niewiążącym charakterze oceny jest wymagane i nie może być puste." }),
});

export type Decision = z.infer<typeof DecisionSchema>;

// ---------------------------------------------------------------------------
// CaseContextSchema — consumed by chat route, echoed back in AnalyzeResponse
// ---------------------------------------------------------------------------

export const CaseContextSchema = z.object({
  requestType: z.enum(["complaint", "return"]),
  category: z.enum(EQUIPMENT_CATEGORIES),
  model: z.string().trim().min(1),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
  imageDescription: z.string(),
  policyKind: z.enum(["complaint", "return"]),
});

export type CaseContext = z.infer<typeof CaseContextSchema>;

// ---------------------------------------------------------------------------
// AnalyzeResponseSchema — POST /api/analyze 200 body
// ---------------------------------------------------------------------------

export const AnalyzeResponseSchema = z.object({
  decision: DecisionSchema,
  imageAnalysis: ImageAnalysisSchema,
  seedMessages: z.array(UIMessageSchema),
  context: CaseContextSchema,
});

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

// ---------------------------------------------------------------------------
// ChatRequestBodySchema — POST /api/chat request body
// ---------------------------------------------------------------------------

export const ChatRequestBodySchema = z.object({
  messages: z.array(UIMessageSchema),
  context: CaseContextSchema,
});

export type ChatRequestBody = z.infer<typeof ChatRequestBodySchema>;
