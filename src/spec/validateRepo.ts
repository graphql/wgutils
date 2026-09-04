import { exists } from "../utils.js";
import { Config } from "../configSchema.js";
import { stat } from "node:fs/promises";

// Validates a repo that contains a spec
export async function validateSpecRepo(config: Config) {
  const errors: string[] = [];
  if (!config.spec) {
    errors.push(
      "This configuration is not setup for spec publishing, add `spec: {...}` to your wg.config.ts file",
    );
  }
  if (!(await exists(`${process.cwd()}/CONTRIBUTING.md`))) {
    errors.push("CONTRIBUTING.md does not exist");
  }
  try {
    const stats = await stat(`${process.cwd()}/spec`);
    if (!stats.isDirectory()) {
      throw new Error(`${process.cwd()}/spec directory does not exist`);
    }
  } catch (e) {
    errors.push((e as Error).message);
  }
  if (errors.length > 0) {
    throw new Error(
      `This repository is not setup to publish a spec:\n\n- ${errors.join("\n- ")}`,
    );
  }
}
