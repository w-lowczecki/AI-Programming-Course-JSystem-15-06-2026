import { describe, it, expect } from "vitest";

describe("node sanity", () => {
  it("runs in node environment", () => {
    expect(typeof process).toBe("object");
    expect(1 + 1).toBe(2);
  });
});
