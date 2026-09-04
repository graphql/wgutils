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
