import type { Argv } from "yargs";
import type { ArgsFromOptions } from "../../interfaces.js";

import { buildSpec } from "./index.js";
import { loadConfig } from "../../config.js";

export function options(yargs: Argv) {
  return yargs
    .option("test", {
      type: "boolean",
      description: "Exit non-zero if building the spec would fail",
    })
    .example("$0", "Write the spec (including versions) to public/")
    .example("$0 --test", "Ensure the draft spec compiles");
}

export async function run(args: ArgsFromOptions<typeof options>) {
  const config = await loadConfig();
  await buildSpec(config, {
    test: args.test,
  });
}
