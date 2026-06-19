import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { compress, MAX_COMPRESSED_BYTES, MAX_DIMENSION } from "./index";

// ---------------------------------------------------------------------------
// Helpers — create test images in-memory via sharp (no binary fixtures)
// ---------------------------------------------------------------------------

/** Create a solid-color JPEG buffer of the given dimensions. */
async function makeJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 120, g: 80, b: 40 },
    },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/** Create a solid-color PNG buffer. */
async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 60, g: 130, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

/** Create a solid-color WebP buffer. */
async function makeWebp(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 100, b: 60 },
    },
  })
    .webp({ quality: 90 })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("compress", () => {
  it("rejects disallowed format (GIF) with a descriptive error", async () => {
    // Build a minimal GIF-like buffer — we can use a raw buffer with a GIF
    // magic header to simulate the case; sharp would fail on it or we can
    // detect by MIME type passed.  Since compress accepts a duck-typed
    // { type: string, size: number, arrayBuffer(): Promise<ArrayBuffer> } or
    // a Buffer, the simplest way is to simulate a Blob-like with type="image/gif".
    const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a header
    const fileLike = {
      type: "image/gif",
      size: gifBuffer.length,
      arrayBuffer: async () => gifBuffer.buffer,
    };
    await expect(compress(fileLike)).rejects.toThrow(/format/i);
  });

  it("compresses a large JPEG and result is below MAX_COMPRESSED_BYTES", async () => {
    // Create a 3000x2000 image — large enough to be downscaled
    const largeJpeg = await makeJpeg(3000, 2000);
    const fileLike = {
      type: "image/jpeg",
      size: largeJpeg.length,
      arrayBuffer: async () => largeJpeg.buffer as ArrayBuffer,
    };

    const result = await compress(fileLike);

    expect(result.bytes.length).toBeLessThanOrEqual(MAX_COMPRESSED_BYTES);
    expect(result.mediaType).toBe("image/jpeg");
  });

  it("downscales image whose longest edge exceeds MAX_DIMENSION", async () => {
    const largeJpeg = await makeJpeg(MAX_DIMENSION + 500, 400);
    const fileLike = {
      type: "image/jpeg",
      size: largeJpeg.length,
      arrayBuffer: async () => largeJpeg.buffer as ArrayBuffer,
    };

    const result = await compress(fileLike);

    // Verify dimensions via sharp metadata
    const meta = await sharp(Buffer.from(result.bytes)).metadata();
    const longestEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
    expect(longestEdge).toBeLessThanOrEqual(MAX_DIMENSION);
  });

  it("re-encodes a small JPEG (output is a valid JPEG buffer)", async () => {
    // Small image — 100x100
    const smallJpeg = await makeJpeg(100, 100);
    const fileLike = {
      type: "image/jpeg",
      size: smallJpeg.length,
      arrayBuffer: async () => smallJpeg.buffer as ArrayBuffer,
    };

    const result = await compress(fileLike);

    expect(result.mediaType).toBe("image/jpeg");
    // Verify it's a valid image by reading metadata
    const meta = await sharp(Buffer.from(result.bytes)).metadata();
    expect(meta.format).toBe("jpeg");
  });

  it("accepts PNG input and returns image/jpeg output", async () => {
    const png = await makePng(800, 600);
    const fileLike = {
      type: "image/png",
      size: png.length,
      arrayBuffer: async () => png.buffer as ArrayBuffer,
    };

    const result = await compress(fileLike);

    expect(result.mediaType).toBe("image/jpeg");
    expect(result.bytes.length).toBeLessThanOrEqual(MAX_COMPRESSED_BYTES);
  });

  it("accepts WebP input and returns image/jpeg output", async () => {
    const webp = await makeWebp(800, 600);
    const fileLike = {
      type: "image/webp",
      size: webp.length,
      arrayBuffer: async () => webp.buffer as ArrayBuffer,
    };

    const result = await compress(fileLike);

    expect(result.mediaType).toBe("image/jpeg");
    expect(result.bytes.length).toBeLessThanOrEqual(MAX_COMPRESSED_BYTES);
  });

  it("also accepts a raw Buffer input", async () => {
    const jpeg = await makeJpeg(200, 200);
    const result = await compress(jpeg);
    expect(result.mediaType).toBe("image/jpeg");
    expect(result.bytes.length).toBeLessThanOrEqual(MAX_COMPRESSED_BYTES);
  });

  it("output size satisfies TAC-002-02 bound", async () => {
    // Large image must compress below bound
    const largeJpeg = await makeJpeg(2500, 2500);
    const fileLike = {
      type: "image/jpeg",
      size: largeJpeg.length,
      arrayBuffer: async () => largeJpeg.buffer as ArrayBuffer,
    };

    const result = await compress(fileLike);

    expect(result.bytes.length).toBeLessThanOrEqual(MAX_COMPRESSED_BYTES);
  });
});
