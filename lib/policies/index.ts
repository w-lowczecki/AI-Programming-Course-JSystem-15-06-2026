import { readFile } from "fs/promises";
import { join } from "path";

type PolicyKind = "complaint" | "return";

const POLICY_FILES: Record<PolicyKind, string> = {
  complaint: "polityka-reklamacji.md",
  return: "polityka-zwrotow.md",
};

// In-module cache — read once per kind, subsequent calls return same string instance.
const cache = new Map<PolicyKind, string>();

export async function loadPolicy(kind: PolicyKind): Promise<string> {
  const cached = cache.get(kind);
  if (cached !== undefined) {
    return cached;
  }

  const filePath = join(process.cwd(), "docs", "policies", POLICY_FILES[kind]);
  const content = await readFile(filePath, "utf-8");
  cache.set(kind, content);
  return content;
}
