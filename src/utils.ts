import { stat } from "node:fs/promises";

export async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (e) {
    if ((e as any).code === "ENOENT") {
      return false;
    }
    throw e;
  }
}

export function die(msg: string, code = 1): never {
  console.error(msg);
  process.exit(code);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const toLower = (s: string) => (s || "").toLowerCase();

const collator = new Intl.Collator("en", { sensitivity: "base" });
export const cmp = (a: string, b: string) => collator.compare(a, b);

export function repoOwnerAndName(url: string) {
  const matches = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);
  if (!matches) {
    throw new Error(`Invalid repo URL: ${url}`);
  }
  const [, org, repo] = matches;
  return [org, repo];
}
