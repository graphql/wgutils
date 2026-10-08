import type { Argv } from "yargs";
import type { ArgsFromOptions } from "../../interfaces.ts";

import { buildSpec } from "./index.ts";
import { loadConfig } from "../../config.ts";

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
