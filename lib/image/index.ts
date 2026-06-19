import sharp from "sharp";
import { ALLOWED_IMAGE_TYPES } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Constants — tunable bounds (AC-10, TAC-002-02)
// ---------------------------------------------------------------------------

/** Maximum longest-edge in pixels after downscaling. */
export const MAX_DIMENSION = 1568;

/** Maximum output byte size sent to the vision model. */
export const MAX_COMPRESSED_BYTES = 1.5 * 1024 * 1024; // 1.5 MB

/** JPEG quality for re-encoding. */
const JPEG_QUALITY = 80;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal duck-type that matches both Web API File/Blob and custom test shapes. */
interface FileLike {
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface CompressResult {
  bytes: Buffer;
  mediaType: string;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Compress and normalise an image before sending it to the vision model.
 *
 * Accepts:
 *   - A duck-typed `FileLike` (File, Blob, or test fixture with `.type`/`.arrayBuffer()`)
 *   - A raw `Buffer` (treated as JPEG — no format check, already validated upstream)
 *
 * Always outputs JPEG so the caller can pass a single consistent mediaType to the model.
 * The longest edge is capped at `MAX_DIMENSION`; quality is `JPEG_QUALITY`.
 */
export async function compress(input: FileLike | Buffer): Promise<CompressResult> {
  let buffer: Buffer;
  let inputType: string;

  if (Buffer.isBuffer(input)) {
    // Raw buffer path — treat as JPEG (used in tests with already-generated fixtures)
    buffer = input;
    inputType = "image/jpeg";
  } else {
    // FileLike path — validate format
    inputType = input.type;
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(inputType)) {
      throw new Error(
        `Niedozwolony format pliku. Akceptowane formaty: JPEG, PNG, WebP. Otrzymano: ${inputType}`
      );
    }
    const arrayBuffer = await input.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  const outputBuffer = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  return {
    bytes: outputBuffer,
    mediaType: "image/jpeg",
  };
}
