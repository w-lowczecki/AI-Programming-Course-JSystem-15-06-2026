/**
 * POST /api/chat — streaming chat continuation route
 * ADR-002 §3 (BE-1, BE-3), ADR-000 §6.
 * Returns a v4 AI SDK data stream response (toDataStreamResponse) compatible
 * with @ai-sdk/react useChat (AC-23/25/26).
 * Node.js runtime for consistency with /api/analyze (BE-3).
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ChatRequestBodySchema } from "@/lib/contracts";
import { chatStream } from "@/lib/ai/agent";

export async function POST(request: NextRequest): Promise<Response> {
  // Step 1: Parse JSON body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Nieprawidłowy format żądania. Wymagane dane JSON." },
      { status: 400 }
    );
  }

  // Step 2: Validate request body schema (ChatRequestBody)
  const parseResult = ChatRequestBodySchema.safeParse(rawBody);
  if (!parseResult.success) {
    const errors: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path.join(".") || "_body";
      if (!errors[field]) {
        errors[field] = issue.message;
      }
    }
    return NextResponse.json({ errors }, { status: 422 });
  }

  const { messages, context } = parseResult.data;

  // Step 3: Call chatStream — loads policy + builds system prompt internally
  let streamResult: Awaited<ReturnType<typeof chatStream>>;
  try {
    streamResult = await chatStream({ context, messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd serwisu czatu.";
    console.error("[chat] chatStream failed:", message);
    return NextResponse.json(
      { error: "Usługa czatu jest tymczasowo niedostępna. Spróbuj ponownie.", retryable: true },
      { status: 503 }
    );
  }

  // Step 4: Return v4 UI data stream response (useChat-compatible)
  // result.toDataStreamResponse() is the v4 method — NOT v5's toUIMessageStreamResponse()
  return streamResult.toDataStreamResponse();
}
