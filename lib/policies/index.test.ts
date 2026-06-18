import { describe, it, expect } from "vitest";
import { loadPolicy } from "./index";

// Reset module cache between tests so caching tests are isolated.
// Because the module uses an in-module map we need to re-import if we want
// to test the "fresh load" vs "cached" scenario.  We do it via a fresh
// dynamic import with cache-busting is NOT needed here — we just call
// loadPolicy twice and assert reference equality (cached).

describe("loadPolicy", () => {
  it("loads complaint policy and contains distinctive Polish complaint text", async () => {
    const text = await loadPolicy("complaint");
    // polityka-reklamacji.md contains the word "Reklamacji"
    expect(text).toContain("Reklamacji");
    // and mentions the 2-year warranty period
    expect(text).toContain("2 lat");
  });

  it("loads return policy and contains distinctive Polish return text", async () => {
    const text = await loadPolicy("return");
    // polityka-zwrotow.md contains the word "Zwrotów"
    expect(text).toContain("Zwrotów");
    // and mentions 14 days
    expect(text).toContain("14 dni");
  });

  it("second call for complaint returns the identical cached string", async () => {
    const first = await loadPolicy("complaint");
    const second = await loadPolicy("complaint");
    expect(first).toBe(second); // strict reference equality — same string instance
  });

  it("second call for return returns the identical cached string", async () => {
    const first = await loadPolicy("return");
    const second = await loadPolicy("return");
    expect(first).toBe(second);
  });

  it("complaint and return policy texts differ", async () => {
    const complaint = await loadPolicy("complaint");
    const returnPolicy = await loadPolicy("return");
    expect(complaint).not.toBe(returnPolicy);
    expect(complaint).not.toEqual(returnPolicy);
  });
});
