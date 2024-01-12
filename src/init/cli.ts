import { writeFile } from "node:fs/promises";
import type { Argv } from "yargs";
import type { ArgsFromOptions } from "../interfaces.js";

import { getConfigPath, loadConfig, template } from "../config.js";

export function options(yargs: Argv) {
  return yargs.example("$0", "Initialize wgtools");
}

export async function run(args: ArgsFromOptions<typeof options>) {
  try {
    await loadConfig();
    throw new Error(`Config already exists; refusing to overwrite`);
  } catch (e: any) {
    if (e.code === "ERR_MODULE_NOT_FOUND") {
      const path = getConfigPath();
      await writeFile(path, template);
      console.log(
        `Example configuration written to '${path}'; please adjust as necessary.`,
      );
    } else {
      throw e;
    }
  }
}
